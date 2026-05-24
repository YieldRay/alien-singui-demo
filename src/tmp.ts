import { tags, signal, computed } from "./alien-singui.ts";

const { a } = tags;

const now = signal(new Date());
setInterval(() => now(new Date()), 1000);

function App() {
  a(({ el }) => {
    el.textContent = computed(() => `Current time: ${now().toLocaleTimeString()}`)();
  });
}
a;
