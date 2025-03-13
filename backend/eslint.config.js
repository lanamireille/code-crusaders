import react from "eslint-plugin-react";
import jest from "eslint-plugin-jest";

import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["src/**/*.js"],
    plugins: {
        jest, react
    },
    rules: {
        "no-unused-vars": ["error", { "caughtErrors": "none" }]
    }
  }
]);