/**
 * Pure helpers for the fixed breaks field of the work hours editor. One text
 * field is friendlier than a row of pickers, so the parsing rules live here
 * where they can be tested without a DOM.
 */

/** A break as the Go side stores it: a start time plus a length in minutes. */
export type BreakSpan = {
    start: string;
    durationMinutes: number;
};

const MINUTES_PER_DAY = 24 * 60;
const ENTRY = /^(\d{1,2})(?::(\d{1,2}))?\s*-\s*(\d{1,2})(?::(\d{1,2}))?$/;

/** Renders minutes since midnight as HH:MM. */
export function toClock(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Reads an HH:MM time into minutes since midnight. */
export function parseClock(value: string): number | null {
    const match = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!match) {
        return null;
    }
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) {
        return null;
    }
    return hours * 60 + minutes;
}

/** Turns stored breaks back into the text the input shows. */
export function formatBreaks(items: readonly BreakSpan[]): string {
    return items
        .map((item) => {
            const start = parseClock(item.start);
            if (start === null || item.durationMinutes <= 0) {
                return "";
            }
            return `${toClock(start)}-${toClock(start + item.durationMinutes)}`;
        })
        .filter(Boolean)
        .join("; ");
}

/**
 * Parses the breaks field. Entries are separated by ";" or ",", and each entry
 * is a range like "12-12:30", "12:00-12:30" or "12-13". Returns null when the
 * text cannot be read, so the caller can flag the field instead of dropping
 * what the user typed.
 */
export function parseBreaks(raw: string): BreakSpan[] | null {
    const trimmed = raw.trim();
    if (trimmed === "") {
        return [];
    }

    const spans: BreakSpan[] = [];
    for (const entry of trimmed.split(/[;,]/)) {
        const text = entry.trim();
        if (text === "") {
            continue;
        }

        const match = ENTRY.exec(text);
        if (!match) {
            return null;
        }

        const start = Number(match[1]) * 60 + Number(match[2] ?? 0);
        const end = Number(match[3]) * 60 + Number(match[4] ?? 0);
        if (
            Number(match[1]) > 23 ||
            Number(match[3]) > 23 ||
            Number(match[2] ?? 0) > 59 ||
            Number(match[4] ?? 0) > 59
        ) {
            return null;
        }
        if (end <= start || end > MINUTES_PER_DAY) {
            return null;
        }

        spans.push({start: toClock(start), durationMinutes: end - start});
    }

    return spans;
}
