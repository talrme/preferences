# Preferences: AI Handoff

## Product Intent

Phone-first, low-friction dinner-table game for friends. The fun is the **shared spoken discussion**, not privately submitting guesses or scoring. Four topics that people might love/hate; one picker privately orders them; everyone discusses; reveal least favorite→favorite. No score, countdown, player roster, vote collection, or game-show feature creep.

Owner approved all planning assumptions, requested ten fully functional visually different staging sites, a permanent add/edit/remove library, new Firebase project, public read/write/no auth, GitHub Pages and four differently colored vertical bars for the icon. Canonical directory is `/Users/talg/Desktop/Websites For Fun/preferences`. All personal sites belong in Websites For Fun unless explicitly told otherwise.

Remote is https://github.com/talrme/preferences.git. Live root https://talrme.github.io/preferences/ is a design chooser. Root staging/01…10 share **one actual backend environment main** and permanent library. These are visual design alternatives, not separate data environments; tell the owner this. Choosing/promoting one must preserve main data, room links/private ranking and library; remove only unused design files then, not database data. No design has been chosen yet.

## Existing Style Expectations

Borrow clean phone ergonomics from Huck, not its sleep domain/backend. Small header, main interaction first, restrained text; footer Settings/Topics/Share plus actual small QR (tap enlarges). Shared real-time data via Firestore, local appearance preferences, centered modals, accessible icon controls/tooltips, click outside/X/Escape close. Never hide errors behind modal backdrops. Avoid marketing heroes, huge subtitles and unnecessary instructions. Color options must have contrast in all states, dark mode, error/delete and primary buttons. Respect reduced motion; no automatic sounds. Fun animations may be over the top only in the optional Ridiculous mode.

## Files

- `tools/page.html`: one authoritative game template. Build replaces design tokens and writes staging pages/manifests. Do not maintain ten drifting copies of logic.
- `tools/build.cjs`: generates 10 pages/manifests, chooser, four-bar app-icon PNGs (512/192/180/32). Requires sharp locally, not on deployment.
- `shared/app.js`: UI flows, private order persistence, drag/arrow ranking, topic manager, settings, QR/share/room-specific manifest and animations.
- `shared/core.js`: UMD pure reducer, validation/draws, duplicate avoidance/private-order sanitization. Node tests require it.
- `shared/backend.js`: Firestore listeners and transactional writes; explicit local/sandbox mode, never silent live-to-local fallback.
- `shared/topics.json`: 200 starter prompts, 10 categories. Seed once; existing database authoritative thereafter. Manual JSON edits do not update an already initialized library.
- `shared/styles.css`: base components, palettes/settings/modals, animation presets/reduced motion. Loaded AFTER designs so explicit palette choices override theme variables.
- `shared/designs.css`: 10 different layouts/typography/tile framing/animations, not only colors. Ranking stays one column even in 2x2 designs.
- `shared/chooser.css`: root design-gallery layout.
- `shared/vendor`: vendored SortableJS1.15.6 MIT, QRCode.js1.0.0 MIT, Lucide ISC; retain licenses.
- `config.js`: public browser Firebase config, environment main and permanent liveURL. No secret key needed.
- `tools/serve.cjs`: no-store preview port5196.

## Backend And Privacy Invariants

Separate project `preferences-57a92`, supplied by owner. NEVER use Huck project/data. Rules explicitly allow open access below `/preferences/{document=**}` only, as documented in README. No Authentication/Hosting/Cloud Functions/API/Google Sheet is required. Firebase SDK13.2.0 official gstatic modules only; no auth module. Config is public, not a password.

Schema: `preferences/ENV` root marker, subcollection `topics/ID` with id/text/category/archived/rev, and `rooms/ID` coherent room snapshot. Real environment main, test-* only for destructive integration tests. Room has id/roundId/revision/phase/picker/owner/items[4]/revealed/seen. Items contain stable slot ID, library topic ID or null, and text snapshot. seen holds up to500 recently used library IDs. Initial blank room is real game setup, NOT fake play data. Initial200 suggestions are real prompt content, not fake players/results.

**Never send private ranking to Firebase before/during unrevealed stages.** Picker's order lives ONLY in localStorage keyed by environment+room+round. Room state has no order/ranking field. Readying changes phase only. Reveal sends only the growing reversed-order prefix of IDs already shown (least favorite first), not the full order on first reveal. UI displays fixed slots 1–4 with unknowns and fills from bottom. Reveal all explicitly publishes remaining answers. This privacy is stronger than CSS-hiding server-stored answers. Public security rules still permit malicious clients to corrupt state or impersonate owner; cooperative device ownership is not security. No auth/password/admin functionality is implemented.

