import {useEffect, useRef, useState} from "react";
import {texts} from "../i18n";
import "./HarvestHud.css";

type Props = {
    language: string;
    tomatoes: number;
    total: number;
    streak: number;
    bestStreak: number;
    onOpenReport: () => void;
};

function TomatoIcon() {
    return (
        <svg className="harvest__icon" viewBox="0 2.6 24 24">
            <path
                className="harvest__leaf"
                d="M12 3.4 9.6 5.1 6.9 4.3l.9 2.6-1.4 2.2 2.7.2 1.5 2 1.4-2 2.7-.2-1.4-2.2.9-2.6-2.7.8L12 3.4Z"
            />
            <circle className="harvest__body" cx="12" cy="15" r="6.6" />
            <ellipse className="harvest__shine" cx="9.6" cy="12.6" rx="1.6" ry="1.1" />
        </svg>
    );
}

function HarvestHud({language, tomatoes, total, streak, bestStreak, onOpenReport}: Props) {
    const t = texts(language);
    const [popping, setPopping] = useState(false);
    const previous = useRef(tomatoes);

    useEffect(() => {
        if (tomatoes > previous.current) {
            setPopping(true);
            const id = window.setTimeout(() => setPopping(false), 900);
            previous.current = tomatoes;
            return () => window.clearTimeout(id);
        }
        previous.current = tomatoes;
    }, [tomatoes]);

    return (
        <button
            className={`harvest${popping ? " harvest--pop" : ""}`}
            aria-label={t.harvestAria(tomatoes, total, streak, bestStreak)}
            title={t.reportOpenTitle}
            onClick={onOpenReport}
        >
            <span className="harvest__total" title={t.harvestTitle(tomatoes, total)}>
                <TomatoIcon />
                <span className="harvest__count" aria-hidden="true">
                    {tomatoes}
                </span>
            </span>
            {streak >= 2 && (
                <span
                    className="harvest__streak"
                    aria-hidden="true"
                    title={t.streakTitle(streak, bestStreak)}
                >
                    {t.streakLabel(streak)}
                </span>
            )}
        </button>
    );
}

export default HarvestHud;
