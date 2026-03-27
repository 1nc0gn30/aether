# AETHER

AETHER is a multi-page interactive frontend built with React, Vite, Tailwind CSS, and Motion.
It focuses on browser-native visual/audio interaction patterns (Canvas + Web Audio) and runs as a client-side app.

[Live Demo](https://aether.nealfrazier.tech)

## What It Includes

1. `NEXUS` (`/`): Canvas particle network with pointer interaction.
2. `ORACLE` (`/oracle`): Interactive card-reading UI with tilt/flip/draggable cards.
3. `ARCHIVE` (`/archive`): Searchable, filterable memory records with animated reveal states.
4. `SYNTHESIZER` (`/synthesizer`): Playable frequency grid (mouse/keyboard) with real-time visualizer.
5. `VOID` (`/void`): Breath pacing loop with interactive trail canvas.

## Tech Stack

1. React 19
2. Vite 6
3. Tailwind CSS 4
4. Motion (`motion/react`)
5. React Router
6. Canvas API + Web Audio API

## Local Development

```bash
npm install
npm run dev
```

Default dev server: `http://localhost:3000`

## Scripts

```bash
npm run dev      # start local dev server
npm run build    # production build
npm run preview  # preview production build
npm run lint     # TypeScript type check (no emit)
npm run clean    # remove dist/
```

## Notes

1. No backend is required for core UI interactions.
2. Audio playback in `SYNTHESIZER` starts after first user gesture due to browser autoplay policies.
3. `BrowserRouter` is used, so static hosting should rewrite unmatched routes to `index.html`.
# aether
