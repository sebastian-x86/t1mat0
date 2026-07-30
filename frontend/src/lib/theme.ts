export type ThemeChoice = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

function lightQuery(): MediaQueryList | null {
    if (typeof window.matchMedia !== "function") {
        return null;
    }
    return window.matchMedia("(prefers-color-scheme: light)");
}

/** Turns the stored preference into the scheme the CSS has to render. */
export function resolveTheme(choice: string): ResolvedTheme {
    if (choice === "light" || choice === "dark") {
        return choice;
    }
    return lightQuery()?.matches ? "light" : "dark";
}

/**
 * Writes the resolved scheme onto <html>. "auto" is resolved here instead of
 * in CSS, so the stylesheet needs a single light palette rather than a copy
 * of it inside a prefers-color-scheme query.
 */
export function applyTheme(choice: string): ResolvedTheme {
    const resolved = resolveTheme(choice);
    document.documentElement.dataset.theme = resolved;
    return resolved;
}

/** Notifies when the operating system flips its scheme. Only "auto" cares. */
export function watchSystemTheme(onChange: () => void): () => void {
    const query = lightQuery();
    if (!query) {
        return () => {};
    }
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
}
