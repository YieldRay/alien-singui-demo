import { describe, test, expect, beforeEach } from "bun:test";
import { Window } from "happy-dom";

const $window = new Window();

// Patch globals for alien-singui
Object.assign(globalThis, {
  window: $window,
  document: $window.document,
  HTMLElement: $window.HTMLElement,
  MutationObserver: $window.MutationObserver,
  Node: $window.Node,
});
import { tags, text, signal, computed, mount } from "./alien-singui.ts";

const { div, span, button, input, a, p } = tags;

beforeEach(() => {
  document.body.innerHTML = "";
});

// ── tags proxy ──────────────────────────────────────────────────────────────

describe("tags", () => {
  test("creates an element", () => {
    const root = document.createElement("div");
    mount(root, () => {
      div();
    });
    expect(root.firstElementChild?.tagName).toBe("DIV");
  });

  test("nests elements via builder", () => {
    const root = document.createElement("div");
    mount(root, () => {
      div(() => {
        span();
        span();
      });
    });
    const container = root.firstElementChild!;
    expect(container.tagName).toBe("DIV");
    expect(container.children.length).toBe(2);
    expect(container.children[0]!.tagName).toBe("SPAN");
  });

  test("applies static attributes", () => {
    const root = document.createElement("div");
    mount(root, () => {
      a({ href: "/test", class: "link" });
    });
    const el = root.firstElementChild as HTMLAnchorElement;
    expect(el.getAttribute("href")).toBe("/test");
    expect(el.getAttribute("class")).toBe("link");
  });

  test("removes attribute when value is null or false", () => {
    const root = document.createElement("div");
    mount(root, () => {
      div({ id: undefined, hidden: false });
    });
    const el = root.firstElementChild!;
    expect(el.hasAttribute("id")).toBe(false);
    expect(el.hasAttribute("hidden")).toBe(false);
  });

  test("attaches event listeners via onX attrs", () => {
    let clicked = false;
    const root = document.createElement("div");
    mount(root, () => {
      button({ onClick: () => { clicked = true; } });
    });
    const el = root.firstElementChild as HTMLButtonElement;
    el.click();
    expect(clicked).toBe(true);
  });

  test("provides TagTools in builder", () => {
    const root = document.createElement("div");
    let receivedEl = null as HTMLElement | null
    mount(root, () => {
      div(({ el }) => {
        receivedEl = el;
      });
    });
    expect(receivedEl).toBe(root.firstElementChild as HTMLElement);
  });

  test("TagTools.prop sets DOM properties reactively", () => {
    const val = signal("hello");
    const root = document.createElement("div");
    mount(root, () => {
      input(({ prop }) => {
        prop.value = val;
      });
    });
    const el = root.firstElementChild as HTMLInputElement;
    expect(el.value).toBe("hello");
    val("world");
    expect(el.value).toBe("world");
  });

  test("TagTools.on registers event with auto-cleanup", () => {
    let count = 0;
    const root = document.createElement("div");
    document.body.appendChild(root);
    mount(root, () => {
      button(({ on }) => {
        on("click", () => { count++; });
      });
    });
    const el = root.firstElementChild as HTMLButtonElement;
    el.click();
    expect(count).toBe(1);
  });
});

// ── Custom elements (PascalCase → kebab-case) ──────────────────────────────

describe("custom elements", () => {
  test("PascalCase creates kebab-case element", () => {
    const root = document.createElement("div");
    mount(root, () => {
      (tags as any).MyWidget();
    });
    expect(root.firstElementChild?.tagName).toBe("MY-WIDGET");
  });

  test("lowercase passes through unchanged", () => {
    const root = document.createElement("div");
    mount(root, () => {
      (tags as any).div();
    });
    expect(root.firstElementChild?.tagName).toBe("DIV");
  });

  test("multi-word PascalCase", () => {
    const root = document.createElement("div");
    mount(root, () => {
      (tags as any).MyCustomElement();
    });
    expect(root.firstElementChild?.tagName).toBe("MY-CUSTOM-ELEMENT");
  });
});

// ── signal ──────────────────────────────────────────────────────────────────

describe("signal", () => {
  test("read and write", () => {
    const s = signal(42);
    expect(s()).toBe(42);
    s(100);
    expect(s()).toBe(100);
  });

  test("without initial value", () => {
    const s = signal<number>();
    expect(s()).toBeUndefined();
    s(5);
    expect(s()).toBe(5);
  });
});

// ── text ────────────────────────────────────────────────────────────────────

describe("text", () => {
  test("static string", () => {
    const root = document.createElement("div");
    mount(root, () => {
      text("hello");
    });
    expect(root.textContent).toBe("hello");
  });

  test("reactive signal", () => {
    const msg = signal("hello");
    const root = document.createElement("div");
    mount(root, () => {
      text(msg);
    });
    expect(root.textContent).toBe("hello");
    msg("world");
    expect(root.textContent).toBe("world");
  });

  test("tagged template with signals", () => {
    const name = signal("Alice");
    const count = signal(3);
    const root = document.createElement("div");
    mount(root, () => {
      text`${name} has ${count} items`;
    });
    expect(root.textContent).toBe("Alice has 3 items");
    name("Bob");
    expect(root.textContent).toBe("Bob has 3 items");
    count(7);
    expect(root.textContent).toBe("Bob has 7 items");
  });

  test("tagged template with static values", () => {
    const root = document.createElement("div");
    mount(root, () => {
      text`static ${"value"} here`;
    });
    expect(root.textContent).toBe("static value here");
  });
});

