# Device checks on the emulator: v0.1.0

Commit: 9a21285. APK: `dist/nightstalker-0.1.0-universal.apk`, SHA-256
`d7fd5b6374877a2cfe73cad4f87bbfab160e50ebf1088d578dd01970ee68c5c5`. Emulator: emulator-5554 (Android, 2400 x 1080).

| Check | Command | Result | Raw output |
|---|---|---|---|
| Launcher name per language (AC-04, APK side) | `aapt dump badging <apk>` | `application-label:'Nightstalker'`, `application-label-fr:'Nightstalker'`, `application-label-en:'Nightstalker'` | `raw/device-badging.txt` |
| No advertising ID, no microphone (privacy) | `aapt dump badging <apk>` | no `AD_ID`, no `RECORD_AUDIO` permission; permissions: INTERNET, VIBRATE, ACCESS_NETWORK_STATE, WAKE_LOCK, MODIFY_AUDIO_SETTINGS | `raw/device-badging.txt` |
| Landscape, full screen | `dumpsys window` after launch | `mDisplayRotation=ROTATION_90`, `mWindowingMode=fullscreen`, `land` | `raw/device-orientation.txt` |

The name shown by the phone's launcher in each language (AC-04), frame rate (AC-46), sound and vibrations (AC-47)
and the feel (AC-48) are checked on the user's phone at release (see `docs/DEVICE-CHECKS.md`).
