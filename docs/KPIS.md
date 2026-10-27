# KPIs and monitoring: Nightstalker

Firebase project: nightstalker (free Spark plan, never upgraded to Blaze)
Android app: io.github.nhilaire.nightstalker
Data collection: opt-in only (consent screen). Analytics data retention: 2 months. Google signals: off.
Events: exactly the PRD "Telemetry events" table, typed in `src/telemetry/events.ts`.

## Business KPIs

| KPI | Definition | Where to read it | Target |
|---|---|---|---|
| D1 retention | % of new users back on day 1 | Analytics > Reports > Retention | >= 25 % |
| D7 retention | % of new users back on day 7 | Analytics > Reports > Retention | >= 8 % |
| Runs per session | `game_start` count / `session_start` count | Analytics > Events > game_start, session_start | >= 2 |
| Tier funnel | runs reaching each tier: `tier_reached` by `tier` vs `game_start` | Analytics > Events > tier_reached (dimension `tier`) | >= 50 % of runs reach tier 1 |
| Score distribution | `score` on `game_over` | Analytics > Events > game_over (metric `score`) | observe, to tune difficulty |
| Run length | `duration_s` on `game_over` | Analytics > Events > game_over (metric `duration_s`) | median >= 3 min (observe) |
| Settings adoption | share of runs by `fire_mode`, `modern`, `controls`; `settings_change` by `setting`/`value` | Analytics > Events > game_start, settings_change | observe |
| Power-up usage | `powerup_pickup` by `kind` | Analytics > Events > powerup_pickup (dimension `kind`) | observe |
| Quit vs death | `game_over` by `reason` | Analytics > Events > game_over (dimension `reason`) | observe |
| Daily active users | users with an engagement per day | Analytics > Reports > Engagement overview | observe |

## Technical KPIs

| KPI | Definition | Where to read it | Target |
|---|---|---|---|
| Crash-free users | % users without a fatal crash | Crashlytics > Dashboard | >= 99 % |
| ANR rate | app not responding events | Crashlytics > Dashboard (filter ANR) | < 0.5 % |
| Non-fatal errors | `reportError()` calls | Crashlytics > Non-fatals | low and stable |
| APK size | arm64 release APK size | docs/evidence/v*/REPORT.md | < 40 MB |
| Cold start | launch to home screen | evidence report (device check) | < 3 s |
| Frame rate | average fps during a 60 s run on the phone | evidence report (device check, AC-46) | >= 55 fps |

## Custom definitions to register in Analytics

Analytics > Admin > Custom definitions (free, up to 50 dimensions / 50 metrics):

| Name | Scope | Param | Type |
|---|---|---|---|
| tier | Event | tier | dimension |
| kind | Event | kind | dimension |
| modern | Event | modern | dimension |
| fire_mode | Event | fire_mode | dimension |
| controls | Event | controls | dimension |
| reason | Event | reason | dimension |
| setting | Event | setting | dimension |
| value | Event | value | dimension |
| score | Event | score | metric (standard) |
| duration_s | Event | duration_s | metric (seconds) |

## How to check that events arrive

1. Build with `firebase/google-services.json` present, accept the consent screen.
2. `adb shell setprop debug.firebase.analytics.app io.github.nhilaire.nightstalker` then open Analytics > DebugView.
3. The factory's `verify.mjs --telemetry` captures the `Logging event` lines from logcat as evidence.
Standard reports update within ~24 h; DebugView is real time.
