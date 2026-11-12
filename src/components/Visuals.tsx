import { useId, useMemo } from "react";
import { portraitPaths } from "../lib/portrait";
import { pixelScene, sceneDataUrl } from "../lib/pixel-art";
import worldPath from "../data/world-path.json";
import worldCoords from "../data/world-coords.json";
import type { Life } from "../game/types";
export function Portrait({
  seed = 1,
  age = 20,
  sex = "M",
  paths: drawn,
}: {
  seed?: number;
  age?: number;
  sex?: string;
  paths?: { color: string; d: string }[];
}) {
  const computed = useMemo(() => drawn ? null : portraitPaths({ seed, age, sex }), [drawn, seed, age, sex]);
  const paths = drawn ?? computed ?? [];
  return (
    <svg className="portrait" viewBox="0 0 40 48" shapeRendering="crispEdges" aria-hidden="true">
      {paths.map((p) => (
        <path key={p.color} fill={p.color} d={p.d} />
      ))}
    </svg>
  );
}
export function WorldMap({
  players = [],
}: {
  players?: { country: string; count: number }[];
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg
      className="world-map"
      viewBox="0 0 720 350"
      role="img"
      aria-label="World map"
    >
      <defs>
        <pattern id={id} width="7" height="7" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1.5" fill="currentColor" />
        </pattern>
      </defs>
      <g fill={`url(#${id})`}>
        <path d={worldPath} />
      </g>
      <g fill="#8c1d3c">
        {players.map((p) => {
          const point = (worldCoords as Record<string, number[]>)[p.country];
          return point ? (
            <circle
              key={p.country}
              cx={point[0]}
              cy={point[1]}
              r={Math.min(22, 4 + Math.sqrt(p.count) * 2)}
              opacity=".8"
            >
              <title>
                {p.country}: {p.count}
              </title>
            </circle>
          ) : null;
        })}
      </g>
    </svg>
  );
}
export function Scene({ life, label }: { life: Life; label: string }) {
  // The game re-renders several times a second; only redraw when something the scene shows changes.
  const partner = life.family.partner;
  const src = useMemo(
    () => sceneDataUrl(pixelScene(life)),
    [life.seed, life.age, life.alive, life.residence, life.stats.job, life.pendingDecision?.key, partner?.id, partner?.deathAge, life.family.marriageAge, life.family.children.length, life.family.children.filter((c) => c.alive).length, life.pets.filter((p) => p.alive).map((p) => p.kind).join(), life.descendants?.grandchildren.length],
  );
  return <img className="life-scene" src={src} alt={label} width={960} height={540} />;
}
export function LineChart({
  values,
  secondaryValues,
  age,
  label,
  color = "#0f6e68",
  secondaryColor = "var(--ink-muted, #7c7668)",
  primaryLabel,
  secondaryLabel,
}: {
  values: number[];
  secondaryValues?: number[];
  age?: number;
  label: string;
  color?: string;
  secondaryColor?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
}) {
  const maxLen = Math.max(1, values.length - 1);
  const points = values
    .map(
      (v, i) =>
        `${25 + (i * 250) / maxLen},${115 - Math.min(100, Math.max(0, v))}`,
    )
    .join(" ");

  const secondaryPoints = secondaryValues
    ? secondaryValues
        .map(
          (v, i) =>
            `${25 + (i * 250) / Math.max(1, secondaryValues.length - 1)},${115 - Math.min(100, Math.max(0, v))}`,
        )
        .join(" ")
    : null;

  const currentAgeIdx = age !== undefined ? Math.min(age, values.length - 1) : undefined;
  const currentX = currentAgeIdx !== undefined ? 25 + (currentAgeIdx * 250) / maxLen : null;
  const currentY = currentAgeIdx !== undefined ? 115 - Math.min(100, Math.max(0, values[currentAgeIdx])) : null;

  return (
    <div className="line-chart-wrap">
      <svg
        className="line-chart"
        viewBox="0 0 290 145"
        role="img"
        aria-label={label}
      >
        <g stroke="currentColor" opacity=".12">
          {[15, 40, 65, 90, 115].map((y) => (
            <path key={y} d={`M25 ${y}H280`} />
          ))}
        </g>
        {secondaryPoints && (
          <polyline
            points={secondaryPoints}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.75"
            strokeDasharray="4 3"
            opacity=".7"
          />
        )}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.2" />
        {currentX !== null && (
          <>
            <path
              d={`M${currentX} 15V115`}
              stroke="#8c1d3c"
              strokeDasharray="3 3"
              strokeWidth="1.5"
            />
            {currentY !== null && (
              <circle cx={currentX} cy={currentY} r="3.5" fill="#8c1d3c" />
            )}
          </>
        )}
        <g fill="currentColor" fontSize="9" opacity=".7">
          <text x="0" y="19">100%</text>
          <text x="6" y="69">50%</text>
          <text x="12" y="118">0%</text>
          <text x="25" y="135">0</text>
          <text x="140" y="135" textAnchor="middle">{Math.round((values.length - 1) / 2)}</text>
          <text x="275" y="135" textAnchor="end">{Math.max(0, values.length - 1)}</text>
        </g>
      </svg>
      {(primaryLabel || secondaryLabel) && (
        <div className="chart-legend" aria-hidden="true">
          {primaryLabel && (
            <span>
              <i style={{ background: color }} />
              {primaryLabel}
            </span>
          )}
          {secondaryLabel && (
            <span>
              <i style={{ background: secondaryColor, borderTop: "2px dashed currentColor" }} />
              {secondaryLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
