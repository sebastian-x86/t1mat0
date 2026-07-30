import {beforeEach, describe, expect, test} from "vitest";
import {applyTheme, resolveTheme, watchSystemTheme} from "./theme";

// The suite runs in plain node, so window and document are stubbed with the
// two pieces the module touches: matchMedia and documentElement.dataset.
type Listener = () => void;

let prefersLight = false;
let listeners: Listener[] = [];
let dataset: {theme?: string} = {};

function install() {
    listeners = [];
    dataset = {};
    const query = {
        get matches() {
            return prefersLight;
        },
        addEventListener: (_: string, listener: Listener) => listeners.push(listener),
        removeEventListener: (_: string, listener: Listener) => {
            listeners = listeners.filter((entry) => entry !== listener);
        },
    };
    const globals = globalThis as unknown as Record<string, unknown>;
    globals.window = {matchMedia: () => query};
    globals.document = {documentElement: {dataset}};
}

describe("theme", () => {
    beforeEach(() => {
        prefersLight = false;
        install();
    });

    test("explicit choices win over the system scheme", () => {
        prefersLight = true;
        expect(resolveTheme("dark")).toBe("dark");
        prefersLight = false;
        expect(resolveTheme("light")).toBe("light");
    });

    test("auto and anything unknown follow the system scheme", () => {
        expect(resolveTheme("auto")).toBe("dark");
        expect(resolveTheme("neon")).toBe("dark");
        prefersLight = true;
        expect(resolveTheme("auto")).toBe("light");
    });

    test("applyTheme writes the resolved scheme onto the root element", () => {
        prefersLight = true;
        expect(applyTheme("auto")).toBe("light");
        expect(dataset.theme).toBe("light");
        applyTheme("dark");
        expect(dataset.theme).toBe("dark");
    });

    test("watchSystemTheme subscribes and unsubscribes", () => {
        let calls = 0;
        const stop = watchSystemTheme(() => calls++);
        expect(listeners).toHaveLength(1);
        listeners[0]();
        expect(calls).toBe(1);
        stop();
        expect(listeners).toHaveLength(0);
    });
});
