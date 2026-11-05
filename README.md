# Preferences

**Live website:** [talrme.github.io/preferences](https://talrme.github.io/preferences/)

**Repository:** [talrme/preferences](https://github.com/talrme/preferences)

A phone-first dinner-table game: four topics, one person's private ranking, and everyone else arguing about what it will be. Optional individual guesses show who matched at the reveal; no cumulative scoring, timers or accounts.

## Current Design

**Paper Bowl (option one)** is now the main website. The chooser, other nine designs and their staging assets have been removed. The old option-one URL is a small redirect to the main game that preserves the room/query; it is not a second app. Existing rooms, the permanent topic library and device-local private rankings use the same keys/backend as before, with no data migration or reset.

## Playing

The person whose preferences everyone is guessing is **the picker**. A compact circle-and-line progress indicator follows **Choose → Rank → Discuss → Reveal**. It shows the shared round stage on every phone, not a clickable way to skip private steps. **New round** stays available above the game in every stage, with confirmation before clearing the current round; the library remains intact.

1. Tap **Four random topics**, draw individual topics with each shuffle icon, or enter your own using its pencil/plus. Tap **I'm the picker** and enter your name; this browser remembers it. Choosing the picker does not lock topic editing yet.
2. The picker taps **Rank privately**. That locks the four topics for everyone. Rank from most favorite to least favorite by grabbing anywhere on a card, or with the larger arrow buttons. Scroll using the space outside the ranking cards.
3. Tap **Ready · hide my ranking**. All phones now show the original unranked topics for group discussion. Your secret ranking is saved only on your device.
4. Reveal from least favorite up to favorite, one at a time. After the first answer, Reveal all is available too. Each step syncs to everyone; unrevealed answers are not sent to the database.
5. Tap **Next round**. The room link stays the same. A circular-arrow control can reset a stuck/abandoned round after confirmation, without deleting topics.

One phone works fine: rank privately, hide, and place it on the table. Other people can join the shared room using the QR at the bottom; tap the small QR to enlarge it. Links contain `?room=table` or your other room name. Settings has a Create/join room option. No login or room password is needed.

Closing/reloading the picker's browser preserves its order on that same browser, origin and device. That secret order does **not** follow the picker onto another phone/browser. Clearing storage loses it. The picker control can locally hide/show the picker view without releasing ownership. Someone taking over mid-round must confirm: the same topics get a fresh ranking round, with guesses/reveals cleared and no access to the previous picker's private order. New round clears the picker so anyone can volunteer again. Firestore is intentionally public, so picker ownership is a cooperative UI rule, not an authorization boundary.

**Individual guesses** is off by default and can be enabled before ranking. Other people can privately arrange their guess, then explicitly save it. Guesses close when revealing begins. At the end, names and correct positions out of four appear, including Perfect match. There is no lasting scoreboard. Names and draft guesses are remembered on the device; submitted guesses sync to the room. Unlike the picker's secret ranking, submitted guesses are stored in the public database; the UI hides them until the final reveal. The option stays enabled for the next round, but guesses reset.

## Permanent Topic Library

**Topics** opens a searchable manager. Add, edit, remove and restore topics; these edits sync across all rooms and designs. The initial library contains **200 real suggested prompts** in ten categories, not invented game results. There are no fake players, games or guesses.

Removed topics are soft-deleted and excluded from future random draws. They stay available under Removed for restoration. Existing rounds hold snapshots of their topic text, so editing/removing a library topic never rewrites an ongoing round. Manual round entries have an optional Save to the topic library toggle. Duplicate active topic text is checked by the app. Concurrent topic editing uses a revision check; database rules do not enforce uniqueness against malicious clients.

Draws avoid current duplicates and prefer topics not recently used in the room. The recent list is bounded to500 topic IDs; when fresh topics run low, older topics are eligible again. Export JSON downloads a full copy of the library, including removed items. The starter file is `shared/topics.json`; it is used only on first initialization, not on every refresh. Once connected, the database is authoritative. Editing the seed file does not overwrite an existing database library.

## Settings And Installation

Settings has Appearance, Room and Advanced groups. Color choices and **Off / Gentle / Playful / Ridiculous** animation levels apply immediately and save on this device. OS reduced motion is respected. No sound plays. Modals are centered; X, Escape and clicking outside close them. Draft text is saved only by its explicit Save button.

The four-color **horizontal-bar PNG**, like four ranked preferences, is the favicon, home-screen icon and header icon. Icon URLs are versioned to refresh caches; an already-installed phone shortcut might need removing and re-adding to replace its old artwork. Share / Save has room link copying, a locally generated QR and iPhone/Android installation instructions. The game dynamically creates a room-specific install manifest. Installed shortcuts are still websites, not separate data stores. Check your phone's installed shortcut opens the intended room; OS installation behavior can vary.

## Backend: Already Configured

`config.js` permanently connects to **Cloud Firestore**, project `preferences-57a92`, environment `main`. This is separate from Huck. No Apps Script, Sheet, Firebase Hosting, Authentication or per-phone configuration is needed. The public Firebase web configuration is not a secret.

Database layout:

```text
preferences/main                     # initialization marker
preferences/main/topics/TOPIC_ID      # text, category, archived, revision
preferences/main/rooms/ROOM_ID        # four topics, round ID, phase, picker device, revealed IDs
```

The room document never contains the private ranking. During reveal it contains only the IDs revealed so far, in least-favorite-first order. All normal browser writes are transactions. Shared edits are not shown as successfully saved until acknowledged; stale room/topic edits show an error instead of silently overwriting a newer action. Private ranking movements save locally without network writes.

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

The core tests validate the game state machine and200 unique starter topics. Browser tests run full rounds/library CRUD/settings/QR/private refresh on the main game at320/390/1280 widths. Firestore tests use unique `test-TIMESTAMP` environments and delete **only those** afterward. They test two-browser updates, private reorder without shared writes, guesses, incremental reveal, topic CRUD/restore and confirmed picker takeover. `node tests/ranking.cjs` exercises whole-card touch dragging, local picker-view hiding, remembered names and44px arrow targets. Promotion tests verify horizontal icon pixels, the root manifest/share paths, preserved rankings and old option-one redirects. They are not physical-phone tests. Screenshots are saved under /tmp, not committed.

## Assets And Dependencies

The app icon is a purpose-built four-bar drawing, rasterized to PNG using sharp by the build script; there are no external stock-photo requests. SortableJS handles touch/mouse dragging, Lucide supplies tool icons and QRCode.js generates QR codes locally. Library versions and licenses are in `shared/vendor`. Firebase's pinned official SDK is loaded from Google's CDN only for shared mode.
