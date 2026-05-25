import type { TraitAxis } from "@prisma/client";
import type { TraitView } from "@/lib/retention/queries";

type Props = {
  traits: TraitView[];
};

const AXIS_ORDER: TraitAxis[] = [
  "DISCIPLINE",
  "AUDACITY",
  "RECOVERY",
  "FOCUS",
  "CRAFT",
];

const AXIS_LABEL: Record<TraitAxis, string> = {
  DISCIPLINE: "Discipline",
  AUDACITY: "Audacity",
  RECOVERY: "Recovery",
  FOCUS: "Focus",
  CRAFT: "Craft",
};

const SIZE = 280;
const CENTER = SIZE / 2;
const OUTER_RADIUS = 96;
const LABEL_RADIUS = OUTER_RADIUS + 22;

function angleFor(index: number): number {
  // index 0 at top, then clockwise
  return -Math.PI / 2 + (index * 2 * Math.PI) / AXIS_ORDER.length;
}

function pointAt(index: number, radius: number): [number, number] {
  const a = angleFor(index);
  return [CENTER + radius * Math.cos(a), CENTER + radius * Math.sin(a)];
}

function polygonFromRadii(radii: number[]): string {
  return radii
    .map((r, i) => {
      const [x, y] = pointAt(i, r);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function TraitRadar({ traits }: Props) {
  const byAxis = new Map(traits.map((t) => [t.axis, t]));
  const maxLevel = Math.max(3, ...traits.map((t) => t.level + 1));

  // Concentric guide pentagons at levels 1..maxLevel
  const rings = Array.from({ length: maxLevel }, (_, i) => {
    const ringLevel = i + 1;
    const r = (ringLevel / maxLevel) * OUTER_RADIUS;
    return polygonFromRadii(AXIS_ORDER.map(() => r));
  });

  // User polygon — value is interpolated within current level
  const userRadii = AXIS_ORDER.map((axis) => {
    const t = byAxis.get(axis);
    if (!t) return 0;
    const fractional = t.level + (t.toNext > 0 ? t.intoLevel / (t.intoLevel + t.toNext) : 0);
    return (fractional / maxLevel) * OUTER_RADIUS;
  });
  const userPoly = polygonFromRadii(userRadii);

  return (
    <svg
      role="img"
      aria-label="Trait radar"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="w-full max-w-[280px]"
    >
      {/* Guide rings */}
      {rings.map((points, i) => (
        <polygon
          key={i}
          points={points}
          fill="none"
          stroke="var(--line)"
          strokeWidth={i === rings.length - 1 ? 1.5 : 1}
        />
      ))}

      {/* Axis spokes */}
      {AXIS_ORDER.map((axis, i) => {
        const [x, y] = pointAt(i, OUTER_RADIUS);
        return (
          <line
            key={axis}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke="var(--line-soft)"
            strokeWidth={1}
          />
        );
      })}

      {/* User polygon */}
      <polygon
        points={userPoly}
        fill="var(--accent)"
        fillOpacity={0.2}
        stroke="var(--accent)"
        strokeWidth={1.5}
      />

      {/* Vertex dots */}
      {AXIS_ORDER.map((axis, i) => {
        const t = byAxis.get(axis);
        if (!t || t.value === 0) return null;
        const [x, y] = pointAt(i, userRadii[i]);
        return (
          <circle
            key={axis}
            cx={x}
            cy={y}
            r={3}
            fill="var(--accent-strong)"
          />
        );
      })}

      {/* Axis labels */}
      {AXIS_ORDER.map((axis, i) => {
        const [x, y] = pointAt(i, LABEL_RADIUS);
        const t = byAxis.get(axis);
        return (
          <g key={axis}>
            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ink"
              style={{ fontSize: 11, fontWeight: 500 }}
            >
              {AXIS_LABEL[axis]}
            </text>
            <text
              x={x}
              y={y + 12}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-ink-muted"
              style={{ fontSize: 10, fontVariantNumeric: "tabular-nums" }}
            >
              lvl {t?.level ?? 0}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
