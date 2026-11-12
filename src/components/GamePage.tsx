import { useRouterState } from "@tanstack/react-router";
import { type Locale } from "../lib/i18n";
import { seoHead, structuredData } from "../lib/seo";
import { GameApp } from "./GameApp";

export const gamePageHead = seoHead;
export function GamePage({ locale }: { locale: Locale }) {
  const structured = structuredData(locale);
  // The request URL is known while rendering on the server, so invitations appear in the first paint.
  const search = useRouterState({ select: (state) => state.location.searchStr });
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structured).replace(/</g, "\\u003c"),
        }}
      />
      <GameApp locale={locale} search={search} />
    </>
  );
}
