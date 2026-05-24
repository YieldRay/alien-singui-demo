import { signal } from "alien-signals";
import { tags, attr, prop, on, text, t } from "./alien-singui.ts";

// --- Reusable Components (Terminal & Monospace Aesthetic) ---

function Typography({ variant, children }: { variant: "h1" | "h2" | "p" | "label"; children: () => void }) {
  if (variant === "h1") {
    tags.h1(() => {
      attr.class = "mb-8 font-bold text-white text-[14px] sm:text-[16px] tracking-wide";
      text("# ");
      children();
    });
  } else if (variant === "h2") {
    tags.h2(() => {
      attr.class = "mb-6 mt-12 font-bold text-white text-[13px] sm:text-[14px] tracking-wide";
      text("## ~ ");
      children();
    });
  } else if (variant === "p") {
    tags.p(() => {
      attr.class = "text-[13px] leading-[1.8] text-white/90";
      children();
    });
  } else if (variant === "label") {
    tags.label(() => {
      attr.class = "block text-[13px] text-white/70 whitespace-nowrap";
      text("> ");
      children();
    });
  }
}

function InlineCode(children: () => void) {
  tags.span(() => {
    attr.class = "bg-white/20 px-1.5 py-0.5 text-white font-bold";
    children();
  });
}

function TerminalBlock(commands: () => void, output: () => void) {
  tags.div(() => {
    attr.class = "my-6 border border-white/20 bg-transparent text-[13px]";

    // Command section
    tags.div(() => {
      attr.class = "p-5 space-y-4";
      commands();
    });

    // Output section (Callout)
    tags.div(() => {
      attr.class = "border-t border-white/20 p-4 text-white/70 bg-white/5";
      output();
    });
  });
}

function Button({ onClick, children }: { onClick: () => void; children: () => void }) {
  tags.button(() => {
    attr.class =
      "border border-white/30 bg-transparent px-4 py-1.5 text-[13px] text-white transition-colors hover:bg-[#eaff00] hover:text-black hover:border-[#eaff00] focus:outline-none focus:ring-2 focus:ring-[#eaff00]/50 active:bg-[#c2d100]";
    on("click", onClick);
    children();
  });
}

function InputBox(props: { value: () => string; onInput: (val: string) => void }) {
  tags.input(() => {
    attr.type = "text";
    prop.value = props.value;
    on("input", (e) => props.onInput((e.target as HTMLInputElement).value));
    attr.class =
      "w-full max-w-sm border border-white/30 bg-transparent px-3 py-1.5 font-mono text-[13px] text-white placeholder-white/30 transition-colors focus:border-[#eaff00] focus:outline-none focus:ring-1 focus:ring-[#eaff00]";
    attr.spellcheck = "false";
    attr.autocomplete = "off";
  });
}

// --- Layouts ---

function PageLayout(children: () => void) {
  tags.div(() => {
    attr.class = "min-h-screen bg-[#2b35df] font-mono text-white selection:bg-[#eaff00] selection:text-black";

    // Header
    tags.header(() => {
      attr.class =
        "flex flex-col gap-4 sm:flex-row sm:justify-between px-6 pb-10 pt-6 text-[12px] uppercase tracking-wide sm:px-10";

      tags.div(() => {
        tags.a(() => {
          attr.class = "-mx-1 px-1 font-bold no-underline transition-colors hover:bg-[#eaff00] hover:text-black";
          attr.href = "/";
          text("ALIEN-SINGUI.DEV");
        });
      });

      tags.div(() => {
        attr.class = "flex flex-col items-start sm:items-end gap-1";
        const linkClass = "-mx-1 px-1 no-underline transition-colors hover:bg-[#eaff00] hover:text-black";

        tags.a(() => {
          attr.class = linkClass;
          attr.href = "https://github.com/YieldRay/alien-singui";
          text("[ CORE ]");
        });
        tags.a(() => {
          attr.class = linkClass;
          attr.href = "https://github.com/YieldRay/alien-singui-demo";
          text("[ DEMO GITHUB ]");
        });
      });
    });

    // Main Content
    tags.main(() => {
      children();
    });

    // Footer
    tags.footer(() => {
      attr.class =
        "mx-auto max-w-[1100px] border-t border-white/20 px-6 py-10 text-[11px] uppercase tracking-wide text-white/50 sm:px-10";
      tags.div(() => text("--−"));
      tags.div(() => {
        attr.class = "mt-6 flex flex-col gap-1 sm:flex-row sm:justify-between";
        tags.span(() => text("~*~ © 2026 ALIEN-SINGUI. MIT LICENSED. ~*~"));
      });
    });
  });
}

