# Plan: Nightstalker v0.1.0

Each task is small (one commit), references the acceptance criteria it serves, and names its proof.
Format: `- [ ] T-01 Title (AC-01, AC-02) - proof: unit|e2e|device`. Check the box only when the proof passes.

## Tasks

- [x] T-01 Native dependencies (Skia, Reanimated, worklets, Gesture Handler, expo-audio, expo-asset, expo-haptics), landscape, immersive full screen plugin, Jest mocks, seeded RNG (AC-45) - proof: unit
- [ ] T-02 Engine core: types, constants, maze parsing and bunker, player grid movement (AC-08, AC-09, AC-10) - proof: unit
- [ ] T-03 Gun placement and pickup, firing, player bullets, fire directions, web absorption (AC-11, AC-12, AC-13, AC-14, AC-15) - proof: unit
- [ ] T-04 Enemies: stats, spawning phase, reactive shields, movement AI, stuck detection (AC-16, AC-17, AC-21) - proof: unit
- [ ] T-05 Enemy fire: one enemy bullet, line of sight, cooldowns, yellow bolts on the bunker, laser variant, friendly fire without points (AC-18, AC-19, AC-20) - proof: unit
- [ ] T-06 Player hits, paralysis, death, respawn and game over (AC-22, AC-23, AC-24) - proof: unit
- [ ] T-07 Roster by tier, main carry-over, bat conversion, spawn positions, heartbeat tempo (AC-25, AC-26, AC-27, AC-34) - proof: unit
- [ ] T-08 Scoring, life bonus, new best, combos and bonuses with D5 clutch (AC-28, AC-29, AC-30) - proof: unit
- [ ] T-09 Power-ups: spawn timing and placement, the 19 effects, mystery buffs and curses, HUD label without points (AC-31, AC-32, AC-33) - proof: unit
- [ ] T-10 Storage: top-10 scores (stable, 0-score runs, quit runs) and game settings (AC-36) - proof: unit
- [ ] T-11 Dictionaries fr/en with the PRD player copy, combo number format, language resolution (AC-02, AC-07) - proof: unit
- [ ] T-12 Skia renderer: maze, bunker, web, sprites, bullets and lasers, particles, halos, decoy, x-ray (AC-46) - proof: device
- [ ] T-13 Controls: joystick and the four fire modes, swap sides (AC-14, AC-39) - proof: unit
- [ ] T-14 Game screen: loop, HUD, pause overlay, background pause, cheats only in debug builds (AC-35, AC-41, AC-42) - proof: unit
- [ ] T-15 Home, game over, settings, guide and about screens; routing; best score (AC-01, AC-03, AC-37, AC-38, AC-39, AC-43, AC-44) - proof: unit
- [ ] T-16 Telemetry calls: game_start, tier_reached, powerup_pickup, game_over, settings_change (AC-05, AC-06) - proof: unit
- [ ] T-17 Sound: generated WAVs with header tests, feedback policy honouring sound/ambience/vibrations, heartbeat loop (AC-40, AC-47) - proof: unit
- [ ] T-18 Maestro flows with readme captures: consent, play/pause/quit, settings persistence, swap, guide, about, language, telemetry (AC-01, AC-03, AC-06, AC-35, AC-37, AC-38, AC-39, AC-43, AC-44) - proof: e2e
- [ ] T-19 Device proofs prepared: launcher names per language, cold start, frame-stats and sound-load log lines, feel check list (AC-04, AC-45, AC-46, AC-47, AC-48) - proof: device

## Notes

- Port source: `C:/dev/Nightstalker` (code is the rules reference; deviations D1-D5 in the PRD). Copy game code and
  ideas only, never `deploy.bat`, `deploy/`, `build-*.bat`, `android/`, `dist/`, `.expo/`, `.github/`.
- The engine keeps the prototype's mutable `tick(state, dt, input)` design (performance), but randomness is injected
  (`Rng`) and side effects are returned as events (sounds, haptics, telemetry) instead of SFX callbacks.
- Skia needs Reanimated + worklets installed together (ganja-farmer lesson); clear the Metro cache on odd bundles.
- Release builds have no cheat: cheats are enabled by `__DEV__` only, so Maestro flows cannot jump tiers; tier
  rules are proven by unit tests.
