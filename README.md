<div align="center">

# tobs_minigames

**Twelve minigames any FiveM script can use, including GTA's own drill, hacking laptop and safe dial**

[![Release](https://img.shields.io/github/v/release/Vega421/tobs_minigames?style=flat-square&color=ff6b2c&label=release)](https://github.com/Vega421/tobs_minigames/releases/latest)
[![Tests](https://img.shields.io/github/actions/workflow/status/Vega421/tobs_minigames/tests.yml?style=flat-square&label=tests)](https://github.com/Vega421/tobs_minigames/actions/workflows/tests.yml)
[![License](https://img.shields.io/github/license/Vega421/tobs_minigames?style=flat-square)](LICENSE)

[**Download**](https://github.com/Vega421/tobs_minigames/releases/latest) · [**Documentation**](https://vega421.github.io/scripts/tobs-minigames/) · [Exports](EXPORTS.md) · [Changelog](CHANGELOG.md) · [Report a problem](https://github.com/Vega421/tobs_minigames/issues)

</div>

---

One call from your script opens a minigame and tells you whether the player passed. No framework, database or items needed: it works on Qbox, ESX, QBCore, vRP or no framework at all.

## Minigames

| Minigame | What the player does |
| -------- | -------------------- |
| **Drill** | GTA Online's Fleeca drilling screen: push through 4 lock pins without overheating |
| **Hack** | GTA Online's hacking laptop: HackConnect.exe, then BruteForce.exe |
| **Safe** | GTA V's safe dial: turn to each number, turn back when it clicks |
| **Thermite** | Remember which pads lit up on the charge, then press them |
| **Keypad** | Remember the code on the display, then type it |
| **Wires** | Cut the wires in the order of the clues on the sticky note |
| **Lockpick** | Stop the marker in each pin's sweet spot |
| **Fingerprint** | Clone prints like the Casino heist: pick the 4 pieces of each print before they scramble |
| **Hotwire** | Connect each wire under the steering column to the terminal with its colour's name |
| **Lasers** | Cross the room on a tablet without touching the moving lasers |
| **Key filing** | File each cut of a key in the vice down to its line |
| **Tracker** | Sweep a car with an RF detector and find the GPS tracker |

Each has an easy, medium and hard setting. The web minigames are drawn as real objects with GTA's key bar at the bottom right; the drill, hack and safe are GTA's own screens. English, Danish, German, Swedish, Norwegian and Dutch.

## Install

1. Download `tobs_minigames-vX.Y.Z.zip` from the [latest release](https://github.com/Vega421/tobs_minigames/releases/latest) and put the `tobs_minigames` folder in `resources`.
2. Add `ensure tobs_minigames` to `server.cfg`, above the scripts that use it.
3. Restart the server and type **`/minigame`** in game: a test menu with every game, a difficulty and a look to test with, and **Play all**. Nothing is given or taken.

The defaults in `config.lua` work as they are. Every setting: [Configuration](https://vega421.github.io/scripts/tobs-minigames/configuration/).

**Your server runs qb-minigames, memorygame, mhacking or safecracker?** The zip's `[tobs_minigames-compat]` folder has a drop-in for each, so the scripts that call them play tobs_minigames' games without any edits. Replace the original with the folder of the same name and `ensure` it after `tobs_minigames`. See [Drop-ins](https://vega421.github.io/scripts/tobs-minigames/drop-ins/).

## Use it in your script

```lua
-- client, inside a thread
local passed = exports.tobs_minigames:Keypad("hard")

-- client, with a callback
exports.tobs_minigames:Wires("easy", function(passed) end)

-- server: use this when the result pays out
local passed = exports.tobs_minigames:Play(source, "safe", "hard")
```

A minigame runs in the player's game, so a cheater can fake the result, as with any FiveM minigame. `Play` accepts one answer, from that player, and not faster than the game can be played; your script should still check anything that pays out.

Every export, option, event and command, including trackers on vehicles for car boosting: [EXPORTS.md](EXPORTS.md) or [For developers](https://vega421.github.io/scripts/tobs-minigames/exports/).

## Working on it

- `dev/preview.html` plays the web minigames in a browser, without FiveM. After changing `config.lua` or the texts, run `lua5.4 dev/build_preview.lua`.
- [TESTING.md](TESTING.md) is the in-game checklist, with and without the drop-ins; `dev/tobs_compattest` (`/compattest`) calls the drop-ins like other scripts do.
- The tests run on every push. Locally:

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
