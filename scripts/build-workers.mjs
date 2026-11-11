/** Bundle browser workers before Next.js starts or exports the static site. */
import { build } from "esbuild";

await Promise.all(
  ["mortality-fit", "financial-simulation"].map((name) =>
    build({
      entryPoints: [`src/workers/${name}.worker.ts`],
      bundle: true,
      platform: "browser",
      format: "iife",
      target: "es2022",
      outfile: `public/workers/${name}.worker.js`,
    }),
  ),
);
