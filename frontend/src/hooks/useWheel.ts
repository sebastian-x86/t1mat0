import {useEffect, useRef} from "react";

/**
 * React registers onWheel passively, so the browser still scrolls the element
 * a little before the handler runs. A native non-passive listener lets us
 * swallow the scroll and only change the value.
 */
export function useWheel<T extends HTMLElement>(handler: (event: WheelEvent) => void) {
    const ref = useRef<T | null>(null);
    const latest = useRef(handler);

    // Writing a ref during render breaks concurrent rendering, so the handler
    // is only swapped once the render has been committed.
    useEffect(() => {
        latest.current = handler;
    }, [handler]);

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }
        const onWheel = (event: WheelEvent) => {
            event.preventDefault();
            latest.current(event);
        };
        element.addEventListener("wheel", onWheel, {passive: false});
        return () => element.removeEventListener("wheel", onWheel);
    });

    return ref;
}

export default useWheel;
