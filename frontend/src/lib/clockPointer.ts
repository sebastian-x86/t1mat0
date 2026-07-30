/**
 * Works out whether the pointer sits on the minutes or the seconds part of a
 * mm:ss input, so the wheel changes the segment under the cursor. The text is
 * measured on a canvas because an input has no per-character geometry.
 */
const textMetrics = document.createElement("canvas").getContext("2d");

export function segmentAtPointer(input: HTMLInputElement, clientX: number): "minutes" | "seconds" {
    const colon = input.value.indexOf(":");
    if (colon < 0 || !textMetrics) {
        return "minutes";
    }

    const style = window.getComputedStyle(input);
    textMetrics.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const width = (text: string) => textMetrics.measureText(text).width;

    const rect = input.getBoundingClientRect();
    const left =
        rect.left + parseFloat(style.borderLeftWidth || "0") + parseFloat(style.paddingLeft || "0");
    const inner =
        rect.width -
        parseFloat(style.borderLeftWidth || "0") -
        parseFloat(style.borderRightWidth || "0") -
        parseFloat(style.paddingLeft || "0") -
        parseFloat(style.paddingRight || "0");

    const total = width(input.value);
    let start = left;
    if (style.textAlign === "right" || style.textAlign === "end") {
        start = left + inner - total;
    } else if (style.textAlign === "center") {
        start = left + (inner - total) / 2;
    }

    const divider = start + width(input.value.slice(0, colon)) + width(":") / 2;
    return clientX < divider ? "minutes" : "seconds";
}

/**
 * How far a wheel tick moves a mm:ss field: the segment under the pointer, or
 * always seconds while shift is held.
 */
export function wheelStep(event: WheelEvent): number {
    const input = event.currentTarget as HTMLInputElement;
    return event.shiftKey || segmentAtPointer(input, event.clientX) === "seconds" ? 1 : 60;
}
