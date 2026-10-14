# MBA Shuttle Match Desk

Badminton match scoreboard for singles and doubles. Set a 20- or 21-point target, add player names and photos, record rally outcomes, track serving and player performance, switch sides, and undo or reset a game.

The interface and exported PDF reports use black-and-white foundations, bright lime-green highlights, and lavender accents for the opposing side and missed points. Charts use a darker green for readability on white.

The current serving player has a bold player name, a prominent Serving now badge, a one-time coin-flip spin on the avatar (photo or placeholder) when becoming the server, changing service-court position, or switching team sides, a static highlighted ring, and a gently bobbing shuttlecock, without a surrounding card border or background. The avatar animation uses transforms so scoring buttons stay in place and does not loop between these changes. The highlight follows service changes and stops when the game ends; reduced-motion settings retain the static ring and badge without animation.

Player rows reserve space for the serving badge and name so the Add point buttons stay in place when service changes or players exchange courts.

The lavender right-hand panel uses deep-purple player text and serving rings, and a dark-purple Serving now badge with white text for stronger contrast.

In doubles, player cards occupy their actual left/right service-court positions. When the serving side wins a rally, its players exchange positions: the server serves from the right at an even score and the left at an odd score. On a change of service, players retain their positions and the player in the appropriate court becomes the server. Undo restores the previous positions.

In the Record rally dialog, green options award a point to the player's side and red error options award a point to the opponent. Text labels also identify each outcome.

### Background artwork

The login and app backgrounds use [Badminton shuttlecock](https://commons.wikimedia.org/wiki/File:Badminton_shuttlecock.svg) by dooblem, published under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). The SVG is bundled locally in `src/assets/shuttlecock.svg`; CSS scaling and translucent overlays keep the interface readable. No external image requests are needed.

## Game performance report

The live scoreboard includes a score-progression line chart for both sides and player points-won/missed bar charts. Both charts update with scoring, undo, and reset, and are included as an additional page in the completed game's Game log PDF.

Score progression includes every rally, starting at 0-0. Player bars count only rallies with a player-specific winner or error outcome; manually added team points are not attributed to a player.

## Authentication

Firebase integration is paused. The app currently uses a public, hardcoded demo login:

- Email: `demo@shuttlematchdesk.com`
- Password: `ShuttleDemo21`

This is a client-side demo gate, not secure authentication. Do not use it to protect private data. Reloading the page or signing out returns to the login page and clears the in-memory match desk. Account creation and password reset are unavailable in demo mode. No Firebase requests are made by the active app.

TODO: Resume Firebase Authentication integration. The SDK dependency, `src/firebase.js`, and environment configuration are retained for this follow-up. Enable Email/Password in Firebase, reconnect the sign-in, account creation, password reset, auth-state listener, and sign-out flows, and verify them end to end before using real accounts.

For that follow-up, copy `.env.example` to `.env.local` and fill in the Firebase web app values if they are not already configured. Keep `.env.local` out of source control. Match data is still held in the browser and is not synced to an account or between devices.

## Run locally

Requires Node.js and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Build

```sh
npm run build
npm run lint
```

The production site is generated in `dist`. Match state is currently held in the browser session and is not synchronized between devices.

## Deploy to Cloudflare Pages

Connect this GitHub repository in Cloudflare Pages and use:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`

The repository includes `wrangler.toml` for Cloudflare Pages metadata. Vite uses the site root by default on Cloudflare; the GitHub Pages workflow sets its repository subpath separately.