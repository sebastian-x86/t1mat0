import type {ReactNode} from "react";
import type {Strings} from "../i18n";
import "./ActionBar.css";

type Props = {
    t: Strings;
    running: boolean;
    toggleLabel: string;
    /** Only advertise the letter shortcuts while they are actually enabled. */
    keyHint: (key: string) => string;
    onToggle: () => void;
    onReset: () => void;
    onSkip: () => void;
    helpOpen: boolean;
    onHelpToggle: () => void;
    /** The shortcut overlay, rendered above the buttons when open. */
    help?: ReactNode;
    /** The gear button with its settings popover. */
    settings: ReactNode;
};

/** Start/pause, reset and skip, plus the two popover triggers. */
export default function ActionBar({
    t,
    running,
    toggleLabel,
    keyHint,
    onToggle,
    onReset,
    onSkip,
    helpOpen,
    onHelpToggle,
    help,
    settings,
}: Props) {
    return (
        <div className="actions-bar">
            {help}

            <div className="actions">
                <button
                    className="btn btn--primary"
                    onClick={onToggle}
                    title={t.toggleTitle(toggleLabel, keyHint("Space"))}
                >
                    <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                        {running ? (
                            <>
                                <rect x="6" y="4.5" width="4.4" height="15" rx="1.4" />
                                <rect x="13.6" y="4.5" width="4.4" height="15" rx="1.4" />
                            </>
                        ) : (
                            <path d="M7.5 4.9c0-1 1.1-1.6 2-1.1l10.2 6.6c.8.5.8 1.7 0 2.2L9.5 19.2c-.9.5-2-.1-2-1.1V4.9Z" />
                        )}
                    </svg>
                    {toggleLabel}
                </button>
                <button
                    className="btn btn--icon"
                    onClick={onReset}
                    title={t.resetTitle(keyHint("R"))}
                    aria-label={t.reset}
                >
                    <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                            d="M12 5.5a6.5 6.5 0 1 0 6.2 8.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.1"
                            strokeLinecap="round"
                        />
                        <path d="M12 2.2v6.6l-4.6-3.3L12 2.2Z" />
                    </svg>
                </button>
                <button
                    className="btn btn--icon"
                    onClick={onSkip}
                    title={t.skipTitle(keyHint("N"))}
                    aria-label={t.skip}
                >
                    <svg className="btn__icon" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M6 5.6c0-.9 1-1.4 1.7-.9l8 6.4c.6.5.6 1.3 0 1.8l-8 6.4c-.7.5-1.7 0-1.7-.9V5.6Z" />
                        <rect x="17.2" y="4.6" width="2.6" height="14.8" rx="1.2" />
                    </svg>
                </button>
                <button
                    className={`btn btn--ghost${helpOpen ? " btn--active" : ""}`}
                    onClick={onHelpToggle}
                    aria-expanded={helpOpen}
                    aria-haspopup="dialog"
                    title={t.shortcutsTitle}
                    aria-label="Keyboard shortcuts"
                >
                    ?
                </button>

                {settings}
            </div>
        </div>
    );
}
