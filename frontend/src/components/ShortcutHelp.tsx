import type {Strings} from "../i18n";
import "./ShortcutHelp.css";

type Props = {
    t: Strings;
    language: string;
    /** Single character keys can be switched off, then only the list shrinks. */
    singleKey: boolean;
    version: string;
};

/** The "?" overlay listing every keyboard shortcut. */
export default function ShortcutHelp({t, language, singleKey, version}: Props) {
    return (
        <div className="shortcuts" role="dialog" aria-label={t.shortcuts}>
            <dl className="shortcuts__list">
                <dt>
                    <kbd>{language === "de" ? "Strg" : "Ctrl"}</kbd>+<kbd>,</kbd>
                </dt>
                <dd>{t.scSettings}</dd>
                <dt>
                    <kbd>F1</kbd>
                </dt>
                <dd>{t.scList}</dd>
                <dt>
                    <kbd>F2</kbd>
                </dt>
                <dd>{t.scEdit}</dd>
                <dt>
                    <kbd>Tab</kbd>
                </dt>
                <dd>{t.scFocus}</dd>
                <dt>
                    <kbd>Esc</kbd>
                </dt>
                <dd>{t.scClose}</dd>
            </dl>
            {singleKey ? (
                <dl className="shortcuts__list shortcuts__list--single">
                    <dt>
                        <kbd>{language === "de" ? "Leer" : "Space"}</kbd> / <kbd>K</kbd>
                    </dt>
                    <dd>{t.scToggle}</dd>
                    <dt>
                        <kbd>R</kbd>
                    </dt>
                    <dd>{t.scReset}</dd>
                    <dt>
                        <kbd>N</kbd> / <kbd>S</kbd>
                    </dt>
                    <dd>{t.scSkip}</dd>
                    <dt>
                        <kbd>E</kbd>
                    </dt>
                    <dd>{t.scEdit}</dd>
                    <dt>
                        <kbd>,</kbd>
                    </dt>
                    <dd>{t.scSettings}</dd>
                    <dt>
                        <kbd>?</kbd>
                    </dt>
                    <dd>{t.scList}</dd>
                </dl>
            ) : (
                <p className="shortcuts__hint">{t.scOff}</p>
            )}
            <p className="shortcuts__meta">t1mat0 {version} · GPL-3.0</p>
        </div>
    );
}
