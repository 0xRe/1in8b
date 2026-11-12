import { useEffect, useRef, useState } from "react";
import type { Life } from "../game/types";
import { getHealthSummary, treatmentCost } from "../game/engine";
import type { Locale, translator } from "../lib/i18n";
import { pixelScene, sceneDataUrl } from "../lib/pixel-art";

type T = ReturnType<typeof translator>;

function drawEcg(ctx: CanvasRenderingContext2D, width: number, height: number, offset: number) {
  ctx.fillStyle = "#0c1512";
  ctx.fillRect(0, 0, width, height);

  // Background grid
  ctx.strokeStyle = "#172922";
  ctx.lineWidth = 1;
  const gridSize = 16;
  ctx.beginPath();
  for (let x = 0; x < width; x += gridSize) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();

  // ECG trace
  ctx.strokeStyle = "#4ade80";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#4ade80";
  ctx.shadowBlur = 4;
  ctx.beginPath();

  const mid = height / 2;
  const cycle = 120;

  for (let x = 0; x < width; x++) {
    const pos = (x + offset) % cycle;
    let y = mid;
    if (pos > 20 && pos < 35) {
      // P wave
      y = mid - Math.sin(((pos - 20) / 15) * Math.PI) * (height * 0.12);
    } else if (pos >= 45 && pos < 50) {
      // Q drop
      y = mid + (pos - 45) * 2;
    } else if (pos >= 50 && pos < 55) {
      // R peak
      y = mid - height * 0.42;
    } else if (pos >= 55 && pos < 60) {
      // S dip
      y = mid + height * 0.18;
    } else if (pos >= 70 && pos < 95) {
      // T wave
      y = mid - Math.sin(((pos - 70) / 25) * Math.PI) * (height * 0.18);
    }

    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

export function Healthcare({
  life,
  t,
  decision = false,
}: {
  life: Life;
  t: T;
  locale?: Locale;
  decision?: boolean;
}) {
  const summary = getHealthSummary(life);
  const [frame, setFrame] = useState(0);
  const ecgOffset = 0;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!decision || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setFrame((n) => (n + 1) % 3), 450);
    return () => clearInterval(id);
  }, [decision]);

  useEffect(() => {
    if (!decision || !summary.active || (summary.active.level !== "icu" && summary.active.level !== "neonatal")) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      drawEcg(ctx, canvas.width, canvas.height, 0);
      return;
    }

    let animId: number;
    let currentOffset = ecgOffset;
    const render = () => {
      currentOffset = (currentOffset + 2) % 1200;
      drawEcg(ctx, canvas.width, canvas.height, currentOffset);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [decision, summary.active]);

  if (!summary.active && !summary.recovering.length && !summary.conditions.length) return null;
  const episode = summary.active ?? summary.recovering[0];
  const isCritical = episode?.level === "icu" || episode?.level === "neonatal";

  const totalCost = episode ? treatmentCost(life, episode, "intensiveCare") : 0;
  const oopCost = episode ? treatmentCost(life, episode, "localCare") : 0;
  const insuranceCovered = Math.max(0, totalCost - oopCost);

  const bpm = 70 + (Math.abs(life.seed + life.age * 3) % 18);
  const sysBp = 115 + (Math.abs(life.seed + life.age) % 15);
  const diaBp = 72 + (Math.abs(life.seed + life.age * 2) % 10);
  const spo2 = 97 + (Math.abs(life.seed) % 3);

  return (
    <section className={`healthcare ${decision ? "" : "panel"}`}>
      {decision && (
        <img
          className="care-scene"
          src={sceneDataUrl(pixelScene(life, undefined, "hospital", frame / 3))}
          alt={t("feature.hospitalAlt")}
        />
      )}

      {decision && isCritical && (
        <div className="icu-monitor-card" role="region" aria-label={t("health.icuMonitor")}>
          <div className="icu-monitor-header">
            <span className="icu-tag">
              {episode?.level === "icu" ? t("health.level.icu") : t("health.level.neonatal")}
            </span>
            <span className="icu-title">{t("health.icuMonitor")}</span>
          </div>

          <canvas
            ref={canvasRef}
            width={320}
            height={90}
            className="icu-waveform-canvas"
            aria-hidden="true"
          />

          <div className="icu-vitals-row">
            <div className="icu-vital">
              <span className="vital-label">{t("health.bpm")}</span>
              <span className="vital-value heart-rate">{bpm}</span>
            </div>
            <div className="icu-vital">
              <span className="vital-label">{t("health.bp")}</span>
              <span className="vital-value bp">
                {sysBp}/{diaBp}
              </span>
            </div>
            <div className="icu-vital">
              <span className="vital-label">{t("health.spo2")}</span>
              <span className="vital-value spo2">{spo2}%</span>
            </div>
          </div>

          {totalCost > 0 && (
            <div className="icu-costs-breakdown">
              <small>
                {t("health.costEst", { amount: t.money(totalCost) })}
              </small>
              <small>
                {t("health.insurancePaid", { amount: t.money(insuranceCovered) })}
              </small>
              <small className="patient-oop">
                {t("health.patientOop", { amount: t.money(oopCost) })}
              </small>
            </div>
          )}
        </div>
      )}

      <p className="eyebrow">
        {episode?.level === "icu"
          ? t("health.level.icu")
          : episode?.level === "neonatal"
          ? t("health.level.neonatal")
          : t("feature.healthRecovery")}
      </p>

      {episode && (
        <p>
          <strong>{episode.patientName}</strong> · {t(`health.diagnosis.${episode.diagnosis}`)}
        </p>
      )}

      {summary.recovering.map((e) => (
        <p key={e.id} className="muted">
          {t("feature.recovering", { name: e.patientName })}
        </p>
      ))}

      {summary.conditions.length > 0 && (
        <p>
          {t("feature.ongoingCare", {
            conditions: summary.conditions
              .map((c) => t(`health.condition.${c.diagnosis}`))
              .join(", "),
          })}
        </p>
      )}

      <small>
        {t("feature.treatmentPaid", {
          amount: t.money(summary.totalOutOfPocket),
        })}
      </small>
    </section>
  );
}
