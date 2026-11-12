import { useEffect, useMemo, useRef, useState } from "react";
import type { GameEvent, Life } from "../game/types";
import { countryName } from "../game/countries";
import type { Locale, translator } from "../lib/i18n";
import { drawPixelScene, pixelScene, sceneDataUrl } from "../lib/pixel-art";
import { canvasBlob, downloadBlob } from "../lib/life-media";
import { Grid, Image as ImageIcon, Camera, Printer, X, ChevronLeft, ChevronRight } from "lucide-react";

type T = ReturnType<typeof translator>;

export function getTenMilestoneEvents(life: Life): GameEvent[] {
  const substantive = life.events.filter(
    (e) => !e.key.startsWith("decision.") && !e.key.startsWith("choice.") && e.kind !== "everyday"
  );
  if (substantive.length >= 10) {
    const step = (substantive.length - 1) / 9;
    return Array.from({ length: 10 }, (_, i) => substantive[Math.round(i * step)]);
  }
  // Fill milestones
  const ages = [0, 5, 8, 16, 21, 28, 40, 54, 70, life.age].map((a) =>
    Math.min(life.age, a)
  );
  return ages.map((age, idx) => {
    const existing = life.events.find((e) => e.age === age);
    if (existing) return existing;
    return {
      id: `milestone-${idx}-${age}`,
      age,
      year: life.birthYear + age,
      kind: age === 0 ? "milestone" : "family",
      icon: age === 0 ? "🌱" : "★",
      key: age === 0 ? "event.birth" : age === life.age ? "event.end" : "event.play",
      params: { name: life.name },
    };
  });
}

