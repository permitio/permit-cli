import { FlatCompat } from "@eslint/eslintrc";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import sonarjsPlugin from "eslint-plugin-sonarjs";
import securityPlugin from "eslint-plugin-security";
import tsParser from '@typescript-eslint/parser';

const compat = new FlatCompat({
  baseDirectory: import.meta.url,
});

export default [
  {
    plugins: {
      "@typescript-eslint": tsPlugin,
      sonarjs: sonarjsPlugin,
      security: securityPlugin,
    },
    languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 'latest',
				sourceType: 'module',
				ecmaFeatures: {
					jsx: true,
				},
			},
			globals: {
				Headers: 'readonly',
				RequestInit: 'readonly',
				fetch: 'readonly',
			},
		},
    
    rules: {
      strict: "off",
      "eol-last": ["error", "always"],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "sonarjs/no-small-switch": "off",
      "security/detect-non-literal-fs-filename": "off",
      "no-warning-comments": "error",
      "no-loop-func": "error",
      curly: ["error"],
      "no-multi-spaces": "error",
      "consistent-return": "off",
      "consistent-this": ["off", "self"],
      "func-style": "off",
      "max-nested-callbacks": ["error", 3],
      camelcase: "off",
      "no-debugger": "warn",
      "no-empty": "warn",
      "no-invalid-regexp": "warn",
      "no-unused-expressions": "warn",
      "no-native-reassign": "warn",
      "no-fallthrough": "warn",
      "sonarjs/cognitive-complexity": "warn",
      eqeqeq: "error",
      "no-undef": "off",
      "no-dupe-keys": "error",
      "no-empty-character-class": "error",
      "no-self-compare": "error",
      "valid-typeof": "error",
      "no-unused-vars": "off",
      "handle-callback-err": "error",
      "no-shadow-restricted-names": "error",
      "no-new-require": "error",
      "no-mixed-spaces-and-tabs": "error",
      "block-scoped-var": "error",
      "no-else-return": "error",
      "no-throw-literal": "error",
      "no-void": "error",
      radix: "error",
      "wrap-iife": ["error", "outside"],
      "no-shadow": "off",
      "no-path-concat": "error",
      "valid-jsdoc": ["off", {
        requireReturn: false,
        requireParamDescription: false,
        requireReturnDescription: false
      }],
      "no-spaced-func": "error",
      "semi-spacing": "error",
      quotes: ["error", "single"],
      "key-spacing": ["error", {
        beforeColon: false,
        afterColon: true
      }],
      "no-lonely-if": "error",
      "no-floating-decimal": "error",
      "brace-style": ["error", "1tbs", {
        allowSingleLine: true
      }],
      "comma-style": ["error", "last"],
      "no-multiple-empty-lines": ["error", { max: 1 }],
      "no-nested-ternary": "error",
      "operator-assignment": ["error", "always"],
      "padded-blocks": ["error", "never"],
      "quote-props": ["error", "as-needed"],
      "keyword-spacing": ["error", {
        before: true,
        after: true,
        overrides: {}
      }],
      "space-before-blocks": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "computed-property-spacing": ["error", "never"],
      "space-in-parens": ["error", "never"],
      "space-unary-ops": ["error", {
        words: true,
        nonwords: false
      }],
      "wrap-regex": "error",
      "linebreak-style": "off",
      semi: ["error", "always"],
      "arrow-spacing": ["error", {
        before: true,
        after: true
      }],
      "no-class-assign": "error",
      "no-const-assign": "error",
      "no-this-before-super": "error",
      "no-var": "error",
      "object-shorthand": ["error", "always"],
      "prefer-arrow-callback": "error",
      "prefer-const": "error",
      "prefer-spread": "error",
      "prefer-template": "error",
      "@typescript-eslint/no-unused-vars": "error"
    },
  },
  {
    files: ["source/**/*.{js,ts,tsx}"],
    rules: {
      "no-undef": "off",
      "security/detect-non-literal-fs-filename": "off",
      "sonarjs/no-duplicate-string": "off",
      "security/detect-object-injection": "off",
      "max-nested-callbacks": "off",
      "sonarjs/no-identical-functions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "no-use-before-define": "off",
      "sonarjs/cognitive-complexity": "off",
    },
  },
];
