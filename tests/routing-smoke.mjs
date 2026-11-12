import assert from "node:assert/strict";

const origin = process.argv[2] ?? "http://127.0.0.1:3089";
const get = (path) => fetch(new URL(path, origin), { redirect: "manual" });
const root = await get("/");
assert.equal(root.status, 200, "English root must render without a redirect");
const html = await root.text();
assert.match(html, /<html[^>]*lang="en"/);
assert.match(html, /rel="canonical"[^>]*href="https:\/\/1in8bn\.com\/"/);
assert.match(html, /"url":"https:\/\/1in8bn\.com\/"/);
assert.doesNotMatch(html, /https:\/\/1in8bn\.com\/en\//);
assert.match(html, /href="\/"[^>]*>English</);

for (const path of ["/en", "/en/", "/en/?born=JPN&life=abc"]) {
  const response = await get(path);
  assert.equal(response.status, 301, `${path} must permanently redirect`);
  const target = new URL(response.headers.get("location"), origin);
  assert.equal(target.pathname, "/");
  assert.equal(target.search, new URL(path, origin).search, "Preserve shared-link queries");
}
const german = await get("/de/");
assert.equal(german.status, 200);
assert.match(await german.text(), /rel="canonical"[^>]*href="https:\/\/1in8bn\.com\/de\/"/);
const sitemap = await (await get("/sitemap.xml")).text();
const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
assert.equal(new Set(locations).size, locations.length, "Sitemap entries must be unique");
for (const path of ["/", "/de/", "/together/"]) {
  assert.ok(locations.includes(`https://1in8bn.com${path}`), `${path} must be discoverable`);
}
assert.match(sitemap, /<loc>https:\/\/1in8bn\.com\/<\/loc>/);
assert.doesNotMatch(sitemap, /https:\/\/1in8bn\.com\/en\//);
const manifest = await (await get("/manifest.webmanifest")).json();
assert.equal(manifest.start_url, "/");
console.log("English root, legacy redirects, shared query parameters, German canonical, sitemap and PWA entry passed.");
