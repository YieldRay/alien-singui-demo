import { effect, computed, effectScope } from "alien-signals";

type Getter<T> = () => T;
type MaybeReactive<T> = T | Getter<T>;

type TagBuilder = (builder?: () => void) => HTMLElement;
type TagsProxy = {
  [K in keyof HTMLElementTagNameMap]: (builder?: () => void) => HTMLElementTagNameMap[K];
} & Record<string, TagBuilder>;

let currentNode: Node | null = null;
const nodeStack: Node[] = [];

const pushNode = (node: Node) => {
  if (currentNode) nodeStack.push(currentNode);
  currentNode = node;
};

const popNode = () => {
  currentNode = nodeStack.pop() || null;
};

const cleanupRegistry = new WeakMap<Node, Set<() => void>>();
let observerStarted = false;

function startObserver() {
  if (observerStarted) return;
  observerStarted = true;

  const gcObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const removedNode of mutation.removedNodes) {
        triggerCleanup(removedNode);
      }
    }
  });

  gcObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function triggerCleanup(node: Node) {
  const fns = cleanupRegistry.get(node);
  if (fns) {
    fns.forEach((fn) => fn());
    cleanupRegistry.delete(node);
  }
  node.childNodes.forEach(triggerCleanup);
}

function onCleanup(node: Node, cleanupFn: () => void) {
  let fns = cleanupRegistry.get(node);
  if (!fns) {
    fns = new Set();
    cleanupRegistry.set(node, fns);
  }
  fns.add(cleanupFn);
}

function bindEffect(fn: () => void) {
  if (!currentNode) return;

  const stopScope = effectScope(() => {
    effect(fn);
  });

  onCleanup(currentNode, () => {
    stopScope();
  });
}

const isGetter = <T>(val: MaybeReactive<T>): val is Getter<T> => typeof val === "function";

export const tags = new Proxy({} as TagsProxy, {
  get(_, tagName: string) {
    return (builder?: () => void) => {
      const el = document.createElement(tagName);
      if (currentNode) currentNode.appendChild(el);

      if (builder) {
        pushNode(el);
        builder();
        popNode();
      }
      return el;
    };
  },
});

export const attr = new Proxy({} as Record<string, any>, {
  set(_, attrName: string, val: MaybeReactive<string | number | boolean | null>) {
    const el = currentNode as HTMLElement;
    if (!el) return false;

    if (isGetter(val)) {
      bindEffect(() => {
        const currentVal = val();
        if (currentVal == null || currentVal === false) el.removeAttribute(attrName);
        else el.setAttribute(attrName, String(currentVal));
      });
    } else {
      if (val == null || val === false) el.removeAttribute(attrName);
      else el.setAttribute(attrName, String(val));
    }
    return true;
  },
});

export const prop = new Proxy({} as Record<string, any>, {
  set(_, propName: string, val: MaybeReactive<any>) {
    const el = currentNode as HTMLElement;
    if (!el) return false;

    if (isGetter(val)) {
      bindEffect(() => {
        (el as any)[propName] = val();
      });
    } else {
      (el as any)[propName] = val;
    }
    return true;
  },
});

export function text(val: MaybeReactive<string | number>) {
  const node = document.createTextNode("");
  if (currentNode) currentNode.appendChild(node);

  pushNode(node);
  if (isGetter(val)) {
    bindEffect(() => {
      node.textContent = String(val());
    });
  } else {
    node.textContent = String(val);
  }
  popNode();

  return node;
}

export function on<K extends keyof HTMLElementEventMap>(
  eventName: K,
  handler: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions,
) {
  const el = currentNode as HTMLElement;
  if (!el) return;

  el.addEventListener(eventName, handler as EventListener, options);
  onCleanup(el, () => el.removeEventListener(eventName, handler as EventListener, options));
}

export function mount(container: HTMLElement, builder: () => void) {
  startObserver();
  pushNode(container);
  builder();
  popNode();
}

export function t(strings: TemplateStringsArray, ...vars: MaybeReactive<string | number>[]): Getter<string> {
  return computed(() => {
    let result = "";
    for (let i = 0; i < strings.length; i++) {
      result += strings[i];
      if (i < vars.length) {
        const v = vars[i];
        result += isGetter(v) ? v() : v;
      }
    }
    return result;
  });
}

export function hot(owner: Node, builder: () => void) {
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      while (owner.firstChild) {
        owner.removeChild(owner.firstChild);
      }
    });

    import.meta.hot.accept(() => {
      mount(owner as HTMLElement, builder);
    });
  }
}
