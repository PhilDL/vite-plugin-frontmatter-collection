/// <reference types="./types.d.ts" />
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // Globally ignored files
    ignores: [
      "**/.prettierrc.js",
      "eslint.config.js",
      "dist",
      "pnpm-lock.yaml",
      "**/build",
      "**/public/build",
      "**/playwright-report",
    ],
  },
  {
    plugins: {
      import: (await import("eslint-plugin-import-x")).default,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    files: ["**/*.js", "**/*.ts", "**/*.tsx"],
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/array-type": "off",
      "@typescript-eslint/consistent-indexed-object-style": "off",
      "@typescript-eslint/prefer-function-type": "off",
      "@typescript-eslint/ban-types": "off",
      "@typescript-eslint/prefer-for-of": "off",

      // new stuff
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/unbound-method": ["error", { ignoreStatic: true }],

      // this is mostly library code, so some functions use and return lots of any
      // this should be allowed
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",

      // Remix
      // Allow to `throw redirect("/foo")`
      "@typescript-eslint/only-throw-error": "off",

      // this is necessary or else it doesn't work in CI... not sure why
      // Todo fix that
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      // "no-console": ["warn", { allow: ["warn", "error"] }],

      // allowing type {}
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    linterOptions: { reportUnusedDisableDirectives: true },
    languageOptions: { parserOptions: { project: true } },
  },
);
