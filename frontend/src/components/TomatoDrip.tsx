import SnoozeZs from "./SnoozeZs";
import "./TomatoDrip.css";

const LEAF_ANGLES = [0, 72, 144, 216, 288];

const TOMATO_TOP = 25;
const TOMATO_BOTTOM = 115;
const TOMATO_SPAN = TOMATO_BOTTOM - TOMATO_TOP;

const GLASS_TOP = 174;
const GLASS_BOTTOM = 240;
const GLASS_SPAN = GLASS_BOTTOM - GLASS_TOP;

/** Direction and distance of the splatter drops when the tomato bursts. */
const SPLATTER = [
    {x: -46, y: 34, delay: 0},
    {x: -28, y: 58, delay: 0.05},
    {x: 34, y: 40, delay: 0.02},
    {x: 52, y: 62, delay: 0.08},
    {x: -14, y: 74, delay: 0.11},
    {x: 22, y: 80, delay: 0.06},
];

type TomatoDripProps = {
    /** Timer is paused: the tomato takes a nap. */
    paused?: boolean;
    /** 0 = phase just started (tomato full), 1 = phase over (glass full). */
    progress: number;
    /** Drops only fall while the timer actually runs. */
    running: boolean;
    /** Plays the "skip squeezes the tomato into the glass" gag. */
    squeezing?: boolean;
};