// ── Reactive attributes ─────────────────────────────────────────────────────

describe("reactive attributes", () => {
  test("signal as attribute value updates on change", () => {
    const cls = signal("red");
    const root = document.createElement("div");
    mount(root, () => {
      div({ class: cls });
    });
    const el = root.firstElementChild!;
    expect(el.getAttribute("class")).toBe("red");
    cls("blue");
    expect(el.getAttribute("class")).toBe("blue");
  });

  test("computed as attribute value", () => {
    const active = signal(true);
    const cls = computed(() => (active() ? "on" : "off"));
    const root = document.createElement("div");
    mount(root, () => {
      div({ class: cls });
    });
    const el = root.firstElementChild!;
    expect(el.getAttribute("class")).toBe("on");
    active(false);
    expect(el.getAttribute("class")).toBe("off");
  });

  test("reactive attribute removes when value becomes null", () => {
    const title = signal<string | undefined>("tip");
    const root = document.createElement("div");
    mount(root, () => {
      div({ title });
    });
    const el = root.firstElementChild!;
    expect(el.getAttribute("title")).toBe("tip");
    title(undefined);
    expect(el.hasAttribute("title")).toBe(false);
  });
});

// ── Reactive builder (coarse-grained) ───────────────────────────────────────

describe("reactive builder", () => {
  test("builder re-runs when signal read directly changes", () => {
    const show = signal(true);
    const root = document.createElement("div");
    mount(root, () => {
      div(() => {
        if (show()) {
          span({ class: "visible" });
        } else {
          span({ class: "hidden" });
        }
      });
    });
    const container = root.firstElementChild!;
    expect(container.firstElementChild?.getAttribute("class")).toBe("visible");
    show(false);
    expect(container.firstElementChild?.getAttribute("class")).toBe("hidden");
  });

  test("builder re-creates children on signal change", () => {
    const items = signal(["a", "b"]);
    const root = document.createElement("div");
    mount(root, () => {
      div(() => {
        for (const item of items()) {
          span(() => text(item));
        }
      });
    });
    const container = root.firstElementChild!;
    expect(container.children.length).toBe(2);
    expect(container.textContent).toBe("ab");
    items(["x", "y", "z"]);
    expect(container.children.length).toBe(3);
    expect(container.textContent).toBe("xyz");
  });

  test("fine-grained text inside builder does not cause full re-render", () => {
    const name = signal("Alice");
    let builderRunCount = 0;
    const root = document.createElement("div");
    mount(root, () => {
      div(() => {
        builderRunCount++;
        text`Hello, ${name}`;
      });
    });
    expect(builderRunCount).toBe(1);
    expect(root.textContent).toBe("Hello, Alice");
    name("Bob");
    // Builder should NOT re-run — only the text node updates
    expect(builderRunCount).toBe(1);
    expect(root.textContent).toBe("Hello, Bob");
  });
});

// ── computed ────────────────────────────────────────────────────────────────

describe("computed", () => {
  test("derives from signals", () => {
    const a = signal(2);
    const b = signal(3);
    const sum = computed(() => a() + b());
    expect(sum()).toBe(5);
    a(10);
    expect(sum()).toBe(13);
  });

  test("works with text", () => {
    const count = signal(0);
    const label = computed(() => `count: ${count()}`);
    const root = document.createElement("div");
    mount(root, () => {
      text(label);
    });
    expect(root.textContent).toBe("count: 0");
    count(5);
    expect(root.textContent).toBe("count: 5");
  });
});

// ── Event parsing ───────────────────────────────────────────────────────────

describe("event parsing", () => {
  test("onClickCapture registers with capture: true", () => {
    let registeredEvent = "";
    let registeredCapture = false;
    const root = document.createElement("div");
    const origAdd = HTMLElement.prototype.addEventListener;

    HTMLElement.prototype.addEventListener = function (event: string, fn: any, options: any) {
      if (event === "click") {
        registeredEvent = event;
        registeredCapture = typeof options === "boolean" ? options : !!options?.capture;
      }
      return origAdd.call(this, event, fn, options);
    };

    mount(root, () => {
      div({ onClickCapture: () => {} });
    });

    HTMLElement.prototype.addEventListener = origAdd;

    expect(registeredEvent).toBe("click");
    expect(registeredCapture).toBe(true);
  });

  test("onGotPointerCapture is not confused with capture suffix", () => {
    // This should register 'gotpointercapture' event, not 'gotpointer' with capture
    let handler: EventListener | null = null;
    const root = document.createElement("div");
    const origAdd = HTMLElement.prototype.addEventListener;
    let registeredEvent = "";
    let registeredCapture = false;

    HTMLElement.prototype.addEventListener = function (event: string, fn: any, options: any) {
      if (event === "gotpointercapture" || event === "gotpointer") {
        registeredEvent = event;
        registeredCapture = typeof options === "boolean" ? options : !!options?.capture;
        handler = fn;
      }
      return origAdd.call(this, event, fn, options);
    };

    mount(root, () => {
      div({ onGotPointerCapture: () => {} });
    });

    HTMLElement.prototype.addEventListener = origAdd;

    expect(registeredEvent).toBe("gotpointercapture");
    expect(registeredCapture).toBe(false);
  });
});
