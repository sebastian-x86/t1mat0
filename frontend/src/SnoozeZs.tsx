/**
 * Floating "z" letters for the paused state. They drift up and away from a
 * given point inside the scene, which makes a stopped timer readable at a
 * glance: the tomato dozes off, the lagoon snores.
 */

type Props = {
    /** Origin inside the 200x250 scene viewBox. */
    x: number;
    y: number;
};

const ZS = [0, 1, 2];

export default function SnoozeZs({x, y}: Props) {
    return (
        <g className="snooze" transform={`translate(${x} ${y})`}>
            {ZS.map((index) => (
                <text key={index} className={`snooze__z snooze__z--${index}`} x="0" y="0">
                    z
                </text>
            ))}
        </g>
    );
}
