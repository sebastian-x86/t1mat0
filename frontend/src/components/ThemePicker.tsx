import SystemIcon from "./SystemIcon";
import "../styles/segmented.css";

/**
 * Colour scheme choice as a segmented control, matching the language picker:
 * a monitor for "follow the system", a sun for light and a moon for dark.
 */

type Props = {
    value: string;
    onChange: (value: string) => void;
    autoLabel: string;
    lightLabel: string;
    darkLabel: string;
};

function Sun() {
    return (
        <svg className="segmented__icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path
                d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6M5.4 5.4l1.8 1.8M16.8 16.8l1.8 1.8M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
            />
        </svg>
    );
}

function Moon() {
    return (
        <svg className="segmented__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export default function ThemePicker({value, onChange, autoLabel, lightLabel, darkLabel}: Props) {
    const options = [
        {id: "auto", label: autoLabel, icon: <SystemIcon />},
        {id: "light", label: lightLabel, icon: <Sun />},
        {id: "dark", label: darkLabel, icon: <Moon />},
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
