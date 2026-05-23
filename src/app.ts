import { signal } from "alien-signals";
import { tags, attr, prop, on, text, t } from "./alien-singui.ts";

const count = signal(0);
const inputValue = signal("Hello Alien!");

const isDoubleDigits = () => count() >= 10;

export default function App() {
  tags.div(() => {
    attr.class = "app-container";

    tags.h1(() => {
      attr.style = () => (isDoubleDigits() ? "color: red" : "color: black");

      text(t`Current Count: ${count} 🔥`);
    });

    tags.div(() => {
      tags.input(() => {
        attr.type = "text";

        prop.value = count;

        on("input", (e) => inputValue((e.target as HTMLInputElement).value));
      });

      tags.p(() => {
        text(t`You typed: ${inputValue}`);
      });
    });

    tags.div(() => {
      tags.button(() => {
        text("Decrement");
        on("click", () => count(count() - 1));
      });

      tags.button(() => {
        text("Increment");
        on("click", () => count(count() + 1));
      });
    });
  });
}
