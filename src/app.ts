import { tags, text, signal, computed } from "./alien-singui.ts";
import { highlight } from "sugar-high";

const { a, button, div, footer, h1, h2, header, input, main, p, pre, code, section, span } = tags;

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  link: "no-underline hover:bg-[var(--color-mark)]",
  body: "space-y-5 text-[13px] leading-[1.7]",
  input: [
    "mt-2 w-full border border-[var(--color-line)] bg-transparent px-4 py-2",
    "font-mono text-[12px] text-[var(--color-fg)]",
    "placeholder:text-[var(--color-fg-subtle)]",
    "focus:border-[var(--color-mark)] focus:outline-none",
  ].join(" "),
  button: [
    "border border-[var(--color-line)] bg-transparent px-4 py-2",
    "text-[12px] uppercase tracking-wide text-[var(--color-fg)] no-underline",
    "transition-colors hover:bg-[var(--color-mark)] hover:text-[var(--color-bg)] active:opacity-80",
  ].join(" "),
};

// ── Components ──────────────────────────────────────────────────────────────

function InlineCode(children: VoidFunction) {
  span({ class: "ic" }, children);
}

function TerminalBlock(attrs: { commands: VoidFunction; output: VoidFunction }) {
  div({ class: "my-6" }, () => {
    pre({ class: "code-block" }, () =>
      code(({ el }) => {
        attrs.commands();
        el.innerHTML = highlight(el.textContent);
      }),
    );
    div({ class: "callout" }, attrs.output);
  });
}

function Button(attrs: { onClick: VoidFunction }, children: VoidFunction) {
  button({ class: styles.button, onClick: attrs.onClick }, children);
}

// ── Layout ──────────────────────────────────────────────────────────────────

function Layout(children: VoidFunction) {
  div({ class: "min-h-screen font-mono" }, () => {
    header(
      {
        class: "grid grid-cols-2 gap-x-8 px-6 pt-6 pb-10 text-[12px] uppercase leading-tight tracking-wide sm:px-10",
      },
      () => {
        div(() => a({ class: `font-bold ${styles.link}`, href: "/" }, () => text("ALIEN-SINGUI")));
        div({ class: "flex flex-col items-end" }, () => {
          a({ class: styles.link, href: "https://github.com/YieldRay/alien-singui" }, () => text("[ CORE ]"));
          a({ class: styles.link, href: "https://github.com/YieldRay/alien-singui-demo" }, () => text("[ DEMO ]"));
        });
      },
    );

    main(children);

    footer(
      {
        class:
          "mx-auto max-w-[1100px] border-t border-[var(--color-line)] px-6 py-10 text-[11px] uppercase tracking-wide sm:px-10",
      },
      () => {
        div({ class: "text-[var(--color-fg-muted)]" }, () => text("--\u2212"));
        div({ class: "mt-6 text-[var(--color-fg-muted)]" }, () => {
          const year = new Date().getFullYear();
          span(() => text(`~*~ \u00A9 ${year} ALIEN-SINGUI. MIT LICENSED. ~*~`));
        });
      },
    );
  });
}

function Section(children: VoidFunction) {
  section({ class: "mx-auto max-w-[860px] border-t border-[var(--color-line)] px-6 py-12 sm:px-10" }, children);
}

// ── State ───────────────────────────────────────────────────────────────────

const name = signal("Guest");
const count = signal(0);
const parity = computed(() => (count() % 2 === 0 ? "even" : "odd"));

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  Layout(() => {
    Section(() => {
      h1({ class: "h-doc h-doc-1 mb-8" }, () => text("A SIGNAL-BASED UI FRAMEWORK, DISTRIBUTED AS SOURCE"));

      div({ class: styles.body }, () => {
        p(() => {
          text("alien-singui is a reactive UI framework built on ");
          InlineCode(() => text("alien-signals"));
          text(". There is no virtual DOM, no JSX transform, no compilation step. ");
          text("Components are plain functions that emit real DOM nodes via a ");
          InlineCode(() => text("tags"));
          text(" proxy \u2014 yours to read, edit, or extend.");
        });
        p(() => {
          text("Declare a component once. alien-singui creates the DOM, ");
          text("wires signal subscriptions automatically, and performs surgical updates ");
          text("to the exact nodes that changed \u2014 no diffing, no reconciliation.");
        });
      });

      TerminalBlock({
        commands: () =>
          text(
            'import { tags, text, mount } from "./alien-singui.ts"\n' +
              "const { div, button } = tags\n\n" +
              "mount(root, () => {\n" +
              '  div(() => text("hello, signals"))\n' +
              "})",
          ),
        output: () => text("mounted \u2192 <div>hello, signals</div>"),
      });
    });

    Section(() => {
      h2({ class: "h-doc h-doc-2 mb-6" }, () => text("REACTIVE STATE"));

      div({ class: styles.body }, () => {
        p(() => {
          text("State is a ");
          InlineCode(() => text("signal()"));
          text(" \u2014 a read/write getter that tracks its subscribers. ");
          text("Pass a signal where a static value would go and the framework binds it automatically. ");
          text("When the signal changes, only the specific text node or attribute updates.");
        });
      });

      TerminalBlock({
        commands: () => {
          text("> enter user context:\n");
          input(
            {
              type: "text",
              class: styles.input,
              spellcheck: false,
              autocomplete: "off",
              placeholder: "type a name...",
              onInput: (e) => name((e.target as HTMLInputElement).value),
            },
            ({ prop }) => {
              prop.value = name;
            },
          );
        },
        output: () => text`> Hello, ${name}! The DOM is strictly synchronized.`,
      });
    });

    Section(() => {
      h2({ class: "h-doc h-doc-2 mb-6" }, () => text("COMPUTED & EFFECTS"));

      div({ class: styles.body }, () => {
        p(() => {
          text("Derived state uses ");
          InlineCode(() => text("computed()"));
          text(" \u2014 a signal that recalculates when its dependencies change. ");
          text("Combined with the ");
          InlineCode(() => text("text"));
          text(" tagged template, reactive interpolations update in place with zero overhead.");
        });
      });

      TerminalBlock({
        commands: () => {
          text("> count(count() + 1)\n");
          div({ class: "mt-2 flex items-center gap-4" }, () => {
            Button({ onClick: () => count(count() - 1) }, () => text("[ - ]"));
            span({ class: "inline font-bold text-[var(--color-mark)] tabular-nums" }, () => text`${count}`);
            Button({ onClick: () => count(count() + 1) }, () => text("[ + ]"));
          });
        },
        output: () => text`> count = ${count} (${parity})`,
      });
    });
  });
}
