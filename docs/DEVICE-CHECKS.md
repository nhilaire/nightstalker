# Device checks (release build on the phone)

The `[device]` and `[manual]` acceptance criteria are proven on the user's phone during `/verify-app` and
`/release-apk`. Each check names the command or observation that proves it.

| AC | Check | Proof |
|---|---|---|
| AC-04 | Name under the icon in French and in English | `aapt dump badging <apk>` lists `application-label:'Nightstalker'` and the `fr` / `en` labels; phone launcher in both languages |
| AC-45 | Cold start < 3 s, no crash or ANR during the Maestro flows | `verify.mjs` cold start line and logcat crash buffer |
| AC-46 | No visible jank during 60 s of play | `adb logcat -s ReactNativeJS` shows `FRAME_STATS fps=... slow=...%` every 10 s of play; average >= 55 fps |
| AC-47 | Sounds, heartbeat and vibrations | `SOUND_LOADED <name>` lines in logcat (explosion, gun_spawn, heartbeat_180...); the player hears the heartbeat speed up when the main robot changes and feels vibrations on shoot, kill, death |
| AC-42 | Background pause | Home button during a run, back to the app: the pause overlay is shown and the heartbeat is silent |
| AC-48 | Feel | The user plays a few runs: controls responsive, tense arcade feel of the prototype |

## Emulator note

Android shows a one-time "Viewing full screen" tip in immersive apps, which blocks Maestro taps. Before the flows:
`adb shell settings put secure immersive_mode_confirmations confirmed`.
