import { useEffect, useState } from 'react';
import { calmMusic } from '../lib/calm-music';
import type { translator } from '../lib/i18n';

type T = ReturnType<typeof translator>;

export function CalmMusicButton({
  t,
  className = "ghost musicbtn",
}: {
  t: T;
  className?: string;
}) {
  const [playing, setPlaying] = useState(calmMusic.isPlaying());

  useEffect(() => {
    return calmMusic.subscribe(setPlaying);
  }, []);

  return (
    <button
      type="button"
      className={className}
      aria-pressed={playing}
      data-music={playing ? "1" : "0"}
      onClick={() => calmMusic.toggle()}
      title={playing ? t("feature.pauseCalmMusic") : t("feature.calmMusic")}
    >
      {playing ? `♪ ${t("feature.pauseCalmMusic")}` : `♪ ${t("feature.calmMusic")}`}
    </button>
  );
}
