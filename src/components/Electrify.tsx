import type { CSSProperties } from 'react';

type Spark = {
  /** Where the spark is struck, as a percentage across the button. */
  x: number;
  /** Offset from the top edge in px — a couple sit just inside the rim. */
  y: number;
  /** Where it has drifted to by the end of its life, in px. */
  dx: number;
  dy: number;
  size: number;
  /** Seconds for one flight; the loop restarts immediately after. */
  duration: number;
  delay: number;
};

/**
 * Struck along the top edge and thrown upward, rather than rising through the
 * button: a 3px white dot is invisible against the amber-to-magenta face, and
 * only reads once it is clear of it.
 *
 * Fixed rather than random, so a re-render can't re-scatter the shower, and
 * the staggered delays are what keep the loop continuous instead of arriving
 * in visible waves.
 */
const SPARKS: Spark[] = [
  { x: 5, y: 2, dx: -13, dy: -44, size: 3, duration: 2.4, delay: 0 },
  { x: 13, y: 0, dx: 5, dy: -34, size: 2, duration: 2.1, delay: 2.4 },
  { x: 21, y: 3, dx: 9, dy: -62, size: 3, duration: 2.9, delay: 0.7 },
  { x: 29, y: 1, dx: -11, dy: -38, size: 2, duration: 2.2, delay: 1.5 },
  { x: 38, y: 2, dx: 15, dy: -70, size: 4, duration: 3.2, delay: 0.3 },
  { x: 46, y: 0, dx: -7, dy: -46, size: 2, duration: 2.6, delay: 1.9 },
  { x: 54, y: 3, dx: 13, dy: -54, size: 3, duration: 2.8, delay: 1.1 },
  { x: 61, y: 1, dx: -9, dy: -36, size: 2, duration: 2, delay: 1.7 },
  { x: 69, y: 2, dx: -17, dy: -42, size: 3, duration: 2.3, delay: 0.5 },
  { x: 77, y: 0, dx: 7, dy: -66, size: 2, duration: 3, delay: 2.1 },
  { x: 85, y: 3, dx: -12, dy: -50, size: 3, duration: 2.5, delay: 1.3 },
  { x: 93, y: 1, dx: 11, dy: -58, size: 2, duration: 2.7, delay: 0.9 },
];

/**
 * An endless shower of sparks off the button it sits in. Purely decorative:
 * hidden from assistive tech, never takes a tap, and stood down entirely
 * under `prefers-reduced-motion`.
 *
 * Drop it inside any `position: relative` element; the host needs
 * `overflow: visible` for sparks to clear its edges.
 */
export default function Electrify() {
  return (
    <span className="electrify" aria-hidden="true">
      {SPARKS.map((spark) => (
        <i
          key={spark.x}
          className="spark"
          style={
            {
              left: `${spark.x}%`,
              '--y': `${spark.y}px`,
              '--dx': `${spark.dx}px`,
              '--dy': `${spark.dy}px`,
              '--size': `${spark.size}px`,
              '--dur': `${spark.duration}s`,
              '--delay': `${spark.delay}s`,
            } as CSSProperties
          }
        />
      ))}
    </span>
  );
}
