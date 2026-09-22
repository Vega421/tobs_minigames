<div align="center">

# tobs_minigames

**Eight minigames any FiveM script can use: GTA's own drill, hacking laptop and safe dial, plus thermite, a keypad, wire cutting, a lockpick and a fingerprint match**

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
| **Safe** | GTA V's safe dial: turn to each number, and turn back when the tumbler clicks |
| **Thermite** | Squares light up on a grid; click the same ones from memory |
| **Keypad** | Remember a code, then type it before the time runs out |
| **Wires** | Cut the wires in the order the clues give ("the wire right below red") |
| **Lockpick** | Set each pin by stopping the pick in its sweet spot |
| **Fingerprint** | Pick the 4 pieces of a fingerprint from a set with decoys |

The drill, laptop and safe use GTA's own screens, sounds and animations, and the web minigames use GTA's hacking sounds (`MG.Sounds`). The wires each show their colour's name and have their own pattern, for colour-blind players (`MG.Wires.labels`). Every minigame has an easy, medium and hard setting, and every setting can be changed. The web minigames are in English, Danish, German, Swedish, Norwegian and Dutch.

## Use it in your script

Add `tobs_minigames` to your resource's dependencies (or see [Optional](#optional-tobs_minigames) below), then pick the way that fits.

### On the server (use this when the result pays out)

```lua
-- server.lua, inside an event handler or thread
local passed = exports.tobs_minigames:Play(source, "safe", "hard")
if passed then
    -- open the safe, pay the player...
end
```

The server asks the player's game to run the minigame and waits for the answer. It only accepts that one answer, from that player, and counts an answer that came back faster than the game can be played as failed. Keep checking what matters for your payout (distance, state) as usual.

### On the client

```lua
-- inside a thread: waits until the game ends
local passed = exports.tobs_minigames:Keypad("hard")

-- or with a callback: returns at once
exports.tobs_minigames:Wires("easy", function(passed)
    if passed then TriggerServerEvent("myscript:wiresCut") end
end)
```

### Settings for one call

```lua
exports.tobs_minigames:Lockpick()                                 -- MG.Difficulty (medium)
exports.tobs_minigames:Lockpick("easy")                           -- a difficulty
exports.tobs_minigames:Lockpick({difficulty = "hard", pins = 6})  -- a difficulty plus your own changes
exports.tobs_minigames:Start("lockpick", "easy")                  -- any game by name
```

Every setting is listed in `config.lua`.

### GTA's screens

`Drill`, `Hack` and `Safe` use GTA's own screens. If one doesn't load, the result is `nil`. Give a `fallback` to play another game instead:

```lua
local drilled = exports.tobs_minigames:Drill({time = 15000, fallback = "lockpick"})
```

The drill can never be finished faster than its `time`, so use it instead of a progress bar, not before one. `Safe({animate = true})` also plays GTA's safe cracking animations: stand the player at the safe first.

### Optional tobs_minigames

To make it optional in your script, with a plain fallback when it isn't installed:

```lua
local function Minigame(name, opts)
    if GetResourceState("tobs_minigames") ~= "started" then return true end -- not installed: skip it
    return exports.tobs_minigames:Start(name, opts)
end
```

### Results

- `true`: passed. `false`: failed, gave up (ESC), died, or another minigame was already open. `nil`: a GTA screen didn't load and there was no fallback.
- `exports.tobs_minigames:IsActive()` is `true` while a minigame is open.
- Other scripts can listen for every result: `AddEventHandler("tobs_minigames:finished", function(name, result) end)` (client).

**Security:** a minigame runs in the player's game, so a cheater can fake the result, as with any FiveM minigame. `Play` makes that harder (one answer, the right player, not too fast), but the server must still check anything that pays out.

## Install

1. Download the latest release and put `tobs_minigames` in your `resources` folder.
2. Add `ensure tobs_minigames` to `server.cfg`, before the scripts that use it.
3. Try each one in game with `/minigame keypad hard` (turn off with `MG.TestCommand = false`).

## Settings

Everything is in `config.lua`: the language (`MG.Locale`), the default difficulty (`MG.Difficulty`), and each minigame's settings for easy, medium and hard, with what every value does.

## Tests

The rules of every minigame are tested outside the game on every push:

```bash
lua5.4 tests/main_test.lua && lua5.4 tests/server_test.lua && lua5.4 tests/drill_test.lua && lua5.4 tests/hack_test.lua && lua5.4 tests/safe_test.lua
node --test tests/web/logic.test.js
```

## Preview in a browser

Open `dev/preview.html` (double-click it) to play the web minigames without FiveM: pick the game, difficulty and language. Results and sounds show in the log. It uses the real `web/` files and the settings from `config.lua`; after changing `config.lua` or the texts, run `lua5.4 dev/build_preview.lua`. `dev/` isn't in the release zip.

## Credits

Made by Vega. GPL-3.0. The drill's scaleform method names come from [meta-hub/fivem-drilling](https://github.com/meta-hub/fivem-drilling) (GPL-3.0). The hacking laptop's method names and click results were looked up in [TransitNode/Hacking_PC](https://github.com/TransitNode/Hacking_PC) and draobrehtom's HackingGame gist; no code was copied from them. The safe dial's sprite names were looked up in [TimothyDexter/FiveM-SafeCrackingMinigame](https://github.com/TimothyDexter/FiveM-SafeCrackingMinigame) (no license, names only). Sound, animation and audio bank names were checked against [DurtyFree/gta-v-data-dumps](https://github.com/DurtyFree/gta-v-data-dumps).
