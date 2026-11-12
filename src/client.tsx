import { StrictMode, startTransition } from "react";
import { hydrateRoot } from "react-dom/client";
import { StartClient } from "@tanstack/react-start/client";
import { ensureLocale, validLocale } from "./lib/i18n";

// The browser loads locale catalogs on demand. A localized page must have its catalog before
// hydrating, or the first client render would fall back to English and mismatch the server HTML.
const segment = location.pathname.split("/")[1] ?? "";
const ready = validLocale(segment) ? ensureLocale(segment) : Promise.resolve();
void ready.catch(() => {}).finally(() => {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <StartClient />
      </StrictMode>,
    );
  });
});
