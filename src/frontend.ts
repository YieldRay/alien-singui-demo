import App from "./app.ts";
import { mount, hot } from "./alien-singui.ts";
const root = document.getElementById("root")!;
mount(root, App);
hot(root, App);
