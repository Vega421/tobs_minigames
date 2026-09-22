<div align="center">

# tobs_minigames

**Six minigames any FiveM script can use: GTA's own drill and hacking laptop, plus a keypad, wire cutting, a lockpick and a fingerprint match**

[![Release](https://img.shields.io/github/v/release/Vega421/tobs_minigames?style=flat-square&color=ff6b2c&label=release)](https://github.com/Vega421/tobs_minigames/releases/latest)
[![Tests](https://img.shields.io/github/actions/workflow/status/Vega421/tobs_minigames/tests.yml?style=flat-square&label=tests)](https://github.com/Vega421/tobs_minigames/actions/workflows/tests.yml)
[![License](https://img.shields.io/github/license/Vega421/tobs_minigames?style=flat-square)](LICENSE)

[**Download**](https://github.com/Vega421/tobs_minigames/releases/latest) · [Changelog](CHANGELOG.md) · [Report a problem](https://github.com/Vega421/tobs_minigames/issues)

</div>

---

One call from your script opens a minigame and tells you whether the player passed. Works on every framework, because it doesn't need one.

## Minigames

| Minigame | What the player does |
| -------- | -------------------- |
| **Drill** | GTA Online's Fleeca drilling screen: push the drill through 4 lock pins without overheating it |
| **Hack** | GTA Online's hacking laptop: HackConnect.exe (find the IP), then BruteForce.exe (crack the password) |
| **Keypad** | Remember a code, then type it before the time runs out |
| **Wires** | Cut the wires in the order the clues give ("the wire right below red") |
| **Lockpick** | Set each pin by stopping the pick in its sweet spot |
| **Fingerprint** | Pick the 4 pieces of a fingerprint from a set with decoys |

Every minigame has an easy, medium and hard setting, and every setting can be changed. The web minigames are in English, Danish, German, Swedish, Norwegian and Dutch.

## Use it in your script

From client code, inside a thread (the call waits until the game ends):

```lua
local passed = exports.tobs_minigames:Keypad()                 -- MG.Difficulty (medium)
local passed = exports.tobs_minigames:Wires("hard")            -- a difficulty
local passed = exports.tobs_minigames:Lockpick({pins = 6})     -- your own settings
local passed = exports.tobs_minigames:Start("fingerprint", "easy")

local drilled = exports.tobs_minigames:Drill({time = 15000})   -- true, false, or nil
if drilled == nil then
    -- GTA's drilling screen didn't load: use a progress bar or another minigame
end
```

- Returns `true` when the player passed, `false` when they failed, gave up (ESC), died, or another minigame was already open.
- `Drill` and `Hack` return `nil` when GTA's screen couldn't load.
- `exports.tobs_minigames:IsActive()` is `true` while a minigame is open.
- The drill can never be finished faster than its `time`, so it replaces a progress bar: don't run both.

**Security:** a minigame runs in the player's game, so a cheater can fake the result. Anything that pays out must still be checked on the server (time taken, distance, state), like any FiveM minigame.

## Install

1. Download the latest release and put `tobs_minigames` in your `resources` folder.
2. Add `ensure tobs_minigames` to `server.cfg`, before the scripts that use it.
3. Try each one in game with `/minigame keypad hard` (turn off with `MG.TestCommand = false`).

## Settings

Everything is in `config.lua`: the language (`MG.Locale`), the default difficulty (`MG.Difficulty`), and each minigame's settings for easy, medium and hard, with what every value does.

## Tests

The rules of every minigame are tested outside the game on every push:

```bash
lua5.4 tests/main_test.lua && lua5.4 tests/drill_test.lua && lua5.4 tests/hack_test.lua
node --test tests/web/
```

## Credits

Made by Vega. GPL-3.0. The drill's scaleform method names come from [meta-hub/fivem-drilling](https://github.com/meta-hub/fivem-drilling) (GPL-3.0). The hacking laptop's method names and click results were looked up in [TransitNode/Hacking_PC](https://github.com/TransitNode/Hacking_PC) and draobrehtom's HackingGame gist; no code was copied from them. Sound names were checked against [DurtyFree/gta-v-data-dumps](https://github.com/DurtyFree/gta-v-data-dumps).
