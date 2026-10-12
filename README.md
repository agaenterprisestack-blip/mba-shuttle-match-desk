# MBA Shuttle Match Desk

Badminton match scoreboard for singles and doubles. Set a 20- or 21-point target, add player names and photos, record rally outcomes, track serving and player performance, switch sides, and undo or reset a game.

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