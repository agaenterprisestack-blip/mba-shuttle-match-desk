# MBA Shuttle Match Desk

Badminton match scoreboard for singles and doubles. Choose game point **20** (the default) or **14**, add player names and photos, record rally outcomes, track serving and player performance, switch sides, and undo or reset a game. Game point 20 requires at least 21 to win; game point 14 requires at least 15. Both require a two-point lead, with the existing 30-point cap.

**Challenge series:** Before starting a standalone match, choose **Single game** (default), **Best of 3 games**, or **Best of 5 games**. A series ends when a side wins 2 or 3 games respectively. The scoreboard shows the running series score and completed game scores, with a next-game button until the series is won. Each game winner serves first in the next game. Reset game resets only the current game; Undo also updates its provisional series win. Earlier completed games stay in the series history. Save each game's result separately before continuing if it should count in the individual-game leaderboard; unsaved games require confirmation before continuing. A completed series can be saved separately to Challenge series standings. Tournament fixtures remain single games. Unsaved series state is in memory and clears on reload, sign-out, or starting a new setup.

Player names must be unique across all active slots before starting a match, Challenge series, or tournament. Duplicate fields are marked and starting is blocked until corrected; capitalization and extra whitespace do not create a different player. Hidden doubles slots in singles mode and unused tournament entrants do not count.

Player-name suggestions exclude names entered in any other active slot, including teammates and opponents. Clearing or changing a field makes its previous name available again. Each field retains its own name as a suggestion unless another active slot also uses it; manually typed duplicates are still blocked.

The interface uses a warm-white sports-club theme, charcoal type, soft lime and lavender player panels, rounded cards, and Lucide outline icons. Leaderboard ranks 1-3 have gold, silver, and bronze badges (including tied ranks), and Challenge result cards highlight the winning opponent. Bundled shuttlecock artwork appears in empty states. Charts and exported PDF reports retain their existing colors and layout.

Game completion shows a brief, decorative confetti burst, which finishes and is removed within 1.8 seconds without blocking controls. Reduced-motion preferences disable confetti and retain static victory and serving indicators. Scoring controls retain their reserved layout when service changes.

Longer interface explanations are collapsed behind labeled **i** info controls on setup, login/profile, leaderboard, results, and admin screens. Click, tap, or focus and press Enter/Space to expand or collapse the details. Errors, connection/save status, duplicate-name warnings, and destructive-action confirmations stay visible.

The current serving player has a bold player name, a prominent Serving now badge, a one-time coin-flip spin on the avatar (photo or placeholder) when becoming the server, changing service-court position, or switching team sides, a static highlighted ring, and a gently bobbing shuttlecock, without a surrounding card border or background. The avatar animation uses transforms so scoring buttons stay in place and does not loop between these changes. The highlight follows service changes and stops when the game ends; reduced-motion settings retain the static ring and badge without animation.

Player rows reserve space for the serving badge and name so the Add point buttons stay in place when service changes or players exchange courts.

The lavender right-hand panel uses deep-purple player text and serving rings, and a dark-purple Serving now badge with white text for stronger contrast.

In doubles, player cards occupy their actual left/right service-court positions. When the serving side wins a rally, its players exchange positions: the server serves from the right at an even score and the left at an odd score. On a change of service, players retain their positions and the player in the appropriate court becomes the server. Undo restores the previous positions.

In the Record rally dialog, green options award a point to the player's side and red error options award a point to the opponent. Text labels also identify each outcome.

### Background artwork

