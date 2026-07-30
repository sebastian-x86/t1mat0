/**
 * Monitor icon, used by both segmented controls for their "follow the system"
 * option, so language and theme read as the same kind of choice.
 */
export default function SystemIcon({className}: {className: string}) {
    return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
            <rect
                x="3"
                y="4"
                width="18"
                height="12"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
            />
            <path d="M9 20h6M12 16v4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}
