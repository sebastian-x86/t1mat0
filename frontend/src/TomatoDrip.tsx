import {useEffect, useState} from "react";

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
    /** 0 = phase just started (tomato full), 1 = phase over (glass full). */
    progress: number;
    /** Drops only fall while the timer actually runs. */
    running: boolean;
    /** Plays the "skip squeezes the tomato into the glass" gag. */
    squeezing?: boolean;
};

function TomatoDrip({progress, running, squeezing = false}: TomatoDripProps) {
    const clamped = squeezing ? 1 : Math.min(1, Math.max(0, progress));

    // One drop per countdown step: every time the tomato loses a bit, a fresh
    // drop element is mounted, which restarts the fall animation from zero.
    const [dropId, setDropId] = useState(0);
    useEffect(() => {
        if (!running || clamped >= 1) {
            return;
        }
        setDropId((id) => id + 1);
    }, [progress, running, clamped]);

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
        >
            <svg
                className="drip__svg"
                viewBox="0 0 200 250"
                role="img"
                aria-label={`Tomato drained ${Math.round(clamped * 100)} percent`}
            >
                <defs>
                    <clipPath id="drip-tomato">
                        <ellipse cx="100" cy="70" rx="52" ry="45"/>
                    </clipPath>
                    <clipPath id="drip-glass">
                        <path d="M73 176 L127 176 L118 234 Q117 237 113 237 L87 237 Q83 237 82 234 Z"/>
                    </clipPath>
                </defs>

                <g className="drip__tomato">
                    <ellipse className="drip__shell" cx="100" cy="70" rx="52" ry="45"/>

                    <g clipPath="url(#drip-tomato)">
                        <g className="drip__juice" style={{transform: `translateY(${tomatoOffset}px)`}}>
                            <rect x="44" y={TOMATO_TOP} width="112" height={TOMATO_SPAN + 6}/>
                            <ellipse className="drip__surface" cx="100" cy={TOMATO_TOP} rx="56" ry="3.5"/>
                        </g>
                    </g>

                    <ellipse className="drip__outline" cx="100" cy="70" rx="52" ry="45"/>
                    <ellipse
                        className="drip__shine"
                        cx="78"
                        cy="52"
                        rx="14"
                        ry="9"
                        transform="rotate(-25 78 52)"
                    />

                </g>

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
                    <rect x="97" y="12" width="6" height="14" rx="3"/>
                </g>

                <g className="drip__drops">
                    {dripping && (
                        <g key={dropId} transform="translate(100 112)">
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

                {squeezing && <rect className="drip__stream" x="94" y="112" width="12" height="66" rx="6"/>}

                {squeezing && (
                    <g className="drip__puddle">
                        <ellipse cx="112" cy="246" rx="32" ry="6"/>
                        <ellipse cx="82" cy="248" rx="14" ry="4"/>
                        <ellipse cx="140" cy="243" rx="7" ry="2.5"/>
                    </g>
                )}

                <g className="drip__glassware">
                    <path
                        className="drip__glass-body"
                        d="M68 172 L132 172 L123 236 Q122 242 116 242 L84 242 Q78 242 77 236 Z"
                    />

                    <g clipPath="url(#drip-glass)">
                        <g className="drip__juice" style={{transform: `translateY(${glassOffset}px)`}}>
                            <rect x="68" y={GLASS_TOP} width="64" height={GLASS_SPAN + 6}/>
                            <ellipse className="drip__surface" cx="100" cy={GLASS_TOP} rx="32" ry="3"/>
                        </g>
                    </g>

                    <path
                        className="drip__glass-outline"
                        d="M68 172 L132 172 L123 236 Q122 242 116 242 L84 242 Q78 242 77 236 Z"
                    />
                    <line className="drip__glass-shine" x1="76" y1="182" x2="83" y2="230"/>
                </g>
                {squeezing && (
                    <g className="drip__hand">
                        <g transform="translate(100 0)">
                            <rect className="drip__sleeve" x="-27" y="-138" width="54" height="46" rx="10"/>
                            <rect className="drip__skin" x="-21" y="-112" width="42" height="34" rx="14"/>
                            <path
                                className="drip__skin"
                                d="M-36 -88 q0 -14 14 -14 h44 q14 0 14 14 v24 q0 20 -22 22 h-28 q-22 -2 -22 -22 Z"
                            />
                            <path className="drip__skin" d="M-36 -76 q-14 4 -13 16 q1 12 15 10 Z"/>

                            <g className="drip__fingers">
                                <path className="drip__skin" d="M-31 -48 q9 -6 18 0 q3 12 -2 20 q-9 6 -15 -2 Z"/>
                                <path className="drip__skin" d="M-11 -46 q9 -6 18 0 q3 14 -2 23 q-9 6 -15 -2 Z"/>
                                <path className="drip__skin" d="M9 -48 q9 -6 18 0 q3 12 -2 20 q-9 6 -15 -2 Z"/>
                            </g>

                            <g className="drip__knuckles">
                                <path d="M-22 -60 q9 -5 18 0"/>
                                <path d="M-2 -58 q9 -5 18 0"/>
                            </g>
                        </g>
                    </g>
                )}
            </svg>
        </div>
    );
}

export default TomatoDrip;