Same browser/device/origin survives refresh, but private order cannot follow someone to another phone without transferring it (not implemented). Shared `owner` is a device UUID generated in localStorage; two tabs in one browser share it. No hidden automatic picker takeover. Anyone can reset a stuck round with confirmation; this loses its undisclosed ranking and does not touch library. New round reuses room link, uses a fresh UUID and preserves seen history.

Transactions read current room/topic, enforce revision expectations, apply pure reducer, and write atomically. Concurrent claims accept exactly one. No unsafely optimistic shared success. No durable offline outbox for shared gameplay: failed actions show an error and need retry; ranking movements remain local. Do NOT describe this as Huck's durable outbox. Listeners are server-confirmed only; cache/pending snapshots don't claim fresh status. Hidden tabs unsubscribe; visible return/online reconnect. No interval polling. Initial topic seed200 and root marker are one atomic transaction guarded by marker existence; room creation also transaction guarded. All topics are read when opening; future pagination if enormous.

Local mode when config.firebase is null uses localStorage plus BroadcastChannel and navigator.locks for same-origin tabs. Explicitly labeled sharing not connected. `?demo=1` always bypasses Firebase initialization, separate sandbox key. QR, install and share omit demo flag. When configured backend fails, never silently fork a local game.

Library edits are permanent across all rooms/designs. Remove is soft archive, with explicit confirmation and restore tab. Existing rounds are frozen text snapshots, never live pointers to editable text. Optional Save to library on a manual round topic. Active duplicates are rejected by client normalizer; this is not a trusted database uniqueness guarantee. Per-topic revision rejects stale edits. Export includes all categories/removed topics. No bulk destructive delete/reset-library feature.

## UI Contracts

Setup: four empty slots, draw all or shuffle each, manual editor and optional picker name. Claim requires4 unique nonempty text values. Setup edits lock after claim. Ranking: favorite→least; arrows plus SortableJS handle, neighbors slide. Private sorting changes no shared revision. Use Sortable's animated sort and renumber existing DOM after drag/arrow to avoid remount flicker. Owner Ready hides order and returns original A–D topic presentation. Only owner sees reveal controls. No individual group guesses. Reveal starts least favorite, then one-at-a-time or all. Next round after done; reset confirmation elsewhere.

Dialogs: explicit saves for topic text/name/library data; unsaved cancel/backdrop/Escape discard. Reset/remove confirmations are required. Settings preferences apply immediately; Save merely closes. Fixed title/footer, inline modal error region. Settings Appearance/Room/Advanced. AnimationOff/Gentle/Playful/Ridiculous stored local, plus OS reduced motion. No negative letter spacing or viewport-scaled fonts. Room names URL-safe lowercase letters/digits/hyphens, max40. Title and text must wrap sensibly at320px.

QR is generated locally with QRCode.js, never an external image service. Footer68px QR enlarges to220px. Local preview QR intentionally encodes assumed published Pages URL at same design path+room so visitors don't scan a localhost address. Actual local share therefore requires deployment; tell user honestly. Room-specific blob manifest has same-origin start_url+room, path scope, unique room id and absolute PNG icons; inspect with tests and check installation manually on a real phone. Static fallback manifest starts default table. QR is not favicon/social preview.

## Testing / Release

Build after template/assets changes. Run node tests/core.test.cjs, tests/browser.cjs, tests/firestore.cjs with bundled NODE_PATH and Chrome executable. Core assertions cover pure game transitions, stale writes, duplicate topics/recent avoidance and200 unique seed prompts. Browser exercises every design full round/private refresh/library add/edit/archive/restore, settings all palettes at320/390/1280 and QR/install URLs. No Firestore calls in sandbox. Live tests use unique test-* env and different design paths in two independent browsers. Verify no order field/writes on private sorting, correct reveal prefixes, single concurrent picker. Delete only the test env root/topics/rooms created by that test; NEVER main or Huck.

Use Playwright screenshots in /tmp and inspect actual phone/desktop appearance, not just assertions. Test actual drag gesture as well as arrow controls. Shared screenshots must not contain unrelated private data. No actual physical-phone automated tests performed.

Keep README/AI_README updated. GitHub push deploys committed static files; Firebase Rules Publish is separate. No owner action required for frontend changes after configured project; clearly state any backend-rule setup needed. Do not claim Pages deployed until checking its actual URL. Repository is initialized only after files/tests; do not overwrite user Git history or remotely initialize README without checking.
