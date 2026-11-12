import { publicDocumentResponse } from "./lib/discovery";
import thirdPartyNotices from '../THIRD_PARTY_NOTICES.md?raw';
import { canonicalRedirectUrl } from "./lib/site-url";
import handler from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";
import { lifeCardResponse, sharePreview, withSharePreview } from "./lib/share-preview";
import { duo, type DuoEnv } from './lib/duo-api';
import { duoVoice, type DuoVoiceEnv } from './lib/duo-voice-api';
export { DuoRoom } from './duo-room';
const locales = [
  "en",
  "ko",
  "ja",
  "zh",
  "zh-hans",
  "vi",
  "fr",
  "th",
  "es",
  "de",
  "tr",
  "ru",
  "pt",
  "id",
] as const;
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const canonical = canonicalRedirectUrl(url);
    if (canonical) return Response.redirect(canonical.href, 301);
    const voiceRoom=url.pathname.match(/^\/api\/duo\/rooms\/([a-zA-Z0-9-]{1,80})\/voice$/);
    if(voiceRoom)return duoVoice(request,env as unknown as DuoVoiceEnv,voiceRoom[1]);
    if(url.pathname.startsWith('/api/duo/'))return duo(request,env as unknown as DuoEnv);
    if (url.pathname.startsWith("/api/"))
      return Response.json({ error: "Not found" }, { status: 404 });
    const card = await lifeCardResponse(request, url);
    if (card) return card;
    const document = await publicDocumentResponse(request, thirdPartyNotices);
    if (document) return document;
    if (locales.some((l) => url.pathname === `/${l}`)) {
      url.pathname += "/";
      return Response.redirect(url.href, 301);
    }
    const togetherLocale = url.pathname.match(/^\/([^/]+)\/together\/?$/)?.[1];
    const isTogether = /^\/together\/?$/.test(url.pathname) ||
      locales.some(locale => locale === togetherLocale);
    if (togetherLocale === 'en' || isTogether && !url.pathname.endsWith('/') && !url.search) {
      url.pathname = togetherLocale === 'en' ? '/together/' : url.pathname + '/';
      return Response.redirect(url.href, 301);
    }
    const response = await handler.fetch(request);
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", isTogether ? "no-referrer" : "strict-origin-when-cross-origin");
    if (isTogether && url.search) {
      headers.set('X-Robots-Tag', 'noindex, follow');
      headers.set('Cache-Control', 'private, no-store');
    }
    // Public game routes can be embedded by browser-game directories.
    const isGamePage = url.pathname === "/" ||
      locales.some((locale) => url.pathname === `/${locale}/`);
    if (isGamePage) headers.delete("X-Frame-Options");
    else headers.set("X-Frame-Options", "DENY");
    headers.set(
      "Permissions-Policy",
      isTogether ? 'camera=(), microphone=(self), geolocation=()' : 'camera=(), microphone=(), geolocation=()',
    );
    const shared = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
    // Invitation links carry the shared life, so chat apps preview that life rather than the home page.
    const preview = isGamePage && response.status === 200 ? sharePreview(url) : null;
    return preview ? withSharePreview(shared, preview) : shared;
  },
};
