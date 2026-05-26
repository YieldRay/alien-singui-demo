import tailwind from "bun-plugin-tailwind";
import { rm } from "node:fs/promises";
import path from "node:path";

const outdir = path.join(process.cwd(), "dist");
await rm(outdir, { recursive: true, force: true });

console.log("Building APP...");
for (const output of (
  await Bun.build({
    entrypoints: [...new Bun.Glob("src/**/*.html").scanSync()],
    outdir,
    plugins: [tailwind],
    minify: true,
    target: "browser",
    sourcemap: "linked",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  })
).outputs) {
  console.log(` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`);
}

console.log("Building SingUI library...");
for (const output of (
  await Bun.build({
    entrypoints: [...new Bun.Glob("src/alien-singui.ts").scanSync()],
    outdir,
    minify: true,
    target: "browser",
    sourcemap: "linked",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
  })
).outputs) {
  console.log(` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`);
}
