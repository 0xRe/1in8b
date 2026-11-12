import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { ensureLocale, validLocale, type Locale } from "../lib/i18n";
import { GamePage, gamePageHead } from "../components/GamePage";
export const Route = createFileRoute("/$locale")({
  beforeLoad: async ({ params, location }) => {
    if (!validLocale(params.locale)) throw notFound();
    if (params.locale === "en") throw redirect({ to: "/", search: true, hash: location.hash, statusCode: 301 });
    // Immediate on the server; in the browser, loads this language's catalog before the page renders.
    await ensureLocale(params.locale as Locale);
  },
  head: ({ params }) => gamePageHead(params.locale as Locale),
  component: () => <GamePage locale={Route.useParams().locale as Locale} />,
});
