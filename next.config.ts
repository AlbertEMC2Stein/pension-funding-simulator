import type { NextConfig } from "next";

// Set NEXT_PUBLIC_BASE_PATH at build time for a GitHub Pages project URL.
const config: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
};

export default config;