The login and app backgrounds use [Badminton shuttlecock](https://commons.wikimedia.org/wiki/File:Badminton_shuttlecock.svg) by dooblem, published under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The SVG is bundled locally in `src/assets/shuttlecock.svg`; CSS scaling and translucent overlays keep the interface readable. No external image requests are needed.

Icons are bundled from [Lucide](https://lucide.dev), under ISC with MIT notices for Feather-derived icons. The distributed notices are retained in [public/third-party-notices.txt](./public/third-party-notices.txt), also copied to the production build. No remote fonts, animation service, or image CDN is required.

## Game performance report

The live scoreboard includes a score-progression line chart for both sides and player points-won/missed bar charts. Both charts update with scoring, undo, and reset, and are included as an additional page in the completed game's Game log PDF.

Score progression includes every rally, starting at 0-0. Player bars count only rallies with a player-specific winner or error outcome; manually added team points are not attributed to a player.

## Authentication

The app uses Firebase Email/Password authentication with account creation, password reset, and sign-out. The old public demo credentials no longer grant access. Firebase restores signed-in sessions across reloads, but match state remains in memory and is cleared on reload or sign-out.

Signup requires a full name (up to 80 characters), email, and password. **Phone number is optional** (up to 32 characters); city and club/team are also optional (up to 80 characters each). You can leave all three optional fields blank. Profile details are stored under `profiles/{uid}` with a creation timestamp. Only the account owner can read that document; other users cannot list or read it. The full name alone is also copied to the shared player roster on sign-in. Phone, city, and club/team are never copied. Passwords are handled by Firebase Authentication, not stored in profile documents.

Existing accounts without a profile are prompted to complete these details on their next sign-in. If authentication succeeds but a profile save fails, the app stays signed in and offers profile completion/retry instead of asking for another account. After reloading before the first successful save, unsaved fields must be re-entered. Profile editing is not currently offered.

Copy `.env.example` to `.env.local` and fill in the Firebase web app values. Keep `.env.local` out of source control. Without configuration, the login form is disabled and explains what is missing.

In Firebase project `shuttlematchdesk`:

1. Enable **Authentication > Sign-in method > Email/Password**.
2. Add the app hosts under **Authentication > Settings > Authorized domains**, including `localhost`, `127.0.0.1` for development and `agaenterprisestack-blip.github.io` for GitHub Pages.
3. Create the default Cloud Firestore database in production mode, choosing a suitable region.
4. Publish the contents of [firestore.rules](./firestore.rules) in **Firestore Database > Rules**. Signed-in users can read shared player names, automatically add their own profile name (unless removed), and create/read only their own private profile. Only designated admins can add arbitrary roster names, delete names, or restore removed names. Clients cannot grant themselves admin access. Merge with any existing project rules instead of overwriting rules for other apps.

For GitHub Pages, set repository Actions variables named `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, and `VITE_FIREBASE_APP_ID` to the web config values, then rebuild/deploy. These web configuration values are public identifiers, not service-account credentials. Never add service-account keys or admin credentials to the frontend.

## Shared player names

In single-match or tournament setup, type in any player-name field to choose a suggested name, or enter a name for the current game only. There are no per-field Save name buttons, and manually typed names are not added to the roster. They are included in match results if an admin explicitly saves the game to the leaderboard. Previously saved roster entries remain available as suggestions. Roster names are stored in the shared Firestore `players` collection and update live across signed-in devices. Leading/trailing and repeated whitespace are normalized; case-insensitive duplicates share one roster entry. Automatic saving requires a working Firebase connection and server confirmation; errors are displayed rather than silently stored locally.

After signup, profile completion, or a later sign-in, the user's full name is automatically added to the same suggestions, unless an admin previously removed that name. Names remain available after sign-out; this is not an online-user list. Existing users appear after their next sign-in (or reload of an active session), not through public access to private profile documents. Automatic sync failures show a retry action without blocking match setup. Names support up to 80 characters, matching the signup full-name limit. Identical names share one suggestion; suggestions are names, not unique account identifiers.

The roster is shared with **every signed-in user**, including newly created accounts. Do not store sensitive information in player names. Each entry records the name, creator UID, and server timestamp. Photos, live games, and tournament brackets are not uploaded. Admin-saved final scores, player sides, and performance counts are uploaded separately for the leaderboard.

## Admin player management

Designated admins see **Admin: Players** next to **Match desk** after signing in and completing their profile. The page lists shared names and supports adding and confirming deletion. There is no removed-names list or Restore button. Duplicate names are not overwritten. Navigating between the admin page and match desk preserves the in-memory match.

Deletion removes the shared suggestion, not the Firebase account, private profile, or names already entered in a match. A `removedPlayers` record (name, deleting admin UID, timestamp) prevents automatic sign-in sync from recreating the name. It applies to all accounts with that same case-insensitive name. An admin can explicitly add the name again using **Add player**. Changes require a server connection; failures are displayed with retry controls.

To grant admin access (Firebase project owner only):

1. Find the intended account in **Firebase Authentication > Users** and copy its **User UID**, not its email or display name.
2. In **Firestore Database > Data**, create collection `admins` with a document whose ID is that exact UID. Add a string field `role` with value `admin` as a descriptive console field. Document existence grants access; changing its fields does **not** revoke it.
3. The signed-in app updates access live. To revoke access, **delete the `admins/{uid}` document**. Only Firebase Console or trusted server administration can change admin documents; the web app cannot.

Do not put an email allowlist, admin password, or service-account credentials in the frontend. Deploy the updated rules before using the new page.

## Shared leaderboard

The **Competition** selector separates **Individual games** from **Challenge series**. Admins can use **Save Challenge series to leaderboard** after a best-of-3 or best-of-5 is won. This records one series win/loss per player or doubles pair, every game's final score, the format, and best-of length in `seriesResults/{seriesId}`. A stable series ID and transaction prevent duplicate saves or conflicting overwrites. Individual game saves are independent; saving a series does not add individual game records, and deleting one type does not alter the other. Existing standalone game records cannot reconstruct a series and are not automatically converted.

Challenge standings combine best-of-3 and best-of-5, rank by series wins, exact series win percentage, then games-won minus games-lost, and support player/pair views, 10-entry pagination, and the same calendar filters based on server save time. Games for/against are game wins/losses within each series, not rally points. Admin record management lists the saved series and all constituent game scores, with per-series deletion and **Reset Challenge series leaderboard**, scoped to series only. A saved series locks final-game Undo and Reset; use Edit setup for a new series. Saving the final game to individual standings remains possible.

Under Challenge series standings, **Challenge series results** shows opponent-by-opponent results for every signed-in viewer: both sides' names, the series score, winner, best-of length, save date, and each game's score and winner. Scores always follow the displayed opponent order. Results follow the selected period; Doubles pairs shows doubles only, while Players includes singles and doubles. History is newest-save-first with 10 series per page, independently of standings pagination. Changing the period or standings view resets history to page 1. Deletion controls remain admin-only.

Publish the updated Firestore rules for the new `seriesResults` collection before using series saves. Rules allow signed-in reads, admin-only creation/deletion, and no updates. They validate game scores, series length, and the winning game count, including stopping immediately once the series is won. No photo or private profile information is included. Only admin-saved series persist across devices.

All email/password-authenticated users with completed profiles can open **Leaderboard**. Every player in a completed singles or doubles game saved by an admin or approved user is included, even without their own login account. Standings persist in Firestore across sign-outs/devices and update live; match play itself remains in memory.

Rank order is **most match wins**, then **exact win percentage**, then **team points for minus points against**. Equal records share a rank. Singles and doubles are combined: both doubles teammates receive one played match, the same win/loss, and their team's score. Individual player points/errors count only attributed rally outcomes; team-only points do not become individual points.

The Win % column is not displayed; win percentage remains a ranking tie-breaker. Standings show **10 players per page**, with Previous/Next controls and ranks calculated across the entire selected period. Choose **All time** (default), **This week**, **This month**, or **This year**. Calendar periods use the viewer's local time zone and the result's server save timestamp; weeks run Monday through Sunday. Totals and rankings are recalculated from only the selected period's matches. Changing the period returns to page 1; live updates clamp the page to the available range. Results without a confirmed timestamp appear only under All time, with an explanatory notice in date-filtered views.

Use the **Standings** selector to switch from **Players** (default) to **Doubles pairs** for team battle results. The same two normalized player names identify a pair regardless of their order or court side; changing partners creates a different pair. Only saved doubles results count, with each team's played match, win/loss, and score counted once per pair, not twice. Pair standings use the same ranking rules, calendar filters, and 10-pair pagination. Changing the standings view returns to page 1 while keeping the selected period. Existing saved doubles matches are included automatically; no separate team save or data migration is needed.

Admins and users granted individual-game saving access see **Save final result to leaderboard** in the final-result panel. Check player names and scores before saving. This is an explicit action for each game, including each tournament fixture; unfinished games, byes, and unsaved results do not count. A stable game ID and transaction prevent duplicate counting on repeated clicks/retries. Saved result contents cannot be edited, and Undo is disabled after confirmed saving. The match desk's Reset creates a new game ID and does not erase an earlier saved result. Save before leaving the game or continuing the tournament. Errors are shown and can be retried.

**Admin: Saving access** lists users who have signed in or reloaded the updated app with a completed profile. Admins can grant or revoke individual-game saving access; Challenge series saving, deletion, resets, roster administration, and permission management remain admin-only. Admins retain saving access regardless of these grants. This uses Firestore on the existing plan, not Firebase Authentication account listing or Cloud Functions. It does not delete or manage login accounts.

Each user synchronizes only their profile name and a server last-seen timestamp to `signedInUsers/{uid}`. Only that user and admins can read the entry; only admins can list entries. Private profiles remain owner-only, and no email, phone, city, or club is copied. The timestamp reflects app registration/reload, not authoritative Firebase Auth last-sign-in or online status. Names can repeat across accounts, so the admin list includes UIDs. Admin-only grants live in `resultWriters/{uid}` with grantor and server timestamp; users may read only their own grant. Permission changes update live, cached grants cannot enable saving, and every save rechecks permission in a transaction. Publish the updated rules before using these features. Existing accounts appear on their next updated-app visit; they are not backfilled from private profiles.

Admins also see **Admin: Saved match records** below the leaderboard, with 10 records per page and individual **Delete record** controls. Confirming a deletion permanently removes that saved match from both player and pair standings. **Reset entire leaderboard** requires typing `RESET` and confirming; it deletes all records loaded when confirmation opened, across all periods and both views, not just the current filter. Concurrently saved new matches are not included. Neither action deletes accounts, profiles, player suggestions, or an in-progress game. Record changes require a confirmed server connection. Large resets run in groups of 100; a failure explicitly reports completed groups, and remaining records can be selected again. Admin access is checked for every group and enforced by Firestore rules. There is no undo; deleted results must be recorded again as a new match.

Players are identified by normalized, case-insensitive names, not login email. Use different names for different people; duplicate player names within a match cannot be saved. Roster deletion does not erase historical results. No private profile fields or photos are stored in results. Each `matchResults/{gameId}` document contains format, game-point threshold, final scores, winning side, player names/sides/individual counts, recording admin UID, and server timestamp. The leaderboard derives totals from these documents rather than allowing clients to edit totals.

**Firebase setup:** Publish the updated [firestore.rules](./firestore.rules) before use, including admin-only match-result deletion. Signed-in users may read match results; only designated admins may create valid completed results or delete records. Updates are denied to all web clients. Standings recalculate automatically after deletions. The leaderboard reads the complete results collection and filters/paginates locally, so read volume grows with saved history.

## Run locally

Requires Node.js 22.14 or newer and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Build

```sh
npm run build
npm run lint
npm test
```

The production site is generated in `dist`. Live match state is held in memory and is not synchronized between devices. The shared player roster and admin-saved leaderboard results are synchronized through Firestore. Unit tests use Node's experimental module-mocking support; Firebase configuration and real cloud save/reload flows should also be checked before deployment.

## Deploy to Cloudflare Pages

Connect this GitHub repository in Cloudflare Pages and use:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

The repository includes `wrangler.toml` for Cloudflare Pages metadata. Vite uses the site root by default on Cloudflare; the GitHub Pages workflow sets its repository subpath separately.