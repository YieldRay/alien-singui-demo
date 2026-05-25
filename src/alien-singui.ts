/**
 * alien-singui — A signal-based UI framework built on alien-signals.
 *
 * Core concepts:
 * - `tags` proxy creates DOM elements via property access (e.g. `tags.div(...)`)
 * - PascalCase names produce custom elements (`tags.MyWidget` → `<my-widget>`)
 * - Reactive values (signals, computeds, getters) are tracked automatically
 * - Element lifecycle is managed via MutationObserver cleanup
 * - HMR state preservation is built into `signal()` and `mount()`
 */

import { effect, computed, effectScope, signal as rawSignal, isSignal, isComputed } from "alien-signals";
import type { TagProxy, TagTools, AttrKeys, MaybeReactive } from "./types";

// Re-export alien-signals primitives
export { effect, computed, effectScope };
export { getActiveSub, setActiveSub, getBatchDepth, startBatch, endBatch } from "alien-signals";
export { isSignal, isComputed, isEffect, isEffectScope, trigger } from "alien-signals";

// ────────────────────────────────────────────────────────────────────────────
// Signal wrapper with HMR state preservation
// ────────────────────────────────────────────────────────────────────────────

const signalRegistry: Array<{ sig: (...args: any[]) => any; key: number }> = [];
let signalCounter = 0;
let hmrSnapshot: Map<number, unknown> | null = null;

/**
 * Create a reactive signal. Identical to `alien-signals`' `signal()` but
 * automatically preserves its value across hot module reloads.
 */
export function signal<T>(): { (): T | undefined; (value: T | undefined): void };
export function signal<T>(initialValue: T): { (): T; (value: T): void };
export function signal<T>(initialValue?: T) {
  const id = signalCounter++;
  const sig = rawSignal(initialValue as T);

  if (hmrSnapshot?.has(id)) {
    sig(hmrSnapshot.get(id) as T);
  }

  signalRegistry.push({ sig, key: id });
  return sig;
}

// ────────────────────────────────────────────────────────────────────────────
// Node stack — implicit parent context for nested element creation
// ────────────────────────────────────────────────────────────────────────────

let currentNode: Node | null = null;
const nodeStack: Node[] = [];

function pushNode(node: Node) {
  if (currentNode) nodeStack.push(currentNode);
  currentNode = node;
}

function popNode() {
  currentNode = nodeStack.pop() ?? null;
}

// ────────────────────────────────────────────────────────────────────────────
// Lifecycle — MutationObserver-based cleanup for effects and listeners
// ────────────────────────────────────────────────────────────────────────────

const cleanupRegistry = new WeakMap<Node, Set<VoidFunction>>();
let observerStarted = false;

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;

  const observer = new MutationObserver((mutations) => {
    for (const { removedNodes } of mutations) {
      for (const node of removedNodes) {
        runCleanup(node);
      }
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function runCleanup(node: Node) {
  const fns = cleanupRegistry.get(node);
  if (fns) {
    for (const fn of fns) fn();
    cleanupRegistry.delete(node);
  }
  for (const child of node.childNodes) {
    runCleanup(child);
  }
}

function onCleanup(node: Node, fn: VoidFunction) {
  let fns = cleanupRegistry.get(node);
  if (!fns) {
    fns = new Set();
    cleanupRegistry.set(node, fns);
  }
  fns.add(fn);
}

// ────────────────────────────────────────────────────────────────────────────
// Reactivity helpers
// ────────────────────────────────────────────────────────────────────────────

/** Bind an effect scoped to a node's lifetime. Disposed when the node is removed from DOM. */
function bindEffect(node: Node, fn: VoidFunction) {
  const stop = effectScope(() => { effect(fn); });
  onCleanup(node, stop);
}

/** Returns true if `val` is a signal or computed (reactive value). */
function isReactive(val: unknown): val is () => unknown {
  return typeof val === "function" && (isSignal(val as () => void) || isComputed(val as () => void));
}

// ────────────────────────────────────────────────────────────────────────────
// Event handling
// ────────────────────────────────────────────────────────────────────────────

function isEventProp(key: string): boolean {
  return key.startsWith("on") && key.length > 2 && key[2]! >= "A" && key[2]! <= "Z";
}

/** Events whose actual DOM name ends in "capture" — not to be confused with the capture phase suffix */
const CAPTURE_NAME_EVENTS = new Set(["gotpointercapture", "lostpointercapture"]);

function parseEventKey(key: string): { eventName: string; capture: boolean } {
  if (key.endsWith("Capture")) {
    const stripped = key.slice(2, -7).toLowerCase();
    const fullName = key.slice(2).toLowerCase(); // e.g. "gotpointercapture"
    // If the full lowercased name is a real event ending in "capture", don't strip
    if (!CAPTURE_NAME_EVENTS.has(fullName)) {
      return { eventName: stripped, capture: true };
    }
  }
  return { eventName: key.slice(2).toLowerCase(), capture: false };
}

// ────────────────────────────────────────────────────────────────────────────
// Attribute & property setters
// ────────────────────────────────────────────────────────────────────────────

function setAttr<A, K extends AttrKeys<A>>(el: HTMLElement, name: K & string, val: MaybeReactive<A[K & keyof A]>): true {
  if (isReactive(val)) {
    bindEffect(el, () => {
      const v = val();
      if (v == null || v === false) el.removeAttribute(name);
      else el.setAttribute(name, String(v));
    });
  } else {
    if (val == null || val === false) el.removeAttribute(name);
    else el.setAttribute(name, String(val));
  }
  return true;
}

function setProp<T extends HTMLElement, K extends keyof T>(el: T, name: K, val: MaybeReactive<T[K]>): boolean {
  if (isReactive(val)) {
    bindEffect(el, () => { Reflect.set(el, name, val()); });
    return true;
  }
  return Reflect.set(el, name, val);
}

// ────────────────────────────────────────────────────────────────────────────
// TagTools — passed to builder callbacks for typed element manipulation
// ────────────────────────────────────────────────────────────────────────────

function createTagTools<E extends HTMLElement>(el: E): TagTools<E> {
  const attrProxy = new Proxy({} as any, {
    set(_, name: string, val: unknown) {
      return setAttr<any, string>(el, name, val);
    },
    get(_, name: string) {
      return el.getAttribute(name);
    },
  });

  const propProxy = new Proxy(el, {
    set(_, name: string, val: any) {
      return setProp(el, name as keyof E, val);
    },
  }) as E;

  return {
    el,
    on<K extends keyof HTMLElementEventMap>(
      event: K,
      handler: (this: E, ev: HTMLElementEventMap[K]) => any,
      options?: boolean | AddEventListenerOptions,
    ) {
      el.addEventListener(event, handler as EventListener, options);
      onCleanup(el, () => el.removeEventListener(event, handler as EventListener, options));
    },
    off<K extends keyof HTMLElementEventMap>(
      event: K,
      handler: (this: E, ev: HTMLElementEventMap[K]) => any,
      options?: boolean | EventListenerOptions,
    ) {
      el.removeEventListener(event, handler as EventListener, options);
    },
    prop: propProxy,
    attr: attrProxy,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// tags — the core element creation proxy
// ────────────────────────────────────────────────────────────────────────────

/** Convert PascalCase to kebab-case for custom elements (uppercase first char triggers conversion). */
function toKebab(name: string): string {
  if (name[0]! >= "A" && name[0]! <= "Z") {
    return name.replace(/[A-Z]/g, (ch, i) => (i > 0 ? "-" : "") + ch.toLowerCase());
  }
  return name;
}

/**
 * Proxy-based element factory. Access any HTML tag name as a property:
 *
 * ```ts
 * const { div, span, button } = tags;
 * div({ class: "box" }, ({ on }) => { on("click", handler); });
 * ```
 *
 * - Lowercase names create standard HTML elements
 * - PascalCase names create custom elements (`MyWidget` → `<my-widget>`)
 * - First argument can be an attrs object, a builder function, or both
 * - Builder receives a `TagTools` object for typed prop/attr/event access
 */
export const tags = new Proxy({} as TagProxy, {
  get(_, tagName: string) {
    return (...args: any[]) => {
      const el = document.createElement(toKebab(tagName));
      if (currentNode) currentNode.appendChild(el);

      let attrs: Record<string, any> | undefined;
      let builder: ((tools: any) => void) | undefined;

      if (args.length === 1) {
        if (typeof args[0] === "function") builder = args[0];
        else attrs = args[0];
      } else if (args.length >= 2) {
        attrs = args[0];
        builder = args[1];
      }

      // Apply attributes and event handlers
      if (attrs) {
        for (const key of Object.keys(attrs)) {
          const val = attrs[key];
          if (val === undefined) continue;

          if (isEventProp(key)) {
            const { eventName, capture } = parseEventKey(key);
            el.addEventListener(eventName, val as EventListener, capture);
            onCleanup(el, () => el.removeEventListener(eventName, val as EventListener, capture));
          } else {
            setAttr<any, string>(el, key, val);
          }
        }
      }

      /*
       * Run builder reactively — re-runs when signals read inside it change.
       *
       * Two reactivity modes coexist:
       *   1. Coarse: read a signal directly in the builder → entire builder re-runs,
       *      children are torn down and recreated.
       *        div(() => text(`count: ${count()}`))
       *
       *   2. Fine-grained: pass a signal/computed to `text()` or as an attr value →
       *      only that specific text node or attribute updates, no re-render.
       *        div(() => text`count: ${count}`)
       *        div({ class: myComputedClass }, ...)
       *
       * Previous non-reactive (fine-grained only) implementation:
       *
       *   if (builder) {
       *     pushNode(el);
       *     builder(createTagTools(el));
       *     popNode();
       *   }
       */
      if (builder) {
        const tools = createTagTools(el);
        let firstRun = true;
        bindEffect(el, () => {
          if (!firstRun) {
            // Synchronously clean up child effects before re-rendering
            for (const child of el.childNodes) runCleanup(child);
            while (el.firstChild) el.removeChild(el.firstChild);
          }
          firstRun = false;
          pushNode(el);
          builder(tools);
          popNode();
        });
      }

      return el;
    };
  },
});

// ────────────────────────────────────────────────────────────────────────────
// text — reactive text node creation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Create a reactive text node. Supports three forms:
 *
 * ```ts
 * text("static string")
 * text(mySignal)
 * text`hello ${mySignal}, count is ${count}`
 * ```
 */
export function text(val: MaybeReactive<string | number>): Text;
export function text(strings: TemplateStringsArray, ...vars: MaybeReactive<string | number>[]): Text;
export function text(
  valOrStrings: MaybeReactive<string | number> | TemplateStringsArray,
  ...vars: MaybeReactive<string | number>[]
): Text {
  const node = document.createTextNode("");
  if (currentNode) currentNode.appendChild(node);

  if (isTemplateStringsArray(valOrStrings)) {
    const strings = valOrStrings;
    const tpl = computed(() => {
      let result = "";
      for (let i = 0; i < strings.length; i++) {
        result += strings[i];
        if (i < vars.length) {
          const v = vars[i];
          result += isReactive(v) ? v() : v;
        }
      }
      return result;
    });
    bindEffect(node, () => { node.textContent = tpl(); });
  } else if (isReactive(valOrStrings)) {
    bindEffect(node, () => { node.textContent = String(valOrStrings()); });
  } else {
    node.textContent = String(valOrStrings);
  }

  return node;
}

function isTemplateStringsArray(val: unknown): val is TemplateStringsArray {
  return Array.isArray(val) && "raw" in val;
}

// ────────────────────────────────────────────────────────────────────────────
// mount — app entry point with automatic HMR
// ────────────────────────────────────────────────────────────────────────────

/**
 * Mount a component tree into a container element.
 * Starts the lifecycle observer and registers HMR handlers automatically.
 *
 * ```ts
 * mount(document.getElementById("root")!, App);
 * ```
 */
let hmrRegistered = false;

export function mount(container: HTMLElement, builder: VoidFunction) {
  startObserver();
  pushNode(container);
  builder();
  popNode();

  if (import.meta.hot && !hmrRegistered) {
    hmrRegistered = true;

    import.meta.hot.dispose(() => {
      const snapshot = new Map<number, unknown>();
      for (const { sig, key } of signalRegistry) {
        snapshot.set(key, sig());
      }
      hmrSnapshot = snapshot;

      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    });

    import.meta.hot.accept(() => {
      signalCounter = 0;
      signalRegistry.length = 0;
      mount(container, builder);
    });
  }
}
