# tobs_minigames: exports, events and commands

Everything another script can use. Game settings and their defaults are in `config.lua`.

- [Client exports](#client-exports): play a minigame, sweep a vehicle
- [Server exports](#server-exports): play a minigame from the server, trackers on vehicles
- [Events](#events)
- [Commands](#commands)
- [Game names and settings](#game-names-and-settings)

## Client exports

### The minigames

```lua
exports.tobs_minigames:Drill(opts, cb)        -- GTA's Fleeca drilling screen
exports.tobs_minigames:Hack(opts, cb)         -- GTA's hacking laptop (HackConnect + BruteForce)
exports.tobs_minigames:Safe(opts, cb)         -- GTA V's safe dial
exports.tobs_minigames:Thermite(opts, cb)
exports.tobs_minigames:Keypad(opts, cb)
exports.tobs_minigames:Wires(opts, cb)
exports.tobs_minigames:Lockpick(opts, cb)
exports.tobs_minigames:Fingerprint(opts, cb)
exports.tobs_minigames:Hotwire(opts, cb)
exports.tobs_minigames:Lasers(opts, cb)
exports.tobs_minigames:KeyFiling(opts, cb)
exports.tobs_minigames:Tracker(opts, cb)
exports.tobs_minigames:Start(name, opts, cb)  -- any of them by name, e.g. "keypad" (any case)
```

**`opts`** (optional):

| Value | Meaning |
| ----- | ------- |
| `nil` | The default difficulty (`MG.Difficulty`) |
| `"easy"`, `"medium"`, `"hard"` | That difficulty |
| a table | A difficulty plus your own settings: `{difficulty = "hard", pins = 6, time = 30}`. Any setting from `config.lua` can be changed for this one call |

Two extra settings work in the table:

| Setting | Meaning |
| ------- | ------- |
| `fallback = "lockpick"` | If a GTA screen (drill, hack, safe) doesn't load, play this game instead, at the same difficulty |
| `seed = 4` | Web games only: the same puzzle every time (for testing) |

**`cb`** (optional): `function(result) end`. With a callback the export returns at once and calls it when the game ends; without one, call it inside a thread and it waits.

**Returns** (or passes to `cb`):

| Result | Meaning |
| ------ | ------- |
| `true` | Passed |
| `false` | Failed, gave up (ESC / Backspace), died, or another minigame was already open |
| `nil` | A GTA screen (drill, hack, safe) didn't load and there was no `fallback` |

```lua
Citizen.CreateThread(function()
    if exports.tobs_minigames:Wires("hard") then
        TriggerServerEvent("myscript:wiresCut")
    end
end)

exports.tobs_minigames:Lockpick({difficulty = "easy", pins = 5}, function(passed)
    print("lockpick", passed)
end)

local drilled = exports.tobs_minigames:Drill({time = 15000, fallback = "lockpick"})
```

The drill can never be finished faster than its `time` (ms), so use it **instead of** a progress bar, not before one.

### IsActive

```lua
exports.tobs_minigames:IsActive()   -- true while a minigame is open
```

### SweepVehicle

Sweeps a vehicle for a tracker put on it with [`SetVehicleTracker`](#setvehicletracker) (server). The player looks at their phone, the tracker minigame runs (through the server), and a GTA notification shows the result.

```lua
local removed = exports.tobs_minigames:SweepVehicle(vehicle)                       -- inside a thread
exports.tobs_minigames:SweepVehicle(vehicle, function(removed, reason) end)       -- or with a callback
```

| Argument | Meaning |
| -------- | ------- |
| `vehicle` | The vehicle entity (client handle) |
| `cb` | Optional `function(removed, reason)` |

**Returns** `true` when the tracker was found and removed, otherwise `false`. The callback also gets the reason:

| Reason | Meaning |
| ------ | ------- |
| `"removed"` | Found and removed |
| `"missed"` | The minigame failed; the tracker stays |
| `"no_tracker"` | The vehicle has no tracker (after `MG.Sweep.scan` ms of scanning) |
| `"too_far"` | Further than `MG.Sweep.distance` from the vehicle |
| `"gone"` | Someone else removed it first |
| `"no_vehicle"` | Not a vehicle, or it doesn't exist |
| `"busy"` | A sweep is already running |

```lua
exports.ox_target:addGlobalVehicle({{
    name = "sweep", label = "Sweep for trackers", icon = "fa-solid fa-satellite-dish",
    onSelect = function(data) exports.tobs_minigames:SweepVehicle(data.entity) end,
}})
```

## Server exports

### Play

Runs a minigame for a player and gets the result **on the server**, where payouts happen. Use this when the result pays out.

```lua
local passed = exports.tobs_minigames:Play(playerId, "safe", "hard")              -- inside a thread
exports.tobs_minigames:Play(playerId, "keypad", nil, function(passed) end)         -- or with a callback
exports.tobs_minigames:Play(playerId, "wires", function(passed) end)               -- the callback can replace opts
```

| Argument | Meaning |
| -------- | ------- |
| `playerId` | The player's server id |
| `name` | A [game name](#game-names-and-settings) |
| `opts` | Like the client exports: `nil`, a difficulty, or a table |
| `cb` | Optional `function(result)` |

**Returns** `true`, `false` or `nil`, like the client exports. The server only accepts the one answer it asked for, from that player; an answer that came back faster than the game can be played (`MG.MinTime`) counts as `false`; if the player leaves or nothing comes back within 10 minutes, the result is `false`. An unknown game or a player who isn't online gives `false` at once.

The result is still decided in the player's game, so keep checking what matters for your payout (distance, state) as usual.

### SetVehicleTracker

Puts a tracker on a vehicle. Players sweep for it with [`SweepVehicle`](#sweepvehicle).

```lua
exports.tobs_minigames:SetVehicleTracker(vehicle, {difficulty = "hard", job = jobId})
```

| Argument | Meaning |
| -------- | ------- |
| `vehicle` | The vehicle entity (server handle) or its network id |
| `info` | Optional table: `difficulty` for the tracker minigame (default `MG.Sweep.difficulty`), plus anything your script wants back in the events |

**Returns** `true`, or `false` if the vehicle doesn't exist. The tracker is kept in the vehicle's state bag (`tobsTracker`), which only the server can change.

### GetVehicleTracker

```lua
local info = exports.tobs_minigames:GetVehicleTracker(vehicle)   -- the info table, or nil
```

### RemoveVehicleTracker

```lua
exports.tobs_minigames:RemoveVehicleTracker(vehicle)   -- true, or false if the vehicle doesn't exist
```

## Events

| Event | Side | Arguments | When |
| ----- | ---- | --------- | ---- |
| `tobs_minigames:finished` | client | `name, result` | Any minigame ended on this client |
| `tobs_minigames:played` | server | `playerId, name, result, ms, reason` | A `Play` ended. `reason`: `"answered"`, `"too_fast"`, `"left"` (the player left) or `"no_answer"` (10 minutes) |
| `tobs_minigames:trackerRemoved` | server | `playerId, vehicle, info` | A player found and removed a tracker (`vehicle` is the server entity, `info` what you gave `SetVehicleTracker`) |
| `tobs_minigames:trackerMissed` | server | `playerId, vehicle, info` | A sweep's minigame failed; the tracker stays |

```lua
-- server: log every minigame played through Play
AddEventHandler("tobs_minigames:played", function(playerId, name, result, ms, reason)
    print(("%s played %s: %s in %d ms (%s)"):format(GetPlayerName(playerId), name, tostring(result), ms, reason))
end)

-- server: a boosted car's tracker was removed
AddEventHandler("tobs_minigames:trackerRemoved", function(playerId, vehicle, info)
    -- stop the police GPS for info.job ...
end)
```

## Commands

| Command | Who | What |
| ------- | --- | ---- |
| `/minigame` | everyone (`MG.TestCommand`, `false` = off) | The test menu: every game with its last result, difficulty and look to test with, Play all, and the tracker test |
| `/minigame <name> [easy\|medium\|hard]` | everyone | Plays one game straight away |
| `/tobtracker [easy\|medium\|hard]` | admins: `add_ace group.admin command.tobtracker allow` | Puts a test tracker on the vehicle you're in, or the nearest one within 10 m |

Nothing is given or taken by the test commands.

## Game names and settings

Use these names with `Start`, `Play` and `fallback`. Each game's settings (in `config.lua`, per difficulty) can be changed for one call through `opts`.

| Name | Export | Settings |
| ---- | ------ | -------- |
| `"drill"` | `Drill` | `time` (ms, the shortest possible drill), `heat`, `cool`, `minSpeed`, `pins` (depths 0–1), `shake` |
| `"hack"` | `Hack` | `lives`, `timeLimit` (s), `ipConnect`, `background` (0–6), `columnSpeed` (`{min, max}`), `words` |
| `"safe"` | `Safe` | `numbers`, `tolerance`, `lives`, `time` (s), `speed`, `slowSpeed`, `animate`, `combination` (your own numbers, 0–99) |
| `"thermite"` | `Thermite` | `size`, `squares`, `show` (ms), `mistakes`, `time` (s) |
| `"keypad"` | `Keypad` | `length`, `show` (ms), `time` (s), `attempts` |
| `"wires"` | `Wires` | `wires`, `cuts`, `time` (s), `labels` |
| `"lockpick"` | `Lockpick` | `pins`, `zone`, `speed`, `lives`, `time` (s, optional) |
| `"fingerprint"` | `Fingerprint` | `decoys`, `time` (s), `lives` |
| `"hotwire"` | `Hotwire` | `wires`, `tricky`, `mistakes`, `time` (s) |
| `"lasers"` | `Lasers` | `walls`, `sweepers`, `speed`, `gap`, `move`, `lives`, `time` (s) |
| `"keyfiling"` | `KeyFiling` | `cuts`, `tolerance`, `speed`, `lives`, `time` (s) |
| `"tracker"` | `Tracker` | `decoys`, `radius`, `lives`, `time` (s) |
