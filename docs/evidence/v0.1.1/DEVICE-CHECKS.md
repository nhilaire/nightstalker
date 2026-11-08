# Device checks on the emulator: v0.1.1

Commit: 7bcecbd (same as REPORT.md). APK: `dist/nightstalker-0.1.1-universal.apk`, SHA-256
`28b301b6ae26b05ddc5e15f62a02eace7290cff496e5fdc7036986e56edaa58d`. Emulator: emulator-5554 (sdk_gphone64_x86_64,
Android 16, 2400 x 1080). Run on 2026-11-08 right after the REPORT.md run, on the APK installed by it. Raw outputs in
`raw/` (local, git-ignored).

| Check | Command | Result | Raw output |
|---|---|---|---|
| Launcher name per language (AC-04, APK side) | `aapt2 dump badging <apk>` | `application-label:'Nightstalker'`, `application-label-fr:'Nightstalker'`, `application-label-en:'Nightstalker'`; `versionName='0.1.1'`, `versionCode='101'` | `raw/device-badging.txt` |
| No advertising ID, no microphone (privacy) | `aapt2 dump badging <apk>` | no `AD_ID`, no `RECORD_AUDIO` permission; permissions: INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS and the app's own DYNAMIC_RECEIVER permission | `raw/device-badging.txt` |
| Landscape, full screen | `dumpsys window` after launch, MainActivity focused | `mDisplayRotation=ROTATION_90`, `mWindowingMode=fullscreen`, config `land`; `type=statusBars ... visible=false`, `type=navigationBars ... visible=false` | `raw/device-orientation.txt` |

The name shown by the phone's launcher in each language (AC-04), frame rate (AC-46), sound and vibrations (AC-47)
and the feel (AC-48) are checked on the user's phone at release (see `docs/DEVICE-CHECKS.md`).
