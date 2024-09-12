/** @typedef  {import("@ianvs/prettier-plugin-sort-imports").PluginConfig} SortImportsConfig*/
/** @typedef  {import("prettier").Config} PrettierConfig*/

/** @type { PrettierConfig | SortImportsConfig | TailwindConfig } */
const config = {
  printWidth: 80,
  tabWidth: 2,
  plugins: [
    "@ianvs/prettier-plugin-sort-imports",
  ]
};

export default config;
