# alien-singui

A signal-based UI framework. No virtual DOM, no JSX, no build step required.

Inspired by [SingUI](https://github.com/ClassicOldSong/SingUI), powered by [alien-signals](https://github.com/nicepkg/alien-signals).

## Usage

```ts
import { tags, text, signal, computed, mount } from "./alien-singui.ts";

const { div, button, span } = tags;

const count = signal(0);
const doubled = computed(() => count() * 2);

mount(document.getElementById("root")!, () => {
  div(() => {
    button({ onClick: () => count(count() + 1) }, () => text("increment"));
    span(() => text`count: ${count}, doubled: ${doubled}`);
  });
});
```

## Design

**Elements** are created via the `tags` proxy. Destructure what you need:

```ts
const { div, span, a } = tags;
div({ class: "box" }, () => { span(() => text("hi")); });
```

**Custom elements** use PascalCase — converted to kebab-case automatically:

```ts
tags.MyWidget()  // → <my-widget>
```

**Reactivity** has two modes:

```ts
// Fine-grained: only the text node updates
div(() => text`count: ${count}`);

// Coarse: the entire builder re-runs on change
div(() => text(`count: ${count()}`));
```

Pass a `signal` or `computed` and the binding is fine-grained. Read a signal directly (call it) inside a builder and the builder re-renders on change.

**Events** use React-style `onX` naming in attrs:

```ts
button({ onClick: handler, onClickCapture: captureHandler });
```

**Props and attrs** are available via the builder's tools argument:

```ts
input({ type: "text" }, ({ prop, attr, on, el }) => {
  prop.value = mySignal;  // reactive DOM property
  on("focus", () => { /* ... */ });
});
```

**Lifecycle** is automatic. Effects and listeners are cleaned up when elements are removed from the DOM (via MutationObserver).

**HMR** is built in. `mount()` registers hot reload handlers automatically. Signal state is preserved across reloads.

## Commands

```sh
bun run dev    # dev server with HMR
bun run build  # production build to dist/
bun test       # run tests
```
