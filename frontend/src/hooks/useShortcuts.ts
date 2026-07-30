import {useEffect, useRef} from "react";

export type ShortcutHandlers = {
    toggleTimer: () => void;
    resetTimer: () => void;
    skip: () => void | Promise<void>;
    startClockEdit: () => void;
    toggleSettings: () => void;
    toggleHelp: () => void;
    closeHelp: () => void;
    /** While the clock is being edited every key belongs to the input. */
    editing: boolean;
    /** Single character shortcuts can be switched off (WCAG 2.1.4). */
    singleKey: boolean;
};

/**
 * Binds the global keyboard shortcuts once and keeps them pointing at the
 * current handlers through a ref, so the listener survives every tick.
 */
export function useShortcuts(handlers: ShortcutHandlers) {
    const latest = useRef(handlers);
    useEffect(() => {
        latest.current = handlers;
    });

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.repeat || event.altKey || event.metaKey) {
                return;
            }
            const target = event.target as HTMLElement | null;
            const typing =
                !!target &&
                (target.isContentEditable ||
                    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
            if (typing || latest.current.editing) {
                return;
            }

            const handled = () => {
                event.preventDefault();
                // A focused button would otherwise react to Space/Enter too.
                target?.blur?.();
            };

            // Shortcuts with a modifier or function key stay available even
            // when the single character keys are switched off (WCAG 2.1.4).
            if (event.ctrlKey) {
                if (event.key === ",") {
                    handled();
                    latest.current.toggleSettings();
                }
                return;
            }

            switch (event.key) {
                case "F1":
                    handled();
                    latest.current.toggleHelp();
                    return;
                case "F2":
                    handled();
                    latest.current.startClockEdit();
                    return;
                case "Escape":
                    latest.current.closeHelp();
                    return;
            }

            if (!latest.current.singleKey) {
                return;
            }

            switch (event.key.toLowerCase()) {
                case " ":
                case "k":
                    handled();
                    latest.current.toggleTimer();
                    break;
                case "r":
                    handled();
                    latest.current.resetTimer();
                    break;
                case "n":
                case "s":
                    handled();
                    void latest.current.skip();
                    break;
                case "e":
                    handled();
                    latest.current.startClockEdit();
                    break;
                case ",":
                    handled();
                    latest.current.toggleSettings();
                    break;
                case "?":
                    handled();
                    latest.current.toggleHelp();
                    break;
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);
}

export default useShortcuts;
