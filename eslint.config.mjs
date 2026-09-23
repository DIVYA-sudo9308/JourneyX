import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const config = [
  {
    ignores: [
      ".next/**",
      ".next-verify/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
      "Journey Analytics — Sankey + funnel-html/**",
    ],
  },
  ...coreWebVitals,
  ...typescript,
];

export default config;