export function PhotoCarousel({
  life,
  locale,
  t,
  onClose,
}: {
  life: Life;
  locale: Locale;
  t: T;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"slideshow" | "wall">("wall");
  const [downloading, setDownloading] = useState(false);
  const photos = useMemo(() => getTenMilestoneEvents(life), [life]);
  const current = photos[index] ?? photos[0];
  const dialogRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIndex((i) => (i > 0 ? i - 1 : photos.length - 1));
      else if (e.key === "ArrowRight") setIndex((i) => (i < photos.length - 1 ? i + 1 : 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, photos.length]);

  const savePhoto = async (photoIndex: number) => {
    const target = photos[photoIndex];
    if (!target) return;
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1080;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#edf0e7";
    ctx.fillRect(0, 0, 1080, 1080);
    drawPixelScene(ctx, pixelScene(life, target), 54, 54, 972, 729);
    ctx.fillStyle = "#213c36";
    ctx.font = "bold 38px Georgia, serif";
    ctx.fillText(`${life.name} · ${t("age")} ${target.age} (${target.year})`, 54, 840);
    ctx.fillStyle = "#655f56";
    ctx.font = "26px sans-serif";
    const caption = t(target.key, target.params);
    ctx.fillText(caption.slice(0, 75), 54, 890);
    ctx.font = "20px monospace";
    ctx.fillText(`1in8bn.com · ${countryName(life.migration.birthCountry, locale)}`, 54, 960);
    const blob = await canvasBlob(canvas);
    downloadBlob(blob, `${life.name.replace(/\s+/g, "_")}-photo-${photoIndex + 1}.png`);
  };

  const downloadPhotoWall = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Warm background
    const grad = ctx.createLinearGradient(0, 0, 0, 800);
    grad.addColorStop(0, "#f8fafc");
    grad.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1200, 800);

    // Header
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 26px Georgia, serif";
    ctx.fillText(`${t("ui.photoWallTitle")} · ${life.name}`, 40, 50);

    ctx.fillStyle = "#64748b";
    ctx.font = "14px system-ui, sans-serif";
    ctx.fillText(
      `${countryName(life.country, locale)} · ${life.birthYear} – ${life.year} (age ${life.age}) · 1in8bn.com`,
      40,
      80
    );

    // Render 6 chosen photos in 2 rows of 3
    const wallPhotos = photos.slice(0, 6);
    const cardW = 340;
    const cardH = 300;
    const startX = 40;
    const startY = 110;

    wallPhotos.forEach((item, idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const x = startX + col * (cardW + 40);
      const y = startY + row * (cardH + 30);

      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.08)";
      ctx.shadowBlur = 10;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.shadowBlur = 0;

      // Draw pixel scene
      drawPixelScene(ctx, pixelScene(life, item), x + 12, y + 12, cardW - 24, 210);

      // Caption
      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(`${t("age")} ${item.age} (${item.year})`, x + 14, y + 245);

      ctx.fillStyle = "#64748b";
      ctx.font = "12px system-ui, sans-serif";
      const cap = t(item.key, item.params);
      ctx.fillText(cap.slice(0, 42), x + 14, y + 270);
    });

    const blob = await canvasBlob(canvas);
    downloadBlob(blob, `${life.name.replace(/\s+/g, "_")}-photo-wall.png`);
  };

  const downloadAll = async () => {
    setDownloading(true);
    try {
      for (let i = 0; i < photos.length; i++) {
        if (!isMountedRef.current) break;
        await savePhoto(i);
        await new Promise((r) => setTimeout(r, 200));
      }
    } finally {
      if (isMountedRef.current) setDownloading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("record.carouselTitle")}
      ref={dialogRef}
    >
      <div className="photo-carousel-modal">
        <div className="photo-carousel-header">
          <div>
            <h3>{t("record.carouselTitle")}</h3>
            <span className="photo-counter">
              {viewMode === "slideshow"
                ? t("record.carouselCounter", { current: index + 1, total: photos.length })
                : t("ui.photoWallCount", { n: photos.length })}
            </span>
          </div>

          <div className="photo-header-controls">
            <button
              type="button"
              className={`ghost sm ${viewMode === "wall" ? "active" : ""}`}
              onClick={() => setViewMode(viewMode === "wall" ? "slideshow" : "wall")}
              title={viewMode === "wall" ? t("ui.slideshowView") : t("ui.photoWallView")}
            >
              {viewMode === "wall" ? <ImageIcon size={15} /> : <Grid size={15} />}
              <span>{viewMode === "wall" ? t("ui.slideshowView") : t("ui.photoWallView")}</span>
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label={t("record.closeModal")}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {viewMode === "wall" ? (
          <div className="photo-wall-container" id="photoWall">
            <div className="photo-wall-grid">
              {photos.map((item, idx) => (
                <div
                  key={item.id}
                  className={`photo-wall-card ${idx === index ? "selected" : ""}`}
                  onClick={() => {
                    setIndex(idx);
                    setViewMode("slideshow");
                  }}
                >
                  <img
                    src={sceneDataUrl(pixelScene(life, item))}
                    alt={t(item.key, item.params)}
                    className="photo-wall-thumb"
                  />
                  <div className="photo-wall-meta">
                    <span className="photo-wall-age">
                      {t("age")} {item.age} · {item.year}
                    </span>
                    <p className="photo-wall-cap">{t(item.key, item.params)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="photo-carousel-actions">
              <button
                type="button"
                className="cta"
                id="photoPrint"
                onClick={() => void downloadPhotoWall()}
              >
                <Printer size={15} />
                <span>{t("ui.photoPrint")}</span>
              </button>
              <button
                type="button"
                className="ghost sm"
                id="photoPng"
                onClick={() => void savePhoto(index)}
              >
                <Camera size={15} />
                <span>{t("ui.photoPng")}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="photo-carousel-body">
              <button
                type="button"
                className="nav-arrow prev"
                onClick={() => setIndex((i) => (i > 0 ? i - 1 : photos.length - 1))}
                aria-label={t("back")}
              >
                <ChevronLeft size={20} />
              </button>
              <div className="photo-display">
                <img
                  src={sceneDataUrl(pixelScene(life, current))}
                  alt={t(current.key, current.params)}
                  className="photo-image"
                />
                <div className="photo-caption-bar">
                  <span className="photo-age">
                    {t("age")} {current.age} · {current.year}
                  </span>
                  <p className="photo-caption">{t(current.key, current.params)}</p>
                </div>
              </div>
              <button
                type="button"
                className="nav-arrow next"
                onClick={() => setIndex((i) => (i < photos.length - 1 ? i + 1 : 0))}
                aria-label={t("continue")}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="photo-carousel-actions">
              <button
                type="button"
                className="secondary"
                id="photoPng"
                onClick={() => void savePhoto(index)}
              >
                <Camera size={14} />
                <span>{t("record.saveThisPhoto")}</span>
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => void downloadAll()}
                disabled={downloading}
              >
                {t("record.downloadAllPhotos")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
