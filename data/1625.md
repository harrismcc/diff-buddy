# Improving Rich Text Editor Suggestions: Adding Loading States and Fetch Cancellation

This PR enhances the rich text editor's mention and reference suggestion system by adding visual loading indicators and properly handling asynchronous fetch cancellation. Let's break down the changes.

## Adding AbortSignal Support to Fetch Functions

The foundation of this improvement is adding the ability to cancel in-flight requests when a user types a new query. The suggestion service functions now accept an optional `AbortSignal` parameter and pass it to the fetch calls.

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

Both `fetchSuggestions` and `fetchReferences` now accept an optional `AbortSignal` parameter, allowing the editor to cancel these requests when needed.

## Enabling Loading State in the Editor

The suggestion options configuration now passes the `AbortSignal` to these fetch functions and enables a loading state flag for the reference suggestions.

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

Notice that the `#` (reference) suggestions enable the loading state with `enableLoadingState: true`, while `@` (mention) suggestions do not. This gives flexibility to enable the feature per suggestion type.

## Adding Loading State UI Component

The suggestion list component now imports the `Skeleton` component and accepts an optional `isLoading` prop to display placeholder items while data is being fetched.

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

The component now renders three skeleton placeholder items when `isLoading` is true, giving users visual feedback that suggestions are being fetched.

## Building an Event Bus for State Coordination

The core of this improvement is a new event bus system that decouples the data fetching logic from the UI rendering lifecycle. This allows the async `items` function to communicate loading state changes to the Tippy popup renderer.

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -33,6 +33,39 @@ const DOM_RECT_FALLBACK: DOMRect = {
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
+
```

The `SuggestionEventBus` is a simple pub-sub implementation that emits three types of events: `LOADING_STARTED`, `LOADING_COMPLETED`, and `FETCH_ABORTED`. This enables communication between the fetch logic and the UI rendering layer.

## Implementing Smart Fetch Management with AbortController

The new `items` wrapper function creates an `AbortController` for each query, aborts the previous request if one is still pending, and emits events to coordinate the UI state.

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -74,7 +74,59 @@ export const richTextSuggestionOptions = ({
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

This wrapper ensures that:
1. Previous fetches are cancelled when a new query arrives
2. Loading state events are emitted only if `enableLoadingState` is true
3. Aborted requests are handled gracefully and return an empty array
4. Only completed requests update the UI

## Connecting Events to the Render Lifecycle

The render lifecycle now subscribes to the event bus and updates the component's loading state accordingly. Here's the event subscription logic:

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -127,45 +127,95 @@ export const richTextSuggestionOptions = ({
 
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

The code tracks loading state and emits UI updates via the event bus subscription. When `LOADING_STARTED` fires, it immediately shows the skeleton placeholders. When `LOADING_COMPLETED` fires, it clears the loading flag.

## Handling Popup Recreation and Visibility

The `onStart` and `onUpdate` callbacks now handle edge cases where the popup might be destroyed and need recreation:

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -198,18 +198,46 @@ export const richTextSuggestionOptions = ({
 
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
@@ -218,6 +246,11 @@ export const richTextSuggestionOptions = ({
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

The `onUpdate` callback now intelligently handles popup recreation, determines whether to show a loading state based on pending fetches, and ensures the popup is visible when items arrive.

## Proper Cleanup on Exit

Finally, the `onExit` callback now properly cleans up all resources to prevent memory leaks:

```diff
diff --git a/app/components/ui/richTextSuggestionOptions.ts b/app/components/ui/richTextSuggestionOptions.ts
index 0fd06dd2d..4f60cf74b 100644
--- a/app/components/ui/richTextSuggestionOptions.ts
+++ b/app/components/ui/richTextSuggestionOptions.ts
@@ -273,10 +289,26 @@ export const richTextSuggestionOptions = ({
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
@@ -284,6 +316,7 @@ export const richTextSuggestionOptions = ({
           // a user chooses an option, *and* when the editor itself is destroyed.)
           popup = undefined;
           component = undefined;
+          unsubscribe = undefined;
         },
       };
     },
```

The cleanup process now:
1. Unsubscribes from event bus events
2. Destroys the popup and component
3. Aborts any pending fetch requests
4. Clears all event listeners
5. Nulls out all references

## Summary

This PR adds a sophisticated loading state system to the rich text editor's suggestion popups by:

- **Enabling fetch cancellation** via `AbortSignal` in the service layer
- **Creating an event bus** to decouple data fetching from UI rendering
- **Adding visual feedback** with skeleton loaders while suggestions load
- **Managing popup lifecycle** intelligently to handle edge cases
- **Implementing thorough cleanup** to prevent memory leaks

The architecture ensures smooth UX when users are rapidly typing and searching for suggestions, while maintaining clean separation of concerns between data fetching and UI rendering.