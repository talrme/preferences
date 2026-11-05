# Preferences

**Live website:** [talrme.github.io/preferences](https://talrme.github.io/preferences/)

**Repository:** [talrme/preferences](https://github.com/talrme/preferences)

A phone-first dinner-table game: four topics, one person's private ranking, and everyone else arguing about what it will be. Optional individual guesses show who matched at the reveal; no cumulative scoring, timers or accounts.

## Current Design

The default design uses a soft sky-blue-to-mint/lime gradient with solid-color, borderless controls and white topic tiles. The decorative bowl outline, panel dividers and selection rings are removed; selected controls use color fills instead. Keyboard focus indicators remain visible. Other palettes have their own colorful gradients, while Night stays dark. This is an appearance-only change; game flow and saved data are unchanged.

**Paper Bowl (option one)** is now the main website. The chooser, other nine designs and their staging assets have been removed. The old option-one URL is a small redirect to the main game that preserves the room/query; it is not a second app. Existing rooms, the permanent topic library and device-local private rankings use the same keys/backend as before, with no data migration or reset.

## Playing

The person whose preferences everyone is guessing is **the ranker**. Each step has a clear next action and, after setup, a **Back** button. The ranker controls shared step changes; other phones explain whom they are waiting for rather than letting spectators skip a private step. Below the game, a compact circle-and-line progress indicator follows **Choose → Rank → Discuss → Reveal**, with a short direction for the current step. It is not clickable. **New round** stays available below progress, with confirmation before clearing the current round; the library remains intact. **Round options** holds ranker changes, hiding/showing your ranking, optional guesses and revealing all remaining answers.

1. Choose four topics with random draws or by tapping anywhere on a topic tile. Empty tiles open **Add a Topic**; filled tiles open **Edit Topic**, using the same editor. The pencil/plus remains keyboard-accessible and shuffle works separately. **I'm the ranker** is always visible in the upper-right below the profile header, with a small info button explaining the role. Until someone volunteers, an unboxed handwritten reminder and arrow point toward it; the setup banner has been removed. The browser remembers your name. Selecting a ranker does not lock topic editing yet; Next becomes available once all four topics are chosen.
2. The ranker taps **Next: rank privately** to lock the four topics. Grab a whole card or use the arrows to put favorites first. Scroll outside the ranking cards. Other phones show an above-topic waiting banner; with individual guesses enabled, they can arrange their own guess there.
3. Tap **Done ranking: discuss**. Every phone shows the original unranked topics, with no shared secret order. **Back** returns to private ranking and keeps the local order.
4. Tap **Done discussing: reveal**. Entering this step does not publish any answers yet. Reveal the least favorite, then the next answers one at a time. Round options can reveal all remaining answers. Each reveal syncs to everyone; undisclosed answers are not sent to the database.
5. Tap **Next round**. The room link stays the same. A circular-arrow control can reset a stuck/abandoned round after confirmation, without deleting topics.

**Back** from ranking returns to topic selection after confirmation, retaining topics/ranker but restarting ranking and guesses. From reveal, Back returns to discussion; if answers were shown, a confirmation explains that they cannot be unseen and guesses remain locked even after going back. From completed results, Back returns to the reveal with the final answer hidden. Moving between shared steps scrolls to the top so the new banner is visible. A spectator's guess editor has its own Back/Save buttons; these do not change the shared stage.

One phone works fine: rank privately, hide, and place it on the table. Other people can join the shared room using the QR at the bottom; tap the small QR to enlarge it. Links contain `?room=table` or your other room name. The footer **Table** button explains separate games and has **Go to Settings**, which opens/focuses **Tables** with other groups collapsed. There you can create or join another table. No login or room password is needed; these are separate public games, not secured private rooms.

After **12 hours without a shared round action**, opening, refreshing or returning to the page automatically starts a fresh setup in that room. Topics chosen for the round, picker, guesses and reveal are cleared; the permanent topic library, local name/appearance settings, guessing-mode preference and recent-topic avoidance history remain. The room link stays the same. Expiry is checked against the latest room inside a transaction, so simultaneous opens reset once and newer gameplay wins over a stale expiry check. Merely opening a page does not renew activity. This uses existing listeners, not polling or a scheduled job; an untouched visible tab waits until it reconnects or someone acts. Private drag/arrow movements remain local and do not generate activity writes. Old rounds lacking timestamps get a baseline on their first open after this update, without losing their existing round.

Closing/reloading the picker's browser preserves its order on that same browser, origin and device. That secret order does **not** follow the picker onto another phone/browser. Clearing storage loses it. The picker control can locally hide/show the picker view without releasing ownership. Someone taking over mid-round must confirm: the same topics get a fresh ranking round, with guesses/reveals cleared and no access to the previous picker's private order. New round clears the picker so anyone can volunteer again. Firestore is intentionally public, so picker ownership is a cooperative UI rule, not an authorization boundary.

**Individual guesses** is off by default and can be enabled in Round options before ranking. Other people can privately arrange their guess, then explicitly save it. Guesses close when revealing begins. At the end, names and correct positions out of four appear, including Perfect match. There is no lasting scoreboard. Names and draft guesses are remembered on the device; submitted guesses sync to the room. Unlike the picker's secret ranking, submitted guesses are stored in the public database; the UI hides them until the final reveal. The option stays enabled for the next round, but guesses reset.

The current picker is always identified next to your name, including on their own phone. Tap your name and **Remove my name** to clear it from this browser; if you are the picker, the shared label becomes Unnamed without losing your role or ranking. Your current-round submitted guess, if any, is relabeled Anonymous. This does not erase names stored in unrelated past rooms. Name-free spectators can watch and discuss; volunteering as picker or submitting a new guess asks for a name again. Dragged cards remain fully opaque and outlined; only their original placeholder is faded.

## Permanent Topic Library

**Topics** opens a searchable manager. Add, edit, remove and restore topics; these edits sync across all rooms and designs. The initial library contains **200 real suggested prompts** in ten categories, not invented game results. There are no fake players, games or guesses.

Removed topics are soft-deleted and excluded from future random draws. They stay available under Removed for restoration. Existing rounds hold snapshots of their topic text, so editing/removing a library topic never rewrites an ongoing round. Manual round entries have an optional Save to the topic library toggle. Duplicate active topic text is checked by the app. Concurrent topic editing uses a revision check; database rules do not enforce uniqueness against malicious clients.

Draws avoid current duplicates and prefer topics not recently used in the room. The recent list is bounded to500 topic IDs; when fresh topics run low, older topics are eligible again. Export JSON downloads a full copy of the library, including removed items. The starter file is `shared/topics.json`; it is used only on first initialization, not on every refresh. Once connected, the database is authoritative. Editing the seed file does not overwrite an existing database library.

## Settings And Installation

The clickable top-right name/avatar has no underline; it still opens your profile.

Your profile is the top-right header button; tap to edit/remove your name and optionally choose a **koala, baby, cat, robot or fox** avatar, or **No avatar**. Name and avatar save on this browser only after Save; Cancel discards changes. Removing the name keeps the avatar. Names still need to be entered before volunteering as ranker or submitting a guess. The selected avatar accompanies your shared ranker label and submitted guess/results; editing your profile updates those current-room labels without changing any order. Long names truncate on screen without changing the saved name. The ranker label stays visible below the header when selected, and Round options sits beside the stage heading rather than in its own row. **Settings**, **Topics**, **Share / Save** and **Table** have generous gaps in the footer; phones use two columns alongside the QR. The header has no normal connected/saving subtitle or reserved status gap. Reconnecting, offline/error notices and explicit sandbox/local-only labels still appear when applicable.

The upper-right **I'm the ranker** button is a toggle. Tap it again to step down: immediately during setup, or after confirmation mid-round. The four topics remain, but private ranking, guesses and revealed answers restart with a fresh round ID so another person can volunteer. Your saved name/avatar stay on your device. Another player selecting it mid-round must still confirm takeover. Only the adjacent info button opens the explanation, with Close/X/Escape/backdrop dismissal and no game changes. The handwritten reminder returns when nobody is the ranker.

Settings has Appearance, Tables and Advanced groups. Color choices and **Off / Gentle / Playful / Ridiculous** animation levels apply immediately and save on this device. OS reduced motion is respected. No sound plays. Modals are centered except topic/profile editors on phones, which open near the top and resize to the visible viewport so their Save footer stays above the keyboard. X, Escape and clicking outside close them. Draft text is saved only by its explicit Save button. Topic fields have no example placeholder; the optional switch says **Add this to the list of topics**.

The four-color **horizontal-bar PNG**, like four ranked preferences, is the favicon, home-screen icon and header icon. Icon URLs are versioned to refresh caches; an already-installed phone shortcut might need removing and re-adding to replace its old artwork. Share / Save has room link copying, a locally generated QR and iPhone/Android installation instructions. The game dynamically creates a room-specific install manifest. Installed shortcuts are still websites, not separate data stores. Check your phone's installed shortcut opens the intended room; OS installation behavior can vary.

## Backend: Already Configured

`config.js` permanently connects to **Cloud Firestore**, project `preferences-57a92`, environment `main`. This is separate from Huck. No Apps Script, Sheet, Firebase Hosting, Authentication or per-phone configuration is needed. The public Firebase web configuration is not a secret.

Database layout:

```text
preferences/main                     # initialization marker
preferences/main/topics/TOPIC_ID      # text, category, archived, revision
preferences/main/rooms/ROOM_ID        # four topics, round ID, phase, picker device, revealed IDs
```

The room document never contains the private ranking. During reveal it contains only the IDs revealed so far, in least-favorite-first order. `lastActivityAt` uses a Firestore server timestamp for shared room actions, and numeric milliseconds in local mode. All normal browser writes are transactions. Shared edits are not shown as successfully saved until acknowledged; stale room/topic edits show an error instead of silently overwriting a newer action. Private ranking movements save locally without network writes.

Live listeners deliver changes without interval polling. Hidden tabs unsubscribe and reconnect when brought back, keeping the current game and open drafts visible instead of replacing them with the startup loader. Returning only reconnects listeners: seed/library initialization and room-creation checks are cached for the page lifetime, not rerun on every tab switch. Rapid returns/online events are coalesced, and obsolete callbacks are ignored. A small Reconnecting status remains until server snapshots confirm freshness. Same-content snapshots do not remount the list just because Firestore map key order differs. A first full page load still needs initial setup checks; none of this labels cached data as freshly synced.

Offline status is explicit, and coming back online reconnects without a manual refresh. Shared actions need connectivity and are **not** a durable offline outbox: if saving fails, retry the action when connected. No silent local fallback is used when Firebase is configured but unavailable. This avoids showing a separate fake shared game. The local sandbox below is separate and clearly labeled.

The owner explicitly requested unauthenticated public read/write access. Anyone can read/change/delete topics or rounds, bypass validation, or consume quota. Do not store sensitive information. Passwords, admin roles, trusted validation, App Check and automatic backups are not implemented. All topics are loaded when opening; pagination is future work if the library grows dramatically.

## Recreating Firebase: Step By Step

The supplied project is configured in the repo; these steps document how to recreate it.

1. Visit [Firebase Console](https://console.firebase.google.com/) and choose Create project.
2. Name it Preferences. Analytics and Gemini assistance are optional; you can leave them off.
3. Open Build → Firestore Database → Create database.
4. Choose Standard edition, the `(default)` database, and a US location. Choose production mode initially.
5. Open the Firestore Rules tab. Replace the editor contents with the following and click **Publish**. This allows open access only under this app's `/preferences` path, rather than every project collection. It has no test-mode expiration.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /preferences/{document=**} {
      allow read, write: if true;
    }
  }
}
```

6. In Project overview, click the web app button `</>` and name the app Preferences Web.
7. Leave Firebase Hosting off. Click Register app.
8. Copy the displayed `firebaseConfig` object into `config.js` as `firebase`, replacing the previous project's object. No service account/private key is required or should be committed.
9. Open the main game. It creates the 200-topic starter library and default room once, automatically. Two people can initialize concurrently without duplicate seeds.
10. Test a room on two phones. A shared change should appear without a manual refresh. If access is denied, recheck the published rules and project ID; merely saving a rule draft is insufficient.

## GitHub Pages

1. Create an empty public repository `talrme/preferences` and share its URL.
2. Push this directory to its `main` branch. Build output is committed; there is no npm/build action required for hosting.
3. In the GitHub repo, open Settings → Pages.
4. Choose Deploy from a branch, then main and /(root), and click Save.
5. Wait for the Pages deployment. The main Paper Bowl game is at the live link above. GitHub publishing is separate from Firebase rules publishing.

## Local Development And Tests

Canonical directory: `/Users/talg/Desktop/Websites For Fun/preferences`.

```sh
node tools/build.cjs
node tools/serve.cjs
```

Open [the local game](http://127.0.0.1:5196/). Build requires `sharp`; browser tests require `playwright` and desktop Chrome. The Codex bundled Node runtime provides these through NODE_PATH; deployed pages have no Node dependency.

```sh
node tests/core.test.cjs
node tests/browser.cjs
node tests/firestore.cjs
node tests/promotion.cjs
```

Add `?demo=1` to a game URL for a clearly labeled, device-local sandbox. It uses a separate storage namespace, never imports the Firebase SDK, and never changes shared topics/rooms. QR/share/install links omit demo mode so they do not invite friends into a disconnected sandbox.

The core tests validate the game state machine and200 unique starter topics. Browser tests run full rounds/library CRUD/settings/QR/private refresh on the main game at320/390/1280 widths. Firestore tests use unique `test-TIMESTAMP` environments and delete **only those** afterward. They test two-browser updates, private reorder without shared writes, guesses, incremental reveal, topic CRUD/restore, confirmed picker takeover and clearing the picker's name across devices. `node tests/ranking.cjs` exercises whole-card touch dragging, opaque dragged cards, local picker-view hiding, remembered names and44px arrow targets. `node tests/flow.cjs` covers the single-main-action flow, progress placement, optional menu and persistent name removal. `node tests/editor.cjs` checks phone editor positioning and Save visibility with simulated keyboard space. Promotion tests verify horizontal icon pixels, the root manifest/share paths, preserved rankings and old option-one redirects. They are not physical-phone tests. Screenshots are saved under /tmp, not committed.

## Assets And Dependencies

The app icon is a purpose-built four-bar drawing, rasterized to PNG using sharp by the build script; there are no external stock-photo requests. SortableJS handles touch/mouse dragging, Lucide supplies tool icons and QRCode.js generates QR codes locally. Library versions and licenses are in `shared/vendor`. Firebase's pinned official SDK is loaded from Google's CDN only for shared mode.
