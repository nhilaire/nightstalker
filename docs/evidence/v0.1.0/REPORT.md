# Verification report: Nightstalker v0.1.0

Overall: PASS
Commit: 4c6088f
Date: 2026-10-27 15:09 UTC
Stack: expo
Target: emulator sdk_gphone64_x86_64, Android 16 (API 36, x86_64)
APK: nightstalker-0.1.0-universal.apk (135.5 MB)
SHA-256: d7fd5b6374877a2cfe73cad4f87bbfab160e50ebf1088d578dd01970ee68c5c5

| # | Step | Result | Evidence |
|---|---|---|---|
| 1 | clean working tree | PASS | commit 4c6088f |
| 2 | typecheck | PASS | `tsc --noEmit` exit 0 |
| 3 | unit tests (Jest) | PASS | Tests:       209 passed, 209 total |
| 4 | expo-doctor | WARN | issues reported (see raw/expo-doctor.txt) |
| 5 | secrets & personal data scan | PASS | secret-scan (worktree): clean |
| 6 | release build | PASS | nightstalker-0.1.0-universal.apk, 135.5 MB, Firebase on |
| 7 | release signature | PASS | release signature valid; cert SHA-256 54da35e17c99b321... |
| 8 | install (adb) | PASS | Performing Streamed Install Success |
| 9 | launch, alive after 8 s, no fatal error | PASS | process alive, 0 fatal log lines |
| 10 | cold start time | WARN | median 3583 ms of 7869 / 2632 / 3583 ms after a warm-up launch (target < 3000 ms) |
| 11 | Maestro E2E flows | PASS | 6/6 flows passed, 18 screenshots in screens/ |
| 12 | no crash during e2e flows | PASS | 0 fatal log lines (crash buffer + errors, raw/logcat-e2e.txt) |
| 13 | telemetry events after consent | PASS | seen in logcat: game_start, game_over |

Screenshots: `screens/` (emulator only, no personal data). Raw logs: `raw/` (local, git-ignored).