function TomatoDrip({progress, running, squeezing = false, paused = false}: TomatoDripProps) {
    const clamped = squeezing ? 1 : Math.min(1, Math.max(0, progress));

    // The juice rects always cover their full container; we translate them out
    // of view instead of resizing, because CSS transforms animate reliably in
    // every webview while SVG geometry properties do not.
    const tomatoOffset = clamped * TOMATO_SPAN;
    const glassOffset = (1 - clamped) * GLASS_SPAN;
    const dripping = running && clamped < 1 && !squeezing;

    return (
        <div
            className={`drip${dripping ? " drip--running" : ""}${clamped >= 1 ? " drip--full" : ""}${
                squeezing ? " drip--squeeze" : ""
            }`}
            aria-hidden="true"
        >
            <svg
                className="drip__svg"
                viewBox="0 0 200 250"
                role="img"
                aria-label={`Tomato drained ${Math.round(clamped * 100)} percent`}
            >
                <defs>
                    <clipPath id="drip-tomato">
                        <ellipse cx="100" cy="70" rx="52" ry="45" />
                    </clipPath>
                    <clipPath id="drip-glass">
                        <path d="M73 176 L127 176 L118 234 Q117 237 113 237 L87 237 Q83 237 82 234 Z" />
                    </clipPath>
                </defs>

                <g className="drip__tomato">
                    <ellipse className="drip__shell" cx="100" cy="70" rx="52" ry="45" />

                    <g clipPath="url(#drip-tomato)">
                        <g
                            className="drip__juice"
                            style={{transform: `translateY(${tomatoOffset}px)`}}
                        >
                            <rect x="44" y={TOMATO_TOP} width="112" height={TOMATO_SPAN + 6} />
                            <ellipse
                                className="drip__surface"
                                cx="100"
                                cy={TOMATO_TOP}
                                rx="56"
                                ry="3.5"
                            />
                        </g>
                    </g>

                    <ellipse className="drip__outline" cx="100" cy="70" rx="52" ry="45" />
                    <ellipse
                        className="drip__shine"
                        cx="78"
                        cy="52"
                        rx="14"
                        ry="9"
                        transform="rotate(-25 78 52)"
                    />
                </g>

                {paused && <SnoozeZs x={132} y={34} />}

                <g className="drip__leaves">
                    {LEAF_ANGLES.map((angle) => (
                        <ellipse
                            key={angle}
                            cx="115"
                            cy="28"
                            rx="16"
                            ry="5"
                            transform={`rotate(${angle} 100 28)`}
                        />
                    ))}
                    <rect x="97" y="12" width="6" height="14" rx="3" />
                </g>

                <g className="drip__drops">
                    {dripping && (
                        // A fresh element per countdown step restarts the
                        // fall animation from zero.
                        <g key={progress} transform="translate(100 112)">
                            <path
                                className="drip__drop"
                                d="M0 0 C4 6 6.5 9.5 6.5 12.5 A6.5 6.5 0 0 1 -6.5 12.5 C-6.5 9.5 -4 6 0 0 Z"
                            />
                        </g>
                    )}
                </g>

                {squeezing && (
                    <g className="drip__splatter">
                        {SPLATTER.map((splat) => (
                            <circle
                                key={`${splat.x}-${splat.y}`}
                                cx="100"
                                cy="118"
                                r="4"
                                style={{
                                    ["--splat-x" as string]: `${splat.x}px`,
                                    ["--splat-y" as string]: `${splat.y}px`,
                                    animationDelay: `${splat.delay}s`,
                                }}
                            />
                        ))}
                    </g>
                )}

                {squeezing && (
                    <rect className="drip__stream" x="94" y="112" width="12" height="66" rx="6" />
                )}

                {squeezing && (
                    <g className="drip__puddle">
                        <ellipse cx="112" cy="246" rx="32" ry="6" />
                        <ellipse cx="82" cy="248" rx="14" ry="4" />
                        <ellipse cx="140" cy="243" rx="7" ry="2.5" />
                    </g>
                )}

                <g className="drip__glassware">
                    <path
                        className="drip__glass-body"
                        d="M68 172 L132 172 L123 236 Q122 242 116 242 L84 242 Q78 242 77 236 Z"
                    />

                    <g clipPath="url(#drip-glass)">
                        <g
                            className="drip__juice"
                            style={{transform: `translateY(${glassOffset}px)`}}
                        >
                            <rect x="68" y={GLASS_TOP} width="64" height={GLASS_SPAN + 6} />
                            <ellipse
                                className="drip__surface"
                                cx="100"
                                cy={GLASS_TOP}
                                rx="32"
                                ry="3"
                            />
                        </g>
                    </g>

                    <path
                        className="drip__glass-outline"
                        d="M68 172 L132 172 L123 236 Q122 242 116 242 L84 242 Q78 242 77 236 Z"
                    />
                    <line className="drip__glass-shine" x1="76" y1="182" x2="83" y2="230" />
                </g>
                {squeezing && (
                    <g className="drip__foot">
                        <g transform="translate(100 0)">
                            {/* Carhartt style duck canvas leg, running off the top of the window. */}
                            <rect
                                className="drip__trouser"
                                x="-26"
                                y="-470"
                                width="52"
                                height="384"
                                rx="10"
                            />
                            <g className="drip__stitching">
                                <line x1="-18" y1="-466" x2="-18" y2="-96" />
                                <line x1="-14" y1="-466" x2="-14" y2="-96" />
                                <line x1="15" y1="-466" x2="15" y2="-96" />
                                <line x1="19" y1="-466" x2="19" y2="-96" />
                            </g>
                            <rect
                                className="drip__cuff"
                                x="-30"
                                y="-100"
                                width="60"
                                height="18"
                                rx="6"
                            />

                            <rect
                                className="drip__sock"
                                x="-19"
                                y="-94"
                                width="36"
                                height="34"
                                rx="11"
                            />

                            {/* Vans Old Skool: black canvas, white jazz stripe, foxing tape. */}
                            <rect
                                className="drip__shoe"
                                x="-36"
                                y="-66"
                                width="26"
                                height="22"
                                rx="8"
                            />
                            <rect
                                className="drip__shoe"
                                x="-34"
                                y="-60"
                                width="54"
                                height="46"
                                rx="12"
                            />
                            <ellipse className="drip__shoe" cx="30" cy="-28" rx="34" ry="15" />
                            <path
                                className="drip__shoe-toe"
                                d="M18 -42 q26 2 40 14 q-16 -2 -40 -2 Z"
                            />

                            <path className="drip__collar" d="M-35 -62 q13 -8 26 -3" />
                            <path
                                className="drip__stripe-shadow"
                                d="M-16 -36 q12 12 30 8 q16 -4 26 -12"
                            />
                            <path className="drip__stripe" d="M-16 -36 q12 12 30 8 q16 -4 26 -12" />

                            <g className="drip__laces">
                                <line x1="2" y1="-54" x2="22" y2="-48" />
                                <line x1="1" y1="-48" x2="21" y2="-42" />
                                <line x1="0" y1="-42" x2="20" y2="-36" />
                                <line x1="-1" y1="-36" x2="19" y2="-30" />
                            </g>

                            <rect
                                className="drip__foxing"
                                x="-38"
                                y="-19"
                                width="106"
                                height="19"
                                rx="9"
                            />
                            <path className="drip__welt" d="M-36 -19 q52 -4 104 0" />
                            <path className="drip__foxing-line" d="M-36 -8 q52 -3 104 0" />
                            <rect
                                className="drip__label"
                                x="-32"
                                y="-16"
                                width="11"
                                height="8"
                                rx="2"
                            />
                            <g className="drip__waffle">
                                <line x1="-24" y1="-6" x2="-24" y2="-1" />
                                <line x1="-11" y1="-6" x2="-11" y2="-1" />
                                <line x1="2" y1="-6" x2="2" y2="-1" />
                                <line x1="15" y1="-6" x2="15" y2="-1" />
                                <line x1="28" y1="-6" x2="28" y2="-1" />
                                <line x1="41" y1="-6" x2="41" y2="-1" />
                                <line x1="54" y1="-6" x2="54" y2="-1" />
                            </g>
                        </g>
                    </g>
                )}
            </svg>
        </div>
    );
}

export default TomatoDrip;
