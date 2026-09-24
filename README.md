<div align="center">

# tobs_minigames

**Twelve minigames any FiveM script can use, including GTA's own drill, hacking laptop and safe dial**

[![Release](https://img.shields.io/github/v/release/Vega421/tobs_minigames?style=flat-square&color=ff6b2c&label=release)](https://github.com/Vega421/tobs_minigames/releases/latest)
[![Tests](https://img.shields.io/github/actions/workflow/status/Vega421/tobs_minigames/tests.yml?style=flat-square&label=tests)](https://github.com/Vega421/tobs_minigames/actions/workflows/tests.yml)
[![License](https://img.shields.io/github/license/Vega421/tobs_minigames?style=flat-square)](LICENSE)

[**Download**](https://github.com/Vega421/tobs_minigames/releases/latest) · [All exports](EXPORTS.md) · [Changelog](CHANGELOG.md) · [Report a problem](https://github.com/Vega421/tobs_minigames/issues)

</div>

---

One call from your script opens a minigame and tells you whether the player passed. No framework, database or items needed.

## Minigames

| Minigame | What the player does |
| -------- | -------------------- |
| **Drill** | GTA Online's Fleeca drilling screen: push through 4 lock pins without overheating |
| **Hack** | GTA Online's hacking laptop: HackConnect.exe, then BruteForce.exe |
| **Safe** | GTA V's safe dial: turn to each number, turn back when it clicks |
| **Thermite** | Remember which squares lit up, then click them |
| **Keypad** | Remember a code, then type it |
| **Wires** | Cut the wires in the order of the clues |
| **Lockpick** | Stop the pick in each pin's sweet spot |
| **Fingerprint** | Pick the 4 pieces of a fingerprint |
| **Hotwire** | Connect each wire to the terminal with its colour's name |
| **Lasers** | Cross a room without touching the moving lasers |
| **Key filing** | File each cut of a key down to its line |
| **Tracker** | Find a GPS tracker on a car by its signal |

Every minigame has an easy, medium and hard setting, and comes in English, Danish, German, Swedish, Norwegian and Dutch.

## Install

1. Put the `tobs_minigames` folder in your `resources` folder.
2. Add `ensure tobs_minigames` to `server.cfg`.
3. Restart the server and type **`/minigame`** in game.

That's all. It works on Qbox, ESX, QBCore, vRP or no framework at all, and the default settings in `config.lua` work as they are.

### Optional: let your other scripts use it

The download also has a `[tobs_minigames-compat]` folder. You only need it if your server runs **qb-minigames**, **memorygame**, **mhacking** or **safecracker**; the server console tells you at start. For each one:

1. Delete the original folder (for example `safecracker`).
2. Copy the folder with the same name from `[tobs_minigames-compat]` into `resources`.
3. `ensure` it **after** `tobs_minigames`.

The scripts that used the original now play tobs_minigames' games, without any edits. Details: [compat/README.md](compat/README.md).

## Testing in game

Type **`/minigame`** for the test menu:

- every minigame with its last result ("✓ Passed · 12.4 s · hard")
- a difficulty and a look to test with
- **Play all**: all twelve in a row (ESC stops the run)
- a test tracker on the nearest car, and a sweep for it (admins: `add_ace group.admin command.tobtracker allow`)

`/minigame wires hard` plays one straight away. Results also go to the F8 console. Nothing is given or taken.

## Use it in your script

```lua
-- client, inside a thread
local passed = exports.tobs_minigames:Keypad("hard")

-- client, with a callback
exports.tobs_minigames:Wires("easy", function(passed) end)

-- server: use this when the result pays out
local passed = exports.tobs_minigames:Play(source, "safe", "hard")
```

Every export, setting, event and command is in **[EXPORTS.md](EXPORTS.md)**, including trackers on vehicles for car boosting.

**Security:** a minigame runs in the player's game, so a cheater can fake the result, as with any FiveM minigame. `Play` makes that harder (one answer, the right player, not too fast), but the server must still check anything that pays out.

## Looks

| Style | Look |
| ----- | ---- |
| `"default"` | A dark panel with an orange accent |
| `"terminal"` | A green hacker terminal with scanlines and a glow |
| `"glass"` | A frosted glass panel over the game |

Pick one with `MG.Style` in `config.lua`, and change single colours with `MG.Theme`, for example `MG.Theme = {accent = "#3e7bfa"}`.

The three GTA screens (drill, hack, safe) show GTA's own key bar at the bottom right, like in GTA
Online, plus the game's name, the time or lives, and messages (a broken pin, a locked number) at the
top, and start with the same "how to play" card as the web minigames.

The web minigames also:

- start with a short "how to play" card (`MG.Intro`)
- show keys as keycaps, lives as dots, and the seconds left
- play GTA's hacking sounds (`MG.Sounds`)
- animate the player: a tablet, a phone, a keypad, hands at work or kneeling (`MG.Animations`)
- keep the same size on any screen (`MG.Scale`)
- have bigger text (`MG.TextSize`) and less movement (`MG.ReducedMotion`) for players who need it
- show each wire's colour name and a pattern, for colour-blind players

## Settings

Everything is in `config.lua`, with what each value does next to it: language, default difficulty, look and colours, animations, sounds, and each minigame's settings for easy, medium and hard.

## For developers

**Preview in a browser:** open `dev/preview.html` to play the web minigames without FiveM. After changing `config.lua` or the texts, run `lua5.4 dev/build_preview.lua`.

**Testing in game:** [TESTING.md](TESTING.md) is a checklist for everything, with and without the drop-ins. `dev/tobs_compattest` is a small test resource (`/compattest`) that calls the drop-ins like other scripts do.

**Tests** run on every push. Locally:

```bash
for f in tests/*_test.lua; do lua5.4 "$f" || break; done
node --test tests/web/logic.test.js
```

## Credits

Made by Vega. GPL-3.0.

- Drill scaleform method names: [meta-hub/fivem-drilling](https://github.com/meta-hub/fivem-drilling) (GPL-3.0)
- Hacking laptop method names: [TransitNode/Hacking_PC](https://github.com/TransitNode/Hacking_PC) and draobrehtom's HackingGame gist (names only)
- Safe dial sprite names: [TimothyDexter/FiveM-SafeCrackingMinigame](https://github.com/TimothyDexter/FiveM-SafeCrackingMinigame) (names only)
- Sound, animation, scenario and prop names checked in [DurtyFree/gta-v-data-dumps](https://github.com/DurtyFree/gta-v-data-dumps)
- Drop-ins match the exports and events of [qb-minigames](https://github.com/qbcore-fivem/qb-minigames) (GPL-3.0), [safecracker](https://github.com/qbcore-fivem/safecracker), memorygame and mhacking (names only, no code copied)
