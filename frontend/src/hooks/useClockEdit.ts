import {useEffect, useRef, useState} from "react";
import {SetCurrentDuration} from "../../wailsjs/go/main/App";
import {timer} from "../../wailsjs/go/models";
import {
    clockParts,
    joinClockParts,
    nudgeClockSegment,
    parseDuration,
    stepDuration,
    toDuration,
    typeClockDigit,
} from "../duration";
import {wheelStep} from "../lib/clockPointer";
import {useWheel} from "./useWheel";

/** Which half of mm:ss the keyboard is currently filling. */
export type ClockSegment = 0 | 1;

export type ClockEdit = {
    draft: string | null;
    error: boolean;
    segment: ClockSegment;
    inputRef: React.RefObject<HTMLInputElement | null>;
    start: () => void;
    cancel: () => void;
    commit: () => Promise<void>;
    typeDigit: (digit: string) => void;
    nudge: (delta: number) => void;
    selectSegment: (segment: ClockSegment) => void;
    clearSegment: () => void;
};

/**
 * Holds the draft of the editable clock. The mm:ss rules themselves live in
 * duration.ts; this only feeds React state and talks to the backend once the
 * user commits.
 */
export function useClockEdit(
    remainingSeconds: number | undefined,
    onCommitted: (state: timer.State) => void,
    onError: (message: string) => void,
): ClockEdit {
    const [draft, setDraft] = useState<string | null>(null);
    const [error, setError] = useState(false);
    const [segment, setSegment] = useState<ClockSegment>(0);
    // Digits typed into the active segment since it was entered.
    const typed = useRef("");
    // Escape unmounts the input, which also fires blur — the ref keeps that
    // blur from committing the discarded draft.
    const cancelled = useRef(false);

    // Same wheel handling as the settings fields, but on the draft above the
    // tomato.
    const inputRef = useWheel<HTMLInputElement>((event) => {
        if (draft === null) {
            return;
        }
        const seconds = parseDuration(draft);
        if (seconds === null) {
            return;
        }
        const step = wheelStep(event);
        typed.current = "";
        setError(false);
        setDraft(toDuration(stepDuration(seconds, event.deltaY < 0 ? step : -step)));
    });

    // Highlight the segment that the next digit will overwrite.
    useEffect(() => {
        const input = inputRef.current;
        if (draft === null || !input) {
            return;
        }
        const colon = draft.indexOf(":");
        const [from, to] = segment === 0 ? [0, colon] : [colon + 1, draft.length];
        input.setSelectionRange(from, to);
    }, [draft, segment, inputRef]);

    const start = () => {
        if (remainingSeconds === undefined) {
            return;
        }
        cancelled.current = false;
        setError(false);
        setSegment(0);
        typed.current = "";
        setDraft(toDuration(remainingSeconds));
    };

    const cancel = () => {
        cancelled.current = true;
        setDraft(null);
        setError(false);
    };

    const commit = async () => {
        if (draft === null || cancelled.current) {
            return;
        }
        const parsed = parseDuration(draft);
        if (parsed === null) {
            setError(true);
            return;
        }
        try {
            const updated = await SetCurrentDuration(Math.max(1, parsed));
            onCommitted(timer.State.createFrom(updated));
            cancel();
        } catch (err) {
            onError(String(err));
            setError(true);
        }
    };

    const typeDigit = (digit: string) => {
        if (draft === null) {
            return;
        }
        const next = typeClockDigit({draft, segment, typed: typed.current}, digit);
        typed.current = next.typed;
        setSegment(next.segment);
        setDraft(next.draft);
    };

    const nudge = (delta: number) => {
        if (draft === null) {
            return;
        }
        typed.current = "";
        setDraft(nudgeClockSegment(draft, segment, delta));
    };

    const selectSegment = (next: ClockSegment) => {
        typed.current = "";
        setSegment(next);
    };

    const clearSegment = () => {
        typed.current = "";
        const [minutes, seconds] = clockParts(draft ?? "00:00");
        setDraft(segment === 0 ? joinClockParts(0, seconds) : joinClockParts(minutes, 0));
    };

    return {
        draft,
        error,
        segment,
        inputRef,
        start,
        cancel,
        commit,
        typeDigit,
        nudge,
        selectSegment,
        clearSegment,
    };
}

export default useClockEdit;
