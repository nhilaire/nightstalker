# Verification report: Nightstalker v0.1.1

Overall: PASS
Commit: 7bcecbd
Date: 2026-11-08 19:01 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: nightstalker-0.1.1-universal.apk (135.5 MB)
SHA-256: 28b301b6ae26b05ddc5e15f62a02eace7290cff496e5fdc7036986e56edaa58d

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 7bcecbd |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | lint | WARN | no "lint" script in package.json (app scaffolded before ESLint was part of the overlay) |
| 4 | unit tests (Jest) | PASS | Tests:       218 passed, 218 total |
| 5 | expo-doctor | WARN | issues reported (see raw/expo-doctor.txt) |
| 6 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 7 | release build | PASS | nightstalker-0.1.1-universal.apk, 135.5 MB, Firebase on |
| 8 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 9 | install (adb) | PASS | Performing Streamed Install Success |
| 10 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 11 | cold start time | PASS | median 911 ms of 911 / 969 / 830 ms after a warm-up launch (target < 3000 ms) |
| 12 | Maestro E2E flows | PASS | 6/6 flows passed, 17 screenshots in screens/ |
| 13 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |
| 14 | telemetry events after consent | PASS | seen in logcat: game_start, game_over |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
