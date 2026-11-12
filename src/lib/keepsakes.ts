import { drawBirthShareCard } from "./birth-card";
import type { Life } from "../game/types";
import { countryName } from "../game/countries";
import type { Locale, translator } from "./i18n";
import { loadFilmSettings } from "./film-model";
import { albumDocument, canvasBlob, drawLifeCard, mediaCanvas } from "./life-media";
import { recordCsv, recordTable } from "./record-export";
type T = ReturnType<typeof translator>;
export function downloadFile(
  name: string,
  data: string | Blob,
  type = "text/plain",
) {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export async function saveBirthCard(life: Life, locale: Locale, t: T) {
  await document.fonts.ready;
  const canvas = mediaCanvas();
  if(life.alive)drawBirthShareCard(canvas,life,locale,t);else drawLifeCard(canvas, life, locale, t);
  downloadFile(`${life.id}-${life.alive ? "birth" : "life"}.png`, await canvasBlob(canvas));
}
export function saveStory(life: Life, locale: Locale, t: T) {
  const rows = [
    t("title"),
    life.name,
    `${life.birthYear} — ${life.year} · ${countryName(life.migration?.birthCountry ?? life.country, locale)}`,
    "",
    ...life.events.map(
      (e) =>
        `${t("age")} ${e.age} (${e.year})\n${t(e.key, e.params)}${e.kind === "reflection" && life.reflections[String(e.age)] ? "\n" + life.reflections[String(e.age)] : ""}\n`,
    ),
    "",
    "1in8bn.com",
  ];
  downloadFile(`${life.id}-story.txt`, rows.join("\n"));
}
export function saveAlbum(life: Life, locale: Locale, t: T, stars: string[] = []) {
  const settings = loadFilmSettings(life);
  const moments = stars.length ? stars : life.events.filter(event => event.kind !== "everyday").map(event => event.id);
  downloadFile(`${life.id}-album.html`, albumDocument(life, locale, t, settings, moments), "text/html;charset=utf-8");
}
export function saveRecordTable(life: Life, t: T, locale:Locale="en") {
  downloadFile(`${life.id}-record.csv`,recordCsv(life,t,locale),"text/csv;charset=utf-8");
}
export function saveRecordBook(life: Life, locale: Locale, t: T) {
  const events = life.events
    .map(
      (e) => {
        const reflection=e.kind==="reflection"?life.reflections[String(e.age)]:"";
        return `<p><b>${escape(t("age"))} ${e.age}</b> · ${escape(t(e.key, e.params))}</p>${reflection?`<blockquote>${escape(reflection)}</blockquote>`:""}`;
      },
    )
    .join("");
  downloadFile(
    `${life.id}-record.html`,
    `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(life.name)}</title><style>body{font:16px/1.6 Georgia,serif;max-width:1000px;padding:30px;margin:auto;color:#13212a;background:#f7f8f4}table{border-collapse:collapse;width:100%;font:13px monospace}td,th{padding:9px;border:1px solid #ccd6cf;text-align:right}h1{font-size:42px}h2{margin-top:40px}blockquote{white-space:pre-wrap;overflow-wrap:anywhere;border-left:3px solid #b8c5b7;margin:12px 0;padding:8px 16px}tr:nth-child(even){background:#e9eee9}@media print{thead{display:table-header-group}tr{break-inside:avoid}}</style><h1>${escape(life.name)}</h1><p>${life.birthYear} — ${life.year} · ${escape(countryName(life.country, locale))}</p><h2>${escape(t("ui.recordBook"))}</h2><p>${escape(t("record.annualNote"))}</p><div style="overflow:auto">${recordTable(life,t,locale)}</div><h2>${escape(t("record"))}</h2>${events}<footer>1in8bn.com</footer></html>`,
    "text/html",
  );
}
