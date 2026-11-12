import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from "@tanstack/react-router";
import { LOCALES } from "../lib/i18n";
import { ogLocales } from "../lib/seo";
import styles from "../styles.css?url";
import identity from "../identity.css?url";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#172d43" },
    ],
    links: [
      { rel: "stylesheet", href: styles },
      { rel: "stylesheet", href: identity },
      { rel: "icon", href: "/icon.svg?v=passport2" },
      { rel: "manifest", href: "/manifest.webmanifest?v=passport2" },
    ],
  }),
  component: Root,
  notFoundComponent: () => (
    <main className="missing">
      <h1>404</h1>
      <a href="/">1in8bn.com</a>
    </main>
  ),
});
function Root() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const lang = LOCALES.find((l) => l.code === path.split("/")[1])?.html ?? "en";
  const isGamePage = path === "/" || LOCALES.some(l => path === `/${l.code}/` || path === `/${l.code}`);
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Repeated OG properties must bypass route-meta deduplication. */}
        {isGamePage && LOCALES.filter((l) => l.html !== lang).map((l) => (
          <meta key={l.code} property="og:locale:alternate" content={ogLocales[l.code]} />
        ))}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('1in8bn-theme')||'light'}catch(e){}",
          }}
        />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