function Section(children: () => void) {
  tags.section(() => {
    attr.class = "mx-auto max-w-[860px] border-t border-white/20 px-6 py-12 sm:px-10";
    children();
  });
}

// --- App State & View ---

const name = signal("Guest");
const count = signal(0);
const parity = () => (count() % 2 === 0 ? "even" : "odd");

export default function App() {
  PageLayout(() => {
    // Intro Section
    Section(() => {
      Typography({ variant: "h1", children: () => text("A REACTIVE UI DEMO, DISTRIBUTED AS SOURCE") });

      tags.div(() => {
        attr.class = "space-y-5";
        Typography({
          variant: "p",
          children: () => {
            text("alien-singui is a minimalist framework for ");
            InlineCode(() => text("Bun"));
            text(" and the browser. There is no ");
            InlineCode(() => text("@virtual/dom"));
            text(" in your ");
            InlineCode(() => text("package.json"));
            text(". The framework provides a pure functional API to build user interfaces using native DOM elements.");
          },
        });

        Typography({
          variant: "p",
          children: () => {
            text(
              "Declare your components once. alien-singui emits the DOM, binds the signals automatically, and handles fine-grained updates without diffing overhead.",
            );
          },
        });
      });

      TerminalBlock(
        () => {
          tags.div(() => text("> bun create alien-singui my-app"));
          tags.div(() => text("> bun run dev"));
        },
        () => {
          text("alien-singui listening on http://localhost:3000");
        },
      );
    });

    // Data Binding Section
    Section(() => {
      Typography({ variant: "h2", children: () => text("STATE & BINDING") });

      tags.div(() => {
        attr.class = "space-y-5";
        Typography({
          variant: "p",
          children: () => {
            text("State management is powered by ");
            InlineCode(() => text("alien-signals"));
            text(
              ". Bindings are direct. When a signal changes, only the specific DOM attribute or text node is surgically updated.",
            );
          },
        });
      });

      TerminalBlock(
        () => {
          tags.div(() => {
            attr.class = "flex flex-col gap-2 sm:flex-row sm:items-center";
            Typography({ variant: "label", children: () => text("enter user context:") });
            tags.div(() => {
              attr.class = "flex-1";
              InputBox({ value: name, onInput: name });
            });
          });
        },
        () => {
          // Reactive template literal (t``) automatically tracks dependencies
          text(t`> Hello, ${name}! The DOM is strictly synchronized.`);
        },
      );
    });

    // Interactive Counter Section
    Section(() => {
      Typography({ variant: "h2", children: () => text("FINE-GRAINED REACTIVITY") });

      tags.div(() => {
        attr.class = "space-y-5";
        Typography({
          variant: "p",
          children: () => {
            text(
              "Interactions trigger immediate, isolated updates. By combining implicit context stacks and proxies, the API remains ergonomic while delivering vanilla JavaScript performance.",
            );
          },
        });
      });

      TerminalBlock(
        () => {
          tags.div(() => {
            attr.class = "flex items-center gap-4";
            Button({ onClick: () => count(count() - 1), children: () => text("decrease") });
            tags.span(() => {
              attr.class = "min-w-[4ch] text-center font-bold text-[#eaff00] text-[15px]";
              text(t`${count}`);
            });
            Button({ onClick: () => count(count() + 1), children: () => text("increase") });
          });
        },
        () => {
          text(t`> system.metrics.count updated to ${count} (${parity})`);
        },
      );
    });
  });
}
