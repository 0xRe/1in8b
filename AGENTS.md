# 1 in 8 Billion

This directory is an independent application repository. Run package commands here, and verify the current Git root and remote before committing or pushing.

## Product scope

- Preserve the solo simulation, private two-player rooms, Agora human voice, local saves, sharing, and keepsakes.
- All player features stay free. Do not add payments or paid feature gates.
- This source distribution has no analytics, behavioral event collection, advertising, referral attribution, or site-verification integrations. Do not add them without an explicit user request.
- Voice is optional. Keep Agora certificates on the server, authorize room membership before signing tokens, and preserve renewal and microphone cleanup.
- Human voice follows the room lifecycle without an extra fixed call limit. AI character interviews are not implemented; do not claim they are.
- Preserve the dataset, map, icon, and provider attribution in the third-party notices. The public text endpoint is served from the root Markdown notice.

## Development

- Use the pnpm version pinned in `package.json`.
- For substantive code changes, run `pnpm typecheck`, `pnpm test`, and `pnpm build`.
- Check local routing with `node tests/routing-smoke.mjs http://127.0.0.1:3089` when relevant.
- Keep saves, credentials, local databases, generated builds, and authentication state out of Git.
- The app uses a Durable Object for two-player rooms; there is no D1 community database. Keep the room migration in Wrangler and the optional Agora secrets server-side. Do not deploy as part of routine local verification.
- Preserve concurrent changes. State separately what was tested locally and what remains unverified on devices or in production.

## Documentation

- Keep English and Simplified Chinese READMEs consistent.
- Keep private invitation URLs out of public indexes and previews.
