import {describe, expect, it} from "vitest";
import {formatBreaks, parseBreaks, parseClock, toClock} from "./workhours";

describe("parseBreaks", () => {
    it("reads full HH:MM ranges", () => {
        expect(parseBreaks("12:00-12:30")).toEqual([{start: "12:00", durationMinutes: 30}]);
    });

    it("accepts bare hours on either side", () => {
        expect(parseBreaks("12-13")).toEqual([{start: "12:00", durationMinutes: 60}]);
        expect(parseBreaks("12-12:30")).toEqual([{start: "12:00", durationMinutes: 30}]);
        expect(parseBreaks("9:15-10")).toEqual([{start: "09:15", durationMinutes: 45}]);
    });

    it("splits several breaks on semicolons and commas", () => {
        expect(parseBreaks("12-12:30; 15-15:30")).toEqual([
            {start: "12:00", durationMinutes: 30},
            {start: "15:00", durationMinutes: 30},
        ]);
        expect(parseBreaks("12-12:30,15-15:30")).toHaveLength(2);
    });

    it("treats an empty field as no breaks", () => {
        expect(parseBreaks("")).toEqual([]);
        expect(parseBreaks("   ")).toEqual([]);
    });

    it("ignores a trailing separator so typing stays smooth", () => {
        expect(parseBreaks("12-12:30;")).toEqual([{start: "12:00", durationMinutes: 30}]);
    });

    it("rejects text it cannot read", () => {
        expect(parseBreaks("lunch")).toBeNull();
        expect(parseBreaks("12:30")).toBeNull();
        expect(parseBreaks("12-")).toBeNull();
    });

    it("rejects ranges that do not move forward", () => {
        expect(parseBreaks("13-12")).toBeNull();
        expect(parseBreaks("12-12")).toBeNull();
    });

    it("rejects times outside the clock", () => {
        expect(parseBreaks("25-26")).toBeNull();
        expect(parseBreaks("12:70-13")).toBeNull();
    });
});

describe("formatBreaks", () => {
    it("renders stored breaks as the input text", () => {
        expect(
            formatBreaks([
                {start: "12:00", durationMinutes: 30},
                {start: "15:00", durationMinutes: 45},
            ]),
        ).toBe("12:00-12:30; 15:00-15:45");
    });

    it("returns an empty string without breaks", () => {
        expect(formatBreaks([])).toBe("");
    });

    it("drops entries the parser could never produce", () => {
        expect(formatBreaks([{start: "nope", durationMinutes: 30}])).toBe("");
        expect(formatBreaks([{start: "12:00", durationMinutes: 0}])).toBe("");
    });

    it("survives a round trip through the parser", () => {
        const parsed = parseBreaks("12-12:30; 15-15:30");
        expect(parsed).not.toBeNull();
        expect(parseBreaks(formatBreaks(parsed ?? []))).toEqual(parsed);
    });
});

describe("clock helpers", () => {
    it("converts minutes to HH:MM and back", () => {
        expect(toClock(0)).toBe("00:00");
        expect(toClock(9 * 60 + 5)).toBe("09:05");
        expect(parseClock("09:05")).toBe(545);
    });

    it("rejects impossible times", () => {
        expect(parseClock("24:00")).toBeNull();
        expect(parseClock("12:60")).toBeNull();
        expect(parseClock("noon")).toBeNull();
    });
});
