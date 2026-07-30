import SystemIcon from "./SystemIcon";
import "../styles/segmented.css";

/**
 * Language choice as a small segmented control. A native <select> pops open a
 * list that is drawn by the OS and spills out of the settings panel, so the
 * three options are shown inline instead: a monitor for "follow the system",
 * matching the theme picker, and a flag per language. Flag emoji are not an
 * option because Windows ships no glyphs for them, hence the hand-drawn SVGs.
 */

type Props = {
    value: string;
    onChange: (value: string) => void;
    autoLabel: string;
};

function FlagDE() {
    return (
        <svg className="segmented__flag" viewBox="0 0 60 40" aria-hidden="true">
            <rect width="60" height="13.34" y="0" fill="#000000" />
            <rect width="60" height="13.34" y="13.33" fill="#dd0000" />
            <rect width="60" height="13.34" y="26.66" fill="#ffce00" />
        </svg>
    );
}

function FlagGB() {
    return (
        <svg className="segmented__flag" viewBox="0 0 60 40" aria-hidden="true">
            <clipPath id="gb-clip">
                <rect width="60" height="40" />
            </clipPath>
            <g clipPath="url(#gb-clip)">
                <rect width="60" height="40" fill="#012169" />
                <path d="M0 0 60 40M60 0 0 40" stroke="#ffffff" strokeWidth="8" />
                <path d="M0 0 60 40M60 0 0 40" stroke="#c8102e" strokeWidth="4" />
                <path d="M30 0v40M0 20h60" stroke="#ffffff" strokeWidth="13" />
                <path d="M30 0v40M0 20h60" stroke="#c8102e" strokeWidth="8" />
            </g>
        </svg>
    );
}

export default function LanguagePicker({value, onChange, autoLabel}: Props) {
    const options = [
        {id: "auto", label: autoLabel, icon: <SystemIcon />},
        {id: "de", label: "Deutsch", icon: <FlagDE />},
        {id: "en", label: "English", icon: <FlagGB />},
    ];

    return (
        <div className="segmented" role="radiogroup" aria-label={autoLabel}>
            {options.map((option) => (
                <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={value === option.id}
                    aria-label={option.label}
                    title={option.label}
                    className={
                        "segmented__option" + (value === option.id ? " segmented__option--on" : "")
                    }
                    onClick={() => onChange(option.id)}
                >
                    {option.icon}
                </button>
            ))}
        </div>
    );
}
