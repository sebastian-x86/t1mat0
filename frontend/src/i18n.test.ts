import {describe, expect, it} from "vitest";
import {texts} from "./i18n";

describe("texts", () => {
    it("returns german for de and english for everything else", () => {
        expect(texts("de").work).toBe("Arbeit");
        expect(texts("en").work).toBe("Work");
        expect(texts("klingon").work).toBe("Work");
    });

    it("covers the same keys in both languages", () => {
        const en = Object.keys(texts("en")).sort();
        const de = Object.keys(texts("de")).sort();
        expect(de).toEqual(en);
    });

    it("keeps every string non-empty and every helper a function", () => {
        for (const language of ["en", "de"]) {
            for (const [key, value] of Object.entries(texts(language))) {
                if (typeof value === "function") {
                    continue;
                }
                expect(typeof value, `${language}.${key}`).toBe("string");
                expect(value, `${language}.${key}`).not.toBe("");
            }
        }
    });

    it("fills the placeholders of the templated strings", () => {
        expect(texts("de").resetTitle(" (R)")).toContain("(R)");
        expect(texts("en").progressValue(50, "12:30")).toContain("12:30");
        expect(texts("de").harvestTitle(3)).toContain("3");
        expect(texts("de").streakTitle(2, 5)).toContain("5");
    });
});
