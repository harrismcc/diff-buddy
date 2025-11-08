# Rich Text Editor: Add Loading States and Request Cancellation for Suggestions

This PR enhances the rich text editor's suggestion system with proper loading states and request cancellation. When users type to trigger suggestions, they now see a skeleton loading state while data is being fetched. Additionally, the implementation includes request cancellation to prevent race conditions when users quickly change their search query.

## Summary of Changes

The changes introduce:
1. **Event bus architecture** for coordinating between data fetching and UI rendering
2. **Loading states** with skeleton placeholders while suggestions are being fetched
3. **Request cancellation** using AbortSignal to prevent stale data
4. **Improved popup management** to ensure the suggestion dropdown shows/hides correctly
5. **Centralized constants** for suggestion limits

---

## Event Bus Architecture and Loading State Management

The core of this change is a new event bus system that decouples data fetching from UI rendering, allowing the items function to notify the UI about loading state changes.

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -33,45 +33,222 @@ const DOM_RECT_FALLBACK: DOMRect = {
   },
 };
 
+/**
+ * Event types for coordinating between the items fetcher and render lifecycle
+ */
+type SuggestionEvent =
+  | { type: 'LOADING_STARTED'; query: string }
+  | { type: 'LOADING_COMPLETED' }
+  | { type: 'FETCH_ABORTED' };
+
+/**
+ * Simple event bus for decoupling the items function from the render lifecycle.
+ * Allows the data fetching logic to notify the UI about state changes without
+ * directly manipulating React components.
+ */
+class SuggestionEventBus {
+  private listeners: ((event: SuggestionEvent) => void)[] = [];
+
+  subscribe(listener: (event: SuggestionEvent) => void): () => void {
+    this.listeners.push(listener);
+    // Return unsubscribe function
+    return () => {
+      this.listeners = this.listeners.filter((l) => l !== listener);
+    };
+  }
+
+  emit(event: SuggestionEvent): void {
+    this.listeners.forEach((listener) => listener(event));
+  }
+
+  clear(): void {
+    this.listeners = [];
+  }
+}
```

---

## Updated Suggestion Configuration with Request Cancellation

The `richTextSuggestionOptions` function now accepts an `enableLoadingState` flag and manages AbortControllers to cancel in-flight requests when new queries arrive.

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -77,19 +77,97 @@ class SuggestionEventBus {
  * 1. User types -> items() emits LOADING_STARTED -> render updates UI to loading
  * 2. Data arrives -> items() emits LOADING_COMPLETED -> render updates UI with results
  * 3. New query -> items() emits FETCH_ABORTED -> render knows previous fetch cancelled
  */
 export const richTextSuggestionOptions = ({
   items,
+  enableLoadingState = false,
 }: {
-  items: ({ query }: { query: string }) => Promise<MentionSuggestion[] | Suggestion[]>;
+  items: ({
+    query,
+    signal,
+  }: {
+    query: string;
+    signal?: AbortSignal;
+  }) => Promise<MentionSuggestion[] | Suggestion[]>;
+  enableLoadingState?: boolean;
 }): MentionOptions['suggestion'] => {
+  // Event bus for coordinating between items and render
+  const eventBus = new SuggestionEventBus();
+
+  // Track current abort controller for cleanup
+  let currentAbortController: AbortController | null = null;
+
   return {
-    items,
+    items: async ({ query }: { query: string }) => {
+      // Abort previous fetch if still pending
+      if (currentAbortController) {
+        currentAbortController.abort();
+        eventBus.emit({ type: 'FETCH_ABORTED' });
+      }
+
+      // Create new abort controller for this fetch
+      const abortController = new AbortController();
+      currentAbortController = abortController;
+
+      if (enableLoadingState && query.length > 0) {
+        // Notify UI to show loading state
+        eventBus.emit({ type: 'LOADING_STARTED', query });
+      }
+
+      try {
+        const results = await items({ query, signal: abortController.signal });
+
+        // Only update if this request wasn't aborted
+        if (!abortController.signal.aborted) {
+          currentAbortController = null;
+          eventBus.emit({ type: 'LOADING_COMPLETED' });
+          return results;
+        }
+
+        return [];
+      } catch (error) {
+        // If aborted, return empty array silently
+        if (error instanceof Error && error.name === 'AbortError') {
+          return [];
+        }
+        throw error;
+      }
+    },
```

---

## Render Lifecycle Enhancements

