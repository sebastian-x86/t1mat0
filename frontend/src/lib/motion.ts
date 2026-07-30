/**
 * True when the OS asks for less movement. Motion-only gags are skipped
 * entirely instead of being played at high speed (WCAG 2.1 SC 2.3.3).
 */
export function prefersReducedMotion(): boolean {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
