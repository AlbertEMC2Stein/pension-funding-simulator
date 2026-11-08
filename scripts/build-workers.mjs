/** Bundle browser workers before Next.js starts or exports the static site. */
import { build } from "esbuild";

await build({
  entryPoints: ["src/workers/mortality-fit.worker.ts"],
  bundle: true,
  platform: "browser",
  format: "iife",
  target: "es2022",
  outfile: "public/workers/mortality-fit.worker.js",
});
