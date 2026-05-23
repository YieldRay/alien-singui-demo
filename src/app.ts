import { signal } from "alien-signals";
import { tags, attr, prop, on, text, t } from "./alien-singui.ts";

// --- Reusable Components ---

function Card(children: () => void) {
  tags.div(() => {
    attr.style =
      "max-width: 480px; margin: 40px auto; padding: 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; border: 1px solid #eaeaea; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.04);";
    children();
  });
}

function Typography({ variant, children }: { variant: "h1" | "h2" | "p" | "label"; children: () => void }) {
  if (variant === "h1") {
    tags.h1(() => {
      attr.style = "font-size: 24px; font-weight: 600; color: #111; margin: 0 0 8px 0;";
      children();
    });
  } else if (variant === "h2") {
    tags.h2(() => {
      attr.style = "font-size: 16px; font-weight: 600; color: #111; margin: 0 0 16px 0;";
      children();
    });
  } else if (variant === "p") {
    tags.p(() => {
      attr.style = "font-size: 14px; color: #666; margin: 0;";
      children();
    });
  } else if (variant === "label") {
    tags.label(() => {
      attr.style = "display: block; font-size: 14px; font-weight: 500; color: #333; margin-bottom: 8px;";
      children();
    });
  }
}

function Button({
  variant = "primary",
  onClick,
  children,
}: {
  variant?: "primary" | "secondary";
  onClick: () => void;
  children: () => void;
}) {
  tags.button(() => {
    const baseStyle =
      "padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 500; cursor: pointer; transition: all 0.15s ease;";
    const variantStyle =
      variant === "primary"
        ? "background-color: #000; border: 1px solid #000; color: #fff;"
        : "background-color: #fff; border: 1px solid #d1d5db; color: #374151;";

    attr.style = `${baseStyle} ${variantStyle}`;
    on("click", onClick);
    children();
  });
}

function InputBox(props: { value: () => string; onInput: (val: string) => void }) {
  tags.input(() => {
    attr.type = "text";
    prop.value = props.value;
    on("input", (e) => props.onInput((e.target as HTMLInputElement).value));
    attr.style =
      "width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; outline: none; transition: border-color 0.15s ease;";
  });
}

function Section(children: () => void) {
  tags.div(() => {
    attr.style = "margin-bottom: 32px;";
    children();
  });
}

function Divider() {
  tags.div(() => {
    attr.style = "border-top: 1px solid #eaeaea; margin: 24px 0;";
  });
}

// --- App State & View ---

const name = signal("Guest");
const count = signal(0);

export default function App() {
  Card(() => {
    // Header Section
    Section(() => {
      Typography({ variant: "h1", children: () => text("Dashboard") });
      Typography({ variant: "p", children: () => text("A clean, minimal UI demonstrating state management.") });
    });

    // Form Section
    Section(() => {
      tags.div(() => {
        attr.style = "margin-bottom: 16px;";
        Typography({ variant: "label", children: () => text("Name") });
        InputBox({ value: name, onInput: name });
      });

      tags.div(() => {
        attr.style = "padding: 16px; background-color: #f9fafb; border: 1px solid #f3f4f6; border-radius: 6px;";
        Typography({ variant: "p", children: () => text(t`Preview: Hello, ${name}!`) });
      });
    });

    Divider();

    // Counter Section
    Section(() => {
      Typography({ variant: "h2", children: () => text("Interactive Counter") });

      tags.div(() => {
        attr.style = "display: flex; align-items: center; gap: 16px;";

        Button({ variant: "secondary", onClick: () => count(count() - 1), children: () => text("Decrease") });

        tags.span(() => {
          attr.style =
            "font-size: 18px; font-weight: 600; color: #111; min-width: 40px; text-align: center; font-variant-numeric: tabular-nums;";
          text(t`${count}`);
        });

        Button({ variant: "primary", onClick: () => count(count() + 1), children: () => text("Increase") });
      });
    });
  });
}
