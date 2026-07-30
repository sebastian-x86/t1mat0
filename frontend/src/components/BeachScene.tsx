import {useEffect, useState} from "react";
import SnoozeZs from "./SnoozeZs";
import "./BeachScene.css";

const COCKTAIL_TOP = 189;
const COCKTAIL_BOTTOM = 212;
const COCKTAIL_SPAN = COCKTAIL_BOTTOM - COCKTAIL_TOP;

const SUN_START_X = 48;
const SUN_END_X = 156;
const SUN_START_Y = 44;
const SUN_END_Y = 128;

const SUN_RAYS = [0, 45, 90, 135, 180, 225, 270, 315];

const BIG_FISH = {x: 128, y: 176, scale: 0.9};

/** Where the small fish leaves the water before it beaches itself. */
const FLOP_START = {x: 88, y: 182};

/** Sand area the small fish may land on, clear of the cocktail glass. */
const FLOP_AREA = {minX: 92, maxX: 150, minY: 205, maxY: 220};

/** Milliseconds each stage of the beaching sequence lasts. */
const FLOP_TIMING = {hidden: 0, out: 900, flop: 2800, back: 900};

type FlopStage = "hidden" | "out" | "flop" | "back";

const NEXT_STAGE: Record<FlopStage, FlopStage> = {
    hidden: "out",
    out: "flop",
    flop: "back",
    back: "hidden",
};

function randomLandingSpot() {
    return {
        x: FLOP_AREA.minX + Math.random() * (FLOP_AREA.maxX - FLOP_AREA.minX),
        y: FLOP_AREA.minY + Math.random() * (FLOP_AREA.maxY - FLOP_AREA.minY),
    };
}

const WAVES = [
    {d: "M62 178 q9 -5 18 0 t18 0", delay: 0},
    {d: "M110 186 q8 -4 16 0 t16 0", delay: 1.2},
    {d: "M74 192 q7 -4 14 0 t14 0", delay: 2.1},
];

type BeachSceneProps = {
    /** Timer is paused: even the lagoon dozes off. */
    paused?: boolean;
    /** 0 = break just started (sun high, glass full), 1 = break over. */
    progress: number;
    /** Fish only jump while the timer actually runs. */
    running: boolean;
    /** Long breaks get the bigger sun and a second fish. */
    long: boolean;
};

