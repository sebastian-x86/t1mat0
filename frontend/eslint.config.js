import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettier from "eslint-config-prettier";

export default tseslint.config(
    {
        // Wails erzeugt die Bindings, dist ist ein Build-Ergebnis.
        ignores: ["dist", "wailsjs", "node_modules"],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,

    {
        files: ["**/*.{ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                window: "readonly",
                document: "readonly",
                navigator: "readonly",
                console: "readonly",
                setTimeout: "readonly",
                clearTimeout: "readonly",
                setInterval: "readonly",
                clearInterval: "readonly",
                requestAnimationFrame: "readonly",
                cancelAnimationFrame: "readonly",
                matchMedia: "readonly",
                HTMLInputElement: "readonly",
                HTMLElement: "readonly",
                AudioContext: "readonly",
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", {allowConstantExport: true}],
            // Ungenutzte Argumente mit _ davor sind Absicht, etwa bei
            // Event-Handlern, die nur die Signatur erfüllen.
            "@typescript-eslint/no-unused-vars": [
                "error",
                {argsIgnorePattern: "^_", varsIgnorePattern: "^_"},
            ],
        },
    },

    // Muss zuletzt kommen: schaltet alle Regeln ab, die Prettier ohnehin
    // formatiert, damit sich beide nicht widersprechen.
    prettier,
);
