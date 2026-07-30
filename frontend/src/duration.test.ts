import {describe, expect, it} from "vitest";
import {
    MAX_PHASE_SECONDS,
    clockParts,
    joinClockParts,
    nudgeClockSegment,
    parseDuration,
    stepDuration,
    toDuration,
    typeClockDigit,
} from "./duration";

describe("toDuration", () => {
    it("pads both halves so the field never jumps", () => {
        expect(toDuration(2)).toBe("00:02");
        expect(toDuration(60)).toBe("01:00");
        expect(toDuration(25 * 60)).toBe("25:00");
        expect(toDuration(3599)).toBe("59:59");
    });

    it("keeps minutes beyond an hour countable", () => {
        expect(toDuration(3600)).toBe("60:00");
    });

    it("never renders negative time", () => {
        expect(toDuration(-30)).toBe("00:00");
    });
});

describe("parseDuration", () => {
    it("reads mm:ss", () => {
        expect(parseDuration("1:30")).toBe(90);
        expect(parseDuration("00:02")).toBe(2);
        expect(parseDuration("120:00")).toBe(7200);
    });

    it("treats a bare number as minutes", () => {
        expect(parseDuration("25")).toBe(1500);
        expect(parseDuration("1,5")).toBe(90);
        expect(parseDuration("0.5 min")).toBe(30);
    });

    it("accepts an explicit seconds suffix", () => {
        expect(parseDuration("45s")).toBe(45);
        expect(parseDuration("45 s")).toBe(45);
    });

    it("rejects nonsense instead of guessing", () => {
        for (const input of ["", "   ", "abc", "1:60", "1:2:3", "-5", "12x"]) {
            expect(parseDuration(input)).toBeNull();
        }
    });
});

describe("clock parts", () => {
    it("splits and rejoins", () => {
        expect(clockParts("07:09")).toEqual([7, 9]);
        expect(joinClockParts(7, 9)).toBe("07:09");
    });

    it("survives a malformed draft", () => {
        expect(clockParts("oops")).toEqual([0, 0]);
    });

    it("clamps at the backend maximum", () => {
        expect(joinClockParts(1000, 0)).toBe(toDuration(MAX_PHASE_SECONDS));
        expect(joinClockParts(-5, 0)).toBe("00:00");
    });
});

describe("typeClockDigit", () => {
    const start = {draft: "25:00", segment: 0 as const, typed: ""};

    it("fills the minutes and jumps to the seconds after two digits", () => {
        const first = typeClockDigit(start, "0");
        expect(first.draft).toBe("00:00");
        expect(first.segment).toBe(0);

        const second = typeClockDigit(first, "5");
        expect(second.draft).toBe("05:00");
        expect(second.segment).toBe(1);
        expect(second.typed).toBe("");
    });

    it("keeps the seconds below sixty instead of carrying over", () => {
        const seconds = typeClockDigit({draft: "05:00", segment: 1, typed: ""}, "7");
        expect(seconds.draft).toBe("05:07");

        const clamped = typeClockDigit(seconds, "9");
        expect(clamped.draft).toBe("05:59");
    });

    it("starts a fresh number once a segment is full", () => {
        const full = typeClockDigit(
            typeClockDigit({draft: "00:00", segment: 1, typed: ""}, "1"),
            "2",
        );
        expect(full.draft).toBe("00:12");
        expect(full.typed).toBe("");

        const next = typeClockDigit(full, "3");
        expect(next.draft).toBe("00:03");
    });

    it("does not let the minutes leave the allowed range", () => {
        const typed = typeClockDigit(
            typeClockDigit({draft: "00:00", segment: 0, typed: ""}, "9"),
            "9",
        );
        expect(parseDuration(typed.draft)!).toBeLessThanOrEqual(MAX_PHASE_SECONDS);
    });
});

describe("nudgeClockSegment", () => {
    it("steps the segment under the caret", () => {
        expect(nudgeClockSegment("05:30", 0, 1)).toBe("06:30");
        expect(nudgeClockSegment("05:30", 1, -1)).toBe("05:29");
    });

    it("stops at the edges without wrapping", () => {
        expect(nudgeClockSegment("00:30", 0, -1)).toBe("00:30");
        expect(nudgeClockSegment("05:59", 1, 1)).toBe("05:59");
        expect(nudgeClockSegment("05:00", 1, -1)).toBe("05:00");
    });
});

describe("stepDuration", () => {
    it("never falls below a single second", () => {
        expect(stepDuration(30, -60)).toBe(1);
        expect(stepDuration(1, -1)).toBe(1);
    });

    it("stops at the maximum phase length", () => {
        expect(stepDuration(MAX_PHASE_SECONDS, 60)).toBe(MAX_PHASE_SECONDS);
    });
});