function BeachScene({progress, running, long, paused = false}: BeachSceneProps) {
    const [flopStage, setFlopStage] = useState<FlopStage>("hidden");
    const [landing, setLanding] = useState(randomLandingSpot);

    // A paused timer puts the fish back in the water without resetting the
    // stored stage, so the sequence continues where it left off.
    const stage: FlopStage = running ? flopStage : "hidden";

    // The small fish runs its own little sequence: it waits under water for a
    // random while, beaches itself somewhere on the sand, flops around and
    // then jumps back in.
    useEffect(() => {
        if (!running) {
            return;
        }

        const delay = stage === "hidden" ? 4000 + Math.random() * 7000 : FLOP_TIMING[stage];
        const id = window.setTimeout(() => {
            if (stage === "hidden") {
                setLanding(randomLandingSpot());
            }
            setFlopStage(NEXT_STAGE[stage]);
        }, delay);

        return () => window.clearTimeout(id);
    }, [stage, running]);

    const clamped = Math.min(1, Math.max(0, progress));

    // The sun sinks towards the water while the break runs down, so the
    // remaining time stays readable without looking at the clock.
    const sunX = SUN_START_X + clamped * (SUN_END_X - SUN_START_X);
    const sunY = SUN_START_Y + clamped * (SUN_END_Y - SUN_START_Y);
    const sunRadius = long ? 21 : 17;

    // Same trick as the tomato: translate the liquid instead of resizing it,
    // because CSS transforms animate reliably in every webview.
    const drinkOffset = clamped * COCKTAIL_SPAN;

    return (
        <div className={`beach${running ? " beach--running" : ""}`} aria-hidden="true">
            <svg
                className="beach__svg"
                viewBox="0 0 200 250"
                role="img"
                aria-label={`Break ${Math.round(clamped * 100)} percent over`}
            >
                <defs>
                    <radialGradient id="beach-sun" cx="40%" cy="35%" r="70%">
                        <stop offset="0%" stopColor="#fffbeb" />
                        <stop offset="55%" stopColor="#fde047" />
                        <stop offset="100%" stopColor="#fb923c" />
                    </radialGradient>
                    <radialGradient id="beach-sand" cx="45%" cy="25%" r="80%">
                        <stop offset="0%" stopColor="#f6dda9" />
                        <stop offset="100%" stopColor="#d8ad6b" />
                    </radialGradient>
                    <radialGradient id="beach-water" cx="45%" cy="25%" r="80%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#0369a1" />
                    </radialGradient>
                    <clipPath id="beach-water-clip">
                        <ellipse cx="100" cy="184" rx="62" ry="16" />
                    </clipPath>
                    <clipPath id="beach-drink">
                        <path d="M35 189 L75 189 L55 212 Z" />
                    </clipPath>
                </defs>

                <g className="beach__sky">
                    <g
                        className="beach__sun-group"
                        style={{transform: `translate(${sunX}px, ${sunY}px)`}}
                    >
                        <g className="beach__rays">
                            {SUN_RAYS.map((angle) => (
                                <line
                                    key={angle}
                                    x1="0"
                                    y1={-(sunRadius + 6)}
                                    x2="0"
                                    y2={-(sunRadius + 13)}
                                    transform={`rotate(${angle})`}
                                />
                            ))}
                        </g>
                        <circle className="beach__sun" r={sunRadius} />
                        <circle className="beach__sun-glow" r={sunRadius + 13} />
                    </g>

                    <g className="beach__bird beach__bird--a">
                        <path d="M0 0 q5 -5 10 0 q5 -5 10 0" />
                    </g>
                    <g className="beach__bird beach__bird--b">
                        <path d="M0 0 q3.5 -3.5 7 0 q3.5 -3.5 7 0" />
                    </g>
                </g>

                <g className="beach__island">
                    <ellipse className="beach__sand" cx="100" cy="200" rx="86" ry="34" />
                    <ellipse className="beach__sand-rim" cx="100" cy="200" rx="86" ry="34" />
                </g>

                <g className="beach__lagoon">
                    <ellipse className="beach__water" cx="100" cy="184" rx="62" ry="16" />
                    <g clipPath="url(#beach-water-clip)">
                        <g className="beach__waves">
                            {WAVES.map((wave) => (
                                <path
                                    key={wave.d}
                                    className="beach__wave"
                                    style={{animationDelay: `${wave.delay}s`}}
                                    d={wave.d}
                                />
                            ))}
                        </g>
                    </g>
                    <ellipse className="beach__water-rim" cx="100" cy="184" rx="62" ry="16" />
                </g>

                {paused && <SnoozeZs x={140} y={176} />}

                <g className="beach__fish">
                    <g
                        className="beach__fish-jump"
                        style={{transformOrigin: `${BIG_FISH.x}px ${BIG_FISH.y}px`}}
                    >
                        <g
                            transform={`translate(${BIG_FISH.x} ${BIG_FISH.y}) scale(${BIG_FISH.scale})`}
                        >
                            <Fish />
                        </g>
                    </g>

                    <g
                        className={`beach__flopper beach__flopper--${stage}`}
                        style={{
                            transformOrigin: `${FLOP_START.x}px ${FLOP_START.y}px`,
                            ["--flop-x" as string]: `${landing.x - FLOP_START.x}px`,
                            ["--flop-y" as string]: `${landing.y - FLOP_START.y}px`,
                        }}
                    >
                        <g
                            transform={`translate(${FLOP_START.x} ${FLOP_START.y}) scale(-0.62 0.62)`}
                        >
                            <Fish />
                        </g>
                    </g>
                </g>

                <g className="beach__cocktail" transform="translate(-6 -14)">
                    <ellipse className="beach__glass-shadow" cx="55" cy="236" rx="20" ry="4" />

                    <path className="beach__glass-body" d="M32 186 L78 186 L55 214 Z" />

                    <g clipPath="url(#beach-drink)">
                        <g
                            className="beach__drink"
                            style={{transform: `translateY(${drinkOffset}px)`}}
                        >
                            <path d="M35 189 L75 189 L55 212 Z" />
                            <rect x="35" y={COCKTAIL_TOP} width="40" height="3" />
                        </g>
                    </g>

                    <path className="beach__glass-outline" d="M32 186 L78 186 L55 214 Z" />
                    <line className="beach__glass-outline" x1="55" y1="214" x2="55" y2="232" />
                    <line className="beach__glass-outline" x1="43" y1="233" x2="67" y2="233" />

                    <line className="beach__straw" x1="50" y1="205" x2="84" y2="172" />

                    <g className="beach__lemon" transform="translate(76 185)">
                        <circle r="7" />
                        <path className="beach__lemon-peel" d="M-7 0 A7 7 0 0 1 7 0 Z" />
                    </g>

                    <g className="beach__umbrella" transform="translate(38 172)">
                        <line className="beach__umbrella-stick" x1="0" y1="0" x2="6" y2="18" />
                        <path d="M-9 0 Q-4 -8 0 0 Q4 -8 9 0 Z" />
                    </g>
                </g>

                <g className="beach__starfish" transform="translate(146 212)">
                    {[0, 72, 144, 216, 288].map((angle) => (
                        <ellipse
                            key={angle}
                            cx="0"
                            cy="-6"
                            rx="3"
                            ry="6.5"
                            transform={`rotate(${angle})`}
                        />
                    ))}
                </g>

                <g className="beach__shells">
                    <ellipse cx="122" cy="224" rx="4.5" ry="3.2" />
                    <ellipse cx="163" cy="196" rx="3.4" ry="2.4" />
                </g>
            </svg>
        </div>
    );
}

function Fish() {
    return (
        <>
            <path className="beach__fish-body" d="M0 0 C7 -8 21 -8 28 0 C21 8 7 8 0 0 Z" />
            <path className="beach__fish-tail" d="M0 0 L-10 -7 L-10 7 Z" />
            <path className="beach__fish-fin" d="M13 -5 L18 -12 L21 -5 Z" />
            <circle className="beach__fish-eye" cx="21" cy="-2" r="1.8" />
        </>
    );
}

export default BeachScene;
