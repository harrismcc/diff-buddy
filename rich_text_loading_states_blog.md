# Adding Loading States to Rich Text Suggestions

This PR enhances the rich text editor's suggestion system with proper loading state handling, request cancellation, and an event-driven architecture. When users type `@` or `#` to trigger suggestions, they now see skeleton loaders while data is being fetched, providing better feedback for slower network conditions.

## Adding AbortSignal Support to Fetch Functions

The first step is enabling request cancellation at the API layer. Both suggestion fetching functions now accept an optional `AbortSignal` parameter:

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

This allows the suggestion system to cancel in-flight requests when the user types a new query before the previous one completes.

## Passing AbortSignal Through the Suggestion Pipeline

Next, the RichTextEditor component passes the abort signal through to the fetch functions:

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

Both the `@mentions` and `#references` configurations now pass the signal along, and the hash suggestion enables the new `enableLoadingState` feature.

## Updating the Suggestion List Component

The RichTextSuggestionList component now accepts and displays loading state:

```diff
diff --git a/app/components/ui/RichTextSuggestionList.tsx b/app/components/ui/RichTextSuggestionList.tsx
index 40aac7a6e..c17cc20ef 100644
--- a/app/components/ui/RichTextSuggestionList.tsx
+++ b/app/components/ui/RichTextSuggestionList.tsx
@@ -1,7 +1,7 @@ import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
 import Highlighter from 'react-highlight-words';
 
-import { Box, Flex, Text } from '@radix-ui/themes';
+import { Box, Flex, Skeleton, Text } from '@radix-ui/themes';
 import { ScrollArea } from '@radix-ui/themes';
 import type { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion';
 
@@ -38,9 +38,10 @@ const isMentionSuggestion = (
 
 export const RichTextSuggestionList = forwardRef<
   RichTextSuggestionListRef,
-  SuggestionProps<MentionSuggestion | ReferenceSuggestion>
+  SuggestionProps<MentionSuggestion | ReferenceSuggestion> & { isLoading?: boolean }
 >((props, ref) => {
   const [selectedIndex, setSelectedIndex] = useState(0);
+  const { isLoading = false } = props;
 
   const selectItem = (index: number) => {
     if (props.items[index]) {
@@ -87,7 +88,20 @@ export const RichTextSuggestionList = forwardRef<
     <div className='rt-PopperContent rt-BaseMenuContent rt-DropdownMenuContent rt-r-size-2 rt-variant-solid'>
       <ScrollArea>
         <div className='rt-BaseMenuViewport'>
-          {props.items.length ? (
+          {isLoading ? (
+            // Show skeleton items while loading
+            Array.from({ length: 3 }).map((_, index) => (
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

When loading, three skeleton placeholder items appear instead of actual suggestions, giving users visual feedback that data is being fetched.

## Implementing the Event Bus Architecture

The core logic lives in `richTextSuggestionOptions.ts`. This is where an event bus pattern decouples the data fetching logic from the UI rendering:

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

An event bus enables the async items function to communicate loading state to the render lifecycle without direct coupling. Three event types coordinate the flow: `LOADING_STARTED` signals that data fetching has begun, `LOADING_COMPLETED` indicates results are ready, and `FETCH_ABORTED` notifies that a request was cancelled.

### Enhanced Items Function with Request Cancellation

```diff
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

The enhanced items function now manages an `AbortController` to cancel previous requests when new queries arrive. It emits events through the bus at key moments: when loading starts, when it completes, or when a fetch is aborted.

### Render Lifecycle with Event Subscription

```diff
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

The render function subscribes to the event bus. When `LOADING_STARTED` fires, it immediately updates the component to show skeleton loaders and ensures the popup is visible. Helper functions clean up the popup creation logic to reduce duplication.

### Updated Lifecycle Hooks

```diff
       return {
         onStart: (props) => {
+          // onStart fires when # is typed, no query yet so no loading
           component = new ReactRenderer(RichTextSuggestionList, {
-            props,
+            props: { ...props, isLoading: false },
             editor: props.editor,
           });
 
+          // Subscribe to events from the items function
+          unsubscribe = subscribeToEvents();
 
-          if (!props.clientRect) {
-            return;
-          }
+          // Create popup
+          popup = createPopup(component.element as HTMLElement, props.clientRect ?? undefined);
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
@@ -80,6 +257,11 @@ export const richTextSuggestionOptions = ({
           popup?.setProps({
             getReferenceClientRect: () => props.clientRect?.() ?? DOM_RECT_FALLBACK,
           });
+
+          // Ensure popup is visible when we have items
+          if (popup && props.items.length > 0 && !popup.state.isVisible) {
+            popup.show();
+          }
         },
 
         onKeyDown(props) {
@@ -89,6 +271,12 @@ export const richTextSuggestionOptions = ({
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
@@ -97,9 +285,21 @@ export const richTextSuggestionOptions = ({
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
```

The lifecycle hooks are enhanced with robust cleanup logic. `onStart` subscribes to the event bus. `onUpdate` handles popup recreation if it was destroyed. `onKeyDown` ensures the popup shows when typing. Most importantly, `onExit` properly cleans up all resources: event subscriptions, abort controllers, and event bus listeners, preventing memory leaks.

## Summary

This PR introduces a sophisticated loading state system for rich text suggestions using an event bus pattern. Users now see skeleton loaders while suggestions load, and the system efficiently cancels previous requests when new queries arrive. The architecture decouples data fetching from UI rendering, making the code more maintainable and testable.
