/**
 * Plays a short two-tone chime using the WebAudio API so the app does not need
 * to ship binary audio assets.
 */
let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === "undefined") {
        return null;
    }
    if (!audioContext) {
        const Ctor =
            window.AudioContext ??
            (window as {webkitAudioContext?: typeof AudioContext}).webkitAudioContext;
        if (!Ctor) {
            return null;
        }
        audioContext = new Ctor();
    }
    return audioContext;
}

function tone(ctx: AudioContext, frequency: number, startOffset: number, duration: number) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const start = ctx.currentTime + startOffset;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.start(start);
    oscillator.stop(start + duration);
}

/**
 * Webviews suspend the AudioContext until the user has interacted with the
 * page. Call this from a real user gesture so later chimes can play.
 */
export function unlockAudio() {
    const ctx = getContext();
    if (ctx && ctx.state === "suspended") {
        void ctx.resume();
    }
}

export function playChime(phase: string) {
    const ctx = getContext();
    if (!ctx) {
        return;
    }
    if (ctx.state === "suspended") {
        void ctx.resume();
    }

    // Work sessions get a rising chime, breaks a falling one.
    const rising = phase === "work";
    tone(ctx, rising ? 660 : 880, 0, 0.28);
    tone(ctx, rising ? 880 : 660, 0.22, 0.36);
}
