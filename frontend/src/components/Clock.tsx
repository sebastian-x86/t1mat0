import type {ClockEdit} from "../hooks/useClockEdit";
import {segmentAtPointer} from "../lib/clockPointer";
import type {Strings} from "../i18n";
import "./Clock.css";

type Props = {
    t: Strings;
    /** mm:ss as rendered by the backend. */
    formattedRemaining: string;
    phaseLabel: string;
    statusLabel: string;
    /** 0…1 of the current phase, used for the accessible value. */
    progress: number;
    /** Work fills the bar as the tomato drains; a break empties it again. */
    barFraction: number;
    edit: ClockEdit;
};

/** The remaining time, editable in place, plus the phase progress bar. */
export default function Clock({
    t,
    formattedRemaining,
    phaseLabel,
    statusLabel,
    progress,
    barFraction,
    edit,
}: Props) {
    const {
        draft,
        error,
        inputRef,
        start,
        cancel,
        commit,
        typeDigit,
        nudge,
        selectSegment,
        clearSegment,
    } = edit;

    return (
        <div className="clock">
            {draft === null ? (
                <button
                    className="clock__value clock__value--button"
                    onClick={start}
                    title={t.clockEditTitle}
                    aria-label={t.clockAria(formattedRemaining)}
                >
                    {formattedRemaining}
                </button>
            ) : (
                <input
                    className={`clock__value clock__input${error ? " clock__input--error" : ""}`}
                    value={draft}
                    autoFocus
                    spellCheck={false}
                    aria-label={t.clockDurationAria}
                    aria-invalid={error}
                    title={t.clockTitle}
                    ref={inputRef}
                    readOnly
                    onBlur={commit}
                    onMouseUp={(e) => {
                        // Clicking a half of the field starts editing there.
                        selectSegment(
                            segmentAtPointer(e.currentTarget, e.clientX) === "seconds" ? 1 : 0,
                        );
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            void commit();
                            return;
                        }
                        if (e.key === "Escape") {
                            e.preventDefault();
                            cancel();
                            return;
                        }
                        if (/^[0-9]$/.test(e.key)) {
                            e.preventDefault();
                            typeDigit(e.key);
                            return;
                        }
                        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                            e.preventDefault();
                            nudge(e.key === "ArrowUp" ? 1 : -1);
                            return;
                        }
                        if (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Tab") {
                            e.preventDefault();
                            selectSegment(e.key === "ArrowLeft" ? 0 : 1);
                            return;
                        }
                        if (e.key === "Backspace" || e.key === "Delete") {
                            e.preventDefault();
                            clearSegment();
                            return;
                        }
                        // Everything else — letters, the colon, punctuation —
                        // has no meaning in a mm:ss field.
                        if (e.key.length === 1) {
                            e.preventDefault();
                        }
                    }}
                />
            )}
            <div className="clock__status">{draft === null ? statusLabel : t.clockHint}</div>
            <div
                className="clock__progress"
                role="progressbar"
                aria-label={t.progressAria(phaseLabel)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
                aria-valuetext={t.progressValue(Math.round(progress * 100), formattedRemaining)}
            >
                <div
                    className="clock__progress-bar"
                    style={{width: `${Math.round(barFraction * 100)}%`}}
                />
            </div>
        </div>
    );
}
