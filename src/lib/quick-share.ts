import type { GameEvent, Life } from '../game/types';
import type { Locale, translator } from './i18n';
import { canvasBlob, drawLifeCard, mediaCanvas } from './life-media';
import { lifeShareUrl } from './life-share';
import { birthInvitationUrl } from './social-sharing';
import { lifePost } from './viral-copy';
import { momentPost } from './share-story';

export type QuickShare = { lifeId: string; locale: Locale; file: File | null; title: string; text: string; url: string };

/**
 * Prepares the finished life's card ahead of the tap, so phones can open the share sheet in the
 * same gesture (share() needs the click's activation; drawing the card first would lose it).
 * Where file sharing is supported, it includes the image file; where only text/link sharing is supported,
 * it returns a link-ready QuickShare without forcing the slow modal dialog.
 */
export async function prepareQuickShare(life: Life, locale: Locale, t: ReturnType<typeof translator>, browser: { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean } = navigator): Promise<QuickShare | null> {
  if (life.alive || (!browser.share && !browser.canShare)) return null;
  const url = lifeShareUrl(birthInvitationUrl(locale, (life.migration?.birthCountry ?? life.country).id), life);
  const title = life.name;
  const text = lifePost(life, locale, t);

  let file: File | null = null;
  if (browser.canShare) {
    try {
      await document.fonts?.ready;
      const canvas = mediaCanvas(1080, 1350);
      drawLifeCard(canvas, life, locale, t);
      const generated = new File([await canvasBlob(canvas)], `${life.id}-life.png`, { type: 'image/png' });
      if (browser.canShare({ files: [generated] })) {
        file = generated;
      }
    } catch {
      // If canvas generation fails, file remains null and quick-share continues via link
    }
  }
  return { lifeId: life.id, locale, file, title, text, url };
}

/**
 * A recorded moment's card for the same one-tap path. Where file sharing is supported,
 * it includes the moment's image; otherwise it falls back to text/link sharing.
 */
export async function prepareMomentShare(life: Life, event: GameEvent, locale: Locale, t: ReturnType<typeof translator>, browser: { share?: (data: ShareData) => Promise<void>; canShare?: (data: ShareData) => boolean } = navigator): Promise<QuickShare | null> {
  if (!browser.share && !browser.canShare) return null;
  const url = lifeShareUrl(birthInvitationUrl(locale, (life.migration?.birthCountry ?? life.country).id), life);
  const title = life.name;
  const text = momentPost(life, event, locale, t);

  let file: File | null = null;
  if (browser.canShare) {
    try {
      await document.fonts?.ready;
      const canvas = mediaCanvas(1080, 1350);
      drawLifeCard(canvas, life, locale, t, '', event);
      const generated = new File([await canvasBlob(canvas)], `${life.id}-${event.id}.png`, { type: 'image/png' });
      if (browser.canShare({ files: [generated] })) {
        file = generated;
      }
    } catch {
      // If canvas generation fails, file remains null and quick-share continues via link
    }
  }
  return { lifeId: life.id, locale, file, title, text, url };
}
