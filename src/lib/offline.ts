export async function enableOffline() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  const registration = await navigator.serviceWorker.ready;
  const urls = [
    location.href.split("?")[0],
    new URL("/", location.origin).href,
    ...performance.getEntriesByType("resource").map((entry) => entry.name),
    "/icon.svg?v=passport2",
    "/manifest.webmanifest?v=passport2",
  ].map((value) => new URL(value, location.origin).href);
  registration.active?.postMessage({ type: "CACHE_SHELL", urls });
}