The render function now includes detailed lifecycle management with event subscriptions, proper popup creation/recreation, and loading state tracking.

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -89,28 +159,159 @@ export const richTextSuggestionOptions = ({
     render: () => {
       let component: ReactRenderer<RichTextSuggestionListRef> | undefined;
       let popup: TippyInstance | undefined;
+      let unsubscribe: (() => void) | undefined;
+
+      // Track loading state separately to avoid race conditions
+      let isCurrentlyLoading = false;
+
+      /**
+       * Helper: Subscribe to event bus and handle loading state updates
+       */
+      const subscribeToEvents = () => {
+        return eventBus.subscribe((event) => {
+          if (!component) return;
+
+          switch (event.type) {
+            case 'LOADING_STARTED':
+              isCurrentlyLoading = true;
+              component.updateProps({
+                query: event.query,
+                items: [],
+                isLoading: true,
+              });
+              // Show popup if it exists but is hidden
+              if (popup && !popup.state.isVisible) {
+                popup.show();
+              }
+              break;
+
+            case 'LOADING_COMPLETED':
+              isCurrentlyLoading = false;
+              // The actual items will be updated via onUpdate when Tiptap
+              // calls it with the new items, so we just clear loading state
+              break;
+
+            case 'FETCH_ABORTED':
+              // Fetch was cancelled, but new one might be starting
+              break;
+          }
+        });
+      };
+
+      /**
+       * Helper: Create a tippy popup with standard configuration
+       */
+      const createPopup = (
+        element: HTMLElement,
+        clientRect: (() => DOMRect | null) | undefined,
+      ): TippyInstance | undefined => {
+        if (!clientRect) return undefined;
+
+        return tippy('body', {
+          getReferenceClientRect: () => clientRect?.() ?? DOM_RECT_FALLBACK,
+          appendTo: () => document.body,
+          content: element,
+          showOnCreate: true,
+          interactive: true,
+          trigger: 'manual',
+          placement: 'bottom-start',
+        })[0];
+      };
```

---

## onStart Hook with Event Subscription

The onStart hook initializes the component and subscribes to event bus notifications.

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -218,17 +336,20 @@ export const richTextSuggestionOptions = ({
       return {
         onStart: (props) => {
+          // onStart fires when # is typed, no query yet so no loading
           component = new ReactRenderer(RichTextSuggestionList, {
-            props,
+            props: { ...props, isLoading: false },
             editor: props.editor,
           });
 
-          if (!props.clientRect) {
-            return;
-          }
+          // Subscribe to events from the items function
+          unsubscribe = subscribeToEvents();
 
-          popup = tippy('body', {
-            getReferenceClientRect: () => props.clientRect?.() ?? DOM_RECT_FALLBACK,
-            appendTo: () => document.body,
-            content: component.element,
-            showOnCreate: true,
-            interactive: true,
-            trigger: 'manual',
-            placement: 'bottom-start',
-          })[0];
+          // Create popup
+          popup = createPopup(component.element as HTMLElement, props.clientRect ?? undefined);
         },
```

---

## onUpdate Hook with Popup Recreation and Loading State

The onUpdate hook now handles popup recreation when it's been destroyed, and properly tracks loading states throughout the fetch lifecycle.

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -236,10 +357,51 @@ export const richTextSuggestionOptions = ({
         },
 
         onUpdate(props) {
-          component?.updateProps(props);
+          // If popup was destroyed (e.g., by clicking outside), recreate it
+          if (!popup && props.clientRect) {
+            // Check if there's an active fetch to show loading state immediately
+            const isLoadingOnRecreate =
+              enableLoadingState && currentAbortController !== null && props.items.length === 0;
+
+            if (!component) {
+              component = new ReactRenderer(RichTextSuggestionList, {
+                props: { ...props, isLoading: isLoadingOnRecreate },
+                editor: props.editor,
+              });
+
+              // Re-subscribe if component was recreated
+              unsubscribe?.();
+              unsubscribe = subscribeToEvents();
+            }
+
+            popup = createPopup(component.element as HTMLElement, props.clientRect ?? undefined);
+
+            // Explicitly show the popup after recreating it
+            popup?.show();
+          }
+
+          // onUpdate fires when results arrive from Tiptap
+          // Determine loading state: loading if we have a pending fetch and no results yet
+          const shouldShowLoading =
+            enableLoadingState &&
+            (isCurrentlyLoading || (currentAbortController !== null && props.items.length === 0));
+
+          component?.updateProps({ ...props, isLoading: shouldShowLoading });
 
           if (!props.clientRect) {
             return;
           }
 
           popup?.setProps({
             getReferenceClientRect: () => props.clientRect?.() ?? DOM_RECT_FALLBACK,
           });
+
+          // Ensure popup is visible when we have items
+          if (popup && props.items.length > 0 && !popup.state.isVisible) {
+            popup.show();
+          }
         },
```

---

## onKeyDown and onExit Hooks Improvements

Enhanced keyboard handling to show popups when typing, and comprehensive cleanup in the exit hook.

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -253,6 +405,12 @@ export const richTextSuggestionOptions = ({
             return true;
           }
 
+          // If popup exists but is hidden and we're typing, show it
+          // The loading state will be handled by the event bus subscription
+          if (popup && !popup.state.isVisible && enableLoadingState) {
+            popup.show();
+          }
+
           if (!component?.ref) {
             return false;
           }
@@ -261,9 +419,21 @@ export const richTextSuggestionOptions = ({
         },
 
         onExit() {
+          // Unsubscribe from events
+          unsubscribe?.();
+
           popup?.destroy();
           component?.destroy();
 
+          // Clean up abort controller if one exists
+          if (currentAbortController) {
+            currentAbortController.abort();
+            currentAbortController = null;
+          }
+
+          // Clear all event listeners to prevent memory leaks
+          eventBus.clear();
+
           // Remove references to the old popup and component upon destruction/exit.
           // (This should prevent redundant calls to `popup.destroy()`, which Tippy
           // warns in the console is a sign of a memory leak, as the `suggestion`
@@ -271,6 +441,7 @@ export const richTextSuggestionOptions = ({
           // a user chooses an option, *and* when the editor itself is destroyed.)
           popup = undefined;
           component = undefined;
+          unsubscribe = undefined;
         },
       };
     },
```

---

## Request Cancellation in Fetch Functions

Both suggestion and reference fetching functions now accept an optional AbortSignal parameter to support request cancellation.

```diff
diff --git a/app/services/suggestion.client.ts b/app/services/suggestion.client.ts
index b48081f28..cafa3ee69 100644
--- a/app/services/suggestion.client.ts
+++ b/app/services/suggestion.client.ts
@@ -17,8 +17,11 @@ export interface ReferenceItem {
 /**
  * Make a request to get suggestions
  */
-export const fetchSuggestions = async (search: string): Promise<SuggestionItem[]> => {
-  const res = await fetch(`/suggest?q=${encodeURIComponent(search)}`, {});
+export const fetchSuggestions = async (
+  search: string,
+  signal?: AbortSignal,
+): Promise<SuggestionItem[]> => {
+  const res = await fetch(`/suggest?q=${encodeURIComponent(search)}`, { signal });
   const data = Value.Decode(
     Type.Object({
       suggestions: Type.Array(
@@ -36,8 +39,11 @@ export const fetchSuggestions = async (search: string): Promise<SuggestionItem[]
   return data.suggestions as SuggestionItem[];
 };
 
-export const fetchReferences = async (search: string): Promise<ReferenceItem[]> => {
-  const res = await fetch(`/suggestReferences?q=${encodeURIComponent(search)}`, {});
+export const fetchReferences = async (
+  search: string,
+  signal?: AbortSignal,
+): Promise<ReferenceItem[]> => {
+  const res = await fetch(`/suggestReferences?q=${encodeURIComponent(search)}`, { signal });
 
   const rawData = await res.json();
   const data = Value.Decode(
```

---

## Enable Loading States in RichTextEditor

The RichTextEditor component now passes the AbortSignal to the fetch functions and enables the loading state for reference suggestions.

```diff
diff --git a/app/components/ui/RichTextEditor/index.tsx b/app/components/ui/RichTextEditor/index.tsx
index bfca0cc6c..7f335e9d2 100644
--- a/app/components/ui/RichTextEditor/index.tsx
+++ b/app/components/ui/RichTextEditor/index.tsx
@@ -107,20 +107,21 @@ export const RichTextEditor: React.FC<RichTextEditorProps> = ({
           {
             char: '@',
             ...richTextSuggestionOptions({
-              items: async ({ query }: { query: string }) => {
+              items: async ({ query, signal }: { query: string; signal?: AbortSignal }) => {
                 if (!suggestionsEnabled) return [];
-                return (await fetchSuggestions(query)).slice(0, 5);
+                return (await fetchSuggestions(query, signal)).slice(0, 5);
               },
             }),
           },
           {
             char: '#',
             ...richTextSuggestionOptions({
-              items: async ({ query }: { query: string }) => {
+              items: async ({ query, signal }: { query: string; signal?: AbortSignal }) => {
                 if (!suggestionsEnabled) return [];
-                const results = (await fetchReferences(query)).slice(0, 5);
+                const results = (await fetchReferences(query, signal)).slice(0, 5);
                 return results;
               },
+              enableLoadingState: true,
             }),
           },
         ],
```

---

## Skeleton Loading UI in Suggestion List

The RichTextSuggestionList component now displays skeleton loaders while data is being fetched.

```diff
diff --git a/app/components/ui/RichTextSuggestionList.tsx b/app/components/ui/RichTextSuggestionList.tsx
index 40aac7a6e..f5e94a399 100644
--- a/app/components/ui/RichTextSuggestionList.tsx
+++ b/app/components/ui/RichTextSuggestionList.tsx
@@ -1,10 +1,12 @@
 import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
 import Highlighter from 'react-highlight-words';
 
-import { Box, Flex, Text } from '@radix-ui/themes';
+import { Box, Flex, Skeleton, Text } from '@radix-ui/themes';
 import { ScrollArea } from '@radix-ui/themes';
 import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
 
+import { SUGGESTED_REFERENCES_COUNT } from '../../models/limits';
+
 export interface Suggestion {
   id: string;
   label: string;
@@ -38,9 +40,10 @@ const isMentionSuggestion = (
 
 export const RichTextSuggestionList = forwardRef<
   RichTextSuggestionListRef,
-  SuggestionProps<MentionSuggestion | ReferenceSuggestion>
+  SuggestionProps<MentionSuggestion | ReferenceSuggestion> & { isLoading?: boolean }
 >((props, ref) => {
   const [selectedIndex, setSelectedIndex] = useState(0);
+  const { isLoading = false } = props;
 
   const selectItem = (index: number) => {
     if (props.items[index]) {
@@ -87,7 +90,20 @@ export const RichTextSuggestionList = forwardRef<
     <div className='rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent rt-r-size-2 rt-variant-solid'>
       <ScrollArea>
         <div className='rt-BaseMenuViewport'>
-          {props.items.length ? (
+          {isLoading ? (
+            // Show skeleton items while loading
+            Array.from({ length: SUGGESTED_REFERENCES_COUNT }).map((_, index) => (
+              <div className='rt-BaseMenuItem' key={`skeleton-${index}`} style={{ height: 'auto' }}>
+                <Flex align='start' justify='between' width='100%' style={{ minHeight: 'auto' }}>
+                  <Box minWidth='0' style={{ flex: 1 }}>
+                    <Skeleton>
+                      <Text size='3'>Loading suggestion item...</Text>
+                    </Skeleton>
+                  </Box>
+                </Flex>
+              </div>
+            ))
+          ) : props.items.length ? (
             props.items.map((item, index) => (
               <div
                 className='rt-BaseMenuItem'
```

---

## Centralized Constants for Suggestion Limits

Created a centralized constant for the number of suggestions to display, making it easier to maintain consistency across the application.

```diff
diff --git a/app/models/limits.ts b/app/models/limits.ts
index 08b9d6ad4..435451a42 100644
--- a/app/models/limits.ts
+++ b/app/models/limits.ts
@@ -2,6 +2,7 @@
 
 export const SUBJECT_MAX_LENGTH = 200;
 export const REGULATION_TAGS_PER_THREAD_LIMIT = 20;
+export const SUGGESTED_REFERENCES_COUNT = 5;
 
 /**
  * Maximum total size allowed for multipart/form-data uploads handled by app routes.
```

---

## Use Centralized Constant in Reference Suggestion Loader

The server-side reference suggestion endpoint now uses the centralized constant instead of a hardcoded value.

```diff
diff --git a/app/routes/_app.suggestReferences.ts b/app/routes/_app.suggestReferences.ts
index d86e72b08..2cb26dc9d 100644
--- a/app/routes/_app.suggestReferences.ts
+++ b/app/routes/_app.suggestReferences.ts
@@ -3,6 +3,7 @@ import { captureException } from '@sentry/remix';
 import { Type } from '@sinclair/typebox';
 import { Value } from '@sinclair/typebox/value';
 
+import { SUGGESTED_REFERENCES_COUNT } from '../models/limits';
 import { authenticatedUser } from '../services/authentication/forum-auth.server';
 import { getPrisma } from '../services/db.server';
 import { captureServerError } from '../services/sentry.server';
@@ -64,7 +65,7 @@ export const loader: LoaderFunction = async ({ request }) => {
       ${datasetQueries.join('\n      UNION ALL\n')}
     ) AS combined
     ORDER BY fused_score DESC
-    LIMIT 5;
+    LIMIT ${SUGGESTED_REFERENCES_COUNT};
   `;
 
   let results;
```