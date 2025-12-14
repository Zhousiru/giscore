import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/tanstack-query/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  external: ["react", "@tanstack/react-query"],
});
