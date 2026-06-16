import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "**/*.jsonld"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Browser-side static site: ES modules with browser globals.
    files: ["site/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.browser
      }
    }
  },
  {
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      // The scaffold favours explicit, documented placeholders over premature
      // strictness, so a few stylistic rules are relaxed to warnings.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "off"
    }
  }
);
