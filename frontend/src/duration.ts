/**
 * Pure duration helpers shared by the clock above the tomato and the settings
 * fields. They live outside App.tsx so the fiddly mm:ss rules can be tested
 * without a DOM.
 */

/** Upper limit of a single phase, mirroring MaxPhaseSeconds on the Go side. */
export const MAX_PHASE_SECONDS = 600 * 60;

/** Renders seconds as the mm:ss the duration inputs expect. */
export function toDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(total / 60);
    return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * Parses a duration input. "1:30" is 90 seconds, "45s" is 45 seconds and a
 * bare number stays minutes so existing muscle memory keeps working.
 */
export function parseDuration(input: string): number | null {
    const value = input.trim().toLowerCase();
    if (value === "") {
        return null;
    }

    const clock = value.match(/^(\d+):([0-5]?\d)$/);
    if (clock) {
        return Number(clock[1]) * 60 + Number(clock[2]);
    }

    const seconds = value.match(/^(\d+(?:[.,]\d+)?)\s*s$/);
    if (seconds) {
        return Math.round(Number(seconds[1].replace(",", ".")));
    }

    const minutes = value.match(/^(\d+(?:[.,]\d+)?)\s*(?:m|min)?$/);
    if (minutes) {
        return Math.round(Number(minutes[1].replace(",", ".")) * 60);
    }

    return null;
}

/** Splits an mm:ss draft into its two numbers. */
export function clockParts(draft: string): [number, number] {
    const [minutes, seconds] = draft.split(":");
    return [Number(minutes) || 0, Number(seconds) || 0];
}

/** Joins minutes and seconds back into a clamped mm:ss draft. */
export function joinClockParts(minutes: number, seconds: number): string {
    return toDuration(Math.min(MAX_PHASE_SECONDS, Math.max(0, minutes * 60 + seconds)));
}

/** Which half of mm:ss the keyboard is currently filling. */
export type ClockSegment = 0 | 1;

export type ClockEdit = {
    draft: string;
    segment: ClockSegment;
    /** Digits typed into the active segment since it was entered. */
    typed: string;
};

/**
 * Types into the mm:ss field like a clock widget: digits fill the minutes
 * first and jump to the seconds on their own, no colon needed.
 */
export function typeClockDigit(edit: ClockEdit, digit: string): ClockEdit {
    const [minutes, seconds] = clockParts(edit.draft);
    const typed = edit.typed + digit;

    if (edit.segment === 0) {
        const value = Number(typed.slice(-2));
        return {
            draft: joinClockParts(value, seconds),
            segment: typed.length >= 2 ? 1 : 0,
            typed: typed.length >= 2 ? "" : typed,
        };
    }

    // Seconds never carry over into minutes, so 7 then 9 lands on 59.
    const value = Math.min(59, Number(typed.slice(-2)));
    return {
        draft: joinClockParts(minutes, value),
        segment: 1,
        typed: typed.length >= 2 ? "" : typed,
    };
}

/** Arrow keys change the segment under the caret by one step. */
export function nudgeClockSegment(draft: string, segment: ClockSegment, delta: number): string {
    const [minutes, seconds] = clockParts(draft);
    if (segment === 0) {
        return joinClockParts(Math.max(0, minutes + delta), seconds);
    }
    return joinClockParts(minutes, Math.min(59, Math.max(0, seconds + delta)));
}

/** Wheel steps stay inside the range the backend accepts. */
export function stepDuration(seconds: number, step: number): number {
    return Math.min(MAX_PHASE_SECONDS, Math.max(1, seconds + step));
}
