# Brief: nightstalker

Date: 2026-10-20
Project slug: nightstalker
Final app name: Nightstalker

## Original brief

> Jeu pour android, inspiration Nightstalker de la console intellevision, faire passer C:\dev\Nightstalker dans l'usine

Source project: `C:/dev/Nightstalker` (Expo SDK 55 + TypeScript + `@shopify/react-native-skia` 2.4, landscape,
~5,700 lines, not a git repository, English UI). Its `SPECS.md` documents the design (maze 20x12, bunker, spider web,
pen, 6-bullet gun pickups, 8 enemy types, score-based roster tiers, reactive shields, 4 fire modes, debug cheats);
the code is newer than the spec (19 power-ups in `src/game/powerups.ts`, About and power-up guide screens).
Not to be copied: `deploy.bat`, `deploy/`, `build-*.bat`, `android/`,
`dist/`, `.expo/`, `.github/`, `node_modules/`.

## Clarifying questions

Answers are summarised in English. Format: `- **Q:** question` then `  **A:** answer`.
Mark assumptions the user accepted as `(default accepted)`.

### Concept and players

- **Q:** What is the scope of the port into the factory?
  **A:** Faithful port of the current code: 8 enemy types, 19 power-ups, 4 fire modes, bunker, spider web, pen,
  score-based roster tiers, reactive shields, combo bonuses. The source **code** is the rules reference (it is newer
  than `SPECS.md`); bugs found during the port are fixed only with the user's agreement (recorded in the PRD).
- **Q:** Who is it for, and how long is a session?
  **A:** Adults nostalgic for retro arcade / Intellivision; endless runs with rising difficulty, 5-15 min sessions.
- **Q:** How close to the Intellivision Night Stalker?
  **A:** Original homage: the source project's own maze, pixel sprites, enemies and balance; no asset, sprite, sound
  or layout taken from the original game.

### Story (About screen)

- **Q:** Why this game?
  **A:** The author discovered Night Stalker on the Intellivision as a child; the tension of a few bullets, robots
  closing in and a bunker as the only refuge stayed with them, and they built this game years later to find it again
  on their phone and share it. Approved French text:
  « Enfant, j'ai découvert Night Stalker sur la console Intellivision : quelques balles, des robots qui se
  rapprochent et un bunker pour seul refuge. Cette tension ne m'a jamais quitté. Des années plus tard, j'ai créé ce
  jeu pour la retrouver sur mon téléphone et la partager. »
  The About screen names the original (Night Stalker, Mattel, Intellivision, 1982) as the inspiration, says this game
  is neither a copy nor an official product, and that it was made by a passionate independent developer.

### Gameplay and controls

- **Q:** Core loop and controls? (answered by the source spec, confirmed by the port scope)
  **A:** Landscape, two thumbs: virtual joystick (4-direction snap-to-lane movement, no inertia) and a fire zone with
  4 selectable modes (quadrants default, d-pad, auto-aim, point-and-shoot); controls can be swapped left/right. Pick
  up the gun (6 bullets), shoot robots, avoid the paralysing bats and spider, shelter in the bunker. One player
  bullet and one enemy bullet on screen at a time (except power-ups that change this).
- **Q:** What happens to the debug cheats (3 taps in a corner: +2 lives, +5000 points)?
  **A:** Removed from release APKs; kept in debug/test builds (useful for Maestro flows to reach roster tiers).

### Progression, scoring, difficulty

- **Q:** End condition, scoring and progression? (answered by the source spec, confirmed by the port scope)
  **A:** Endless run, 6 starting lives, +1 life every 10,000 points, game over at 0 lives. Points per enemy type
  (100 to 6,000) plus combo bonuses in modern mode; the enemy roster escalates by score tiers (5k, 15k, 30k, 50k,
  80k). Best score saved locally.
- **Q:** Keep "modern mode" (power-ups and combo bonuses)?
  **A:** Yes, on by default, can be turned off in the settings for a classic mode.

### Look, sound and feel

- **Q:** Look? (answered by the source spec)
  **A:** Pixel-art sprites drawn with Skia on a dark blue maze with neon accents, square particles; unchanged.
- **Q:** Sound and haptics?
  **A:** Keep the synthesised SFX, background pulse and haptics; add Sound and Vibration on/off switches in the
  settings. No music.

### Languages

- **Q:** Which languages? The source UI is English only.
  **A:** French + English (factory default), English fallback; follows the phone language, switchable in the settings.
  Enemy and power-up names and descriptions are translated; short HUD/power-up icons are drawn glyphs, no image text.
- **Q:** Final app name per language?
  **A:** "Nightstalker" in every language (default accepted). No image with text and no spoken audio to translate.
- **Q:** Tu or vous?
  **A:** Tu.

### Screens and settings

- **Q:** How does the player learn the rules?
  **A:** Existing help screens, reachable from the menu: "How to play" (in About) and the power-up guide. No guided
  tutorial.
- **Q:** Settings? (derived from answers)
  **A:** Fire mode, swap controls, modern mode, sound, vibration, language, telemetry consent. Pause button and
  automatic pause when the app goes to the background (as in the source).

### Telemetry and success metrics

- **Q:** What does success look like?
  **A:** All four: players come back (retention, runs per player), how far players go (score and roster tier
  reached, to tune difficulty), settings usage (fire mode, swapped controls, modern mode, power-ups picked up), and
  no crashes (Crashlytics crash-free sessions). Opt-in only, no identifiers.

### Constraints

- **Q:** What is explicitly out of scope for v0.1?
  **A:** Online leaderboard and accounts; iOS and web (the Azure deployment and web page of the old project are not
  carried over); other mazes or levels (the HTML maze editors are not carried over); ads and in-app purchases.
- **Q:** Must it work offline?
  **A:** Yes (default accepted), no backend.

## Decisions taken during discovery

- Final app name "Nightstalker" and slug `nightstalker` chosen by the user, knowingly: "Night Stalker" is a
  Mattel/Intellivision title and the repository will be public. The About screen states the homage and that it is not
  an official product.
- Port of `C:/dev/Nightstalker`: the code is the rules reference; differences with `SPECS.md` are resolved in favour
  of the code unless the user decides otherwise in the PRD.
- Never copy from the source folder: `deploy.bat`, `deploy/`, `build-quick.bat`, `build-release.bat`, `android/`, `dist/`, `.expo/`, `.github/`. The prototype's
  old package is replaced by the factory package `io.github.nhilaire.nightstalker`.
- Debug cheats are compiled out of release builds.
- Stack expected to stay Expo + Skia (decided in `/choose-stack`); `expo-av` used by the source audio is to be
  re-evaluated there.
