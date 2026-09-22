# tobs_minigames: exports

Everything your script can call. Default settings are in `config.lua`.

## At a glance

| Export | Side | What it does |
| ------ | :--: | ------------ |
| `Keypad()`, `Wires()`, `Lasers()`, … | client | Play a minigame ([all 12](#the-12-minigames)) |
| `Start(name)` | client | Play a minigame by name |
| `IsActive()` | client | Is a minigame open right now? |
| `GaveUp()` | client | Did the last minigame end with ESC? |
| `SweepVehicle(vehicle)` | client | Sweep a car for a GPS tracker |
| `Play(playerId, name)` | server | Play a minigame and get the result on the server |
| `SetVehicleTracker(vehicle)` | server | Put a GPS tracker on a car |
| `GetVehicleTracker(vehicle)` | server | Does the car have a tracker? |
| `RemoveVehicleTracker(vehicle)` | server | Take the tracker off |

## Cheat sheet

```lua
-- CLIENT (inside a thread)
local passed = exports.tobs_minigames:Keypad()                  -- normal difficulty
local passed = exports.tobs_minigames:Wires("hard")              -- easy / medium / hard
local passed = exports.tobs_minigames:Lockpick({pins = 6})       -- your own settings
local passed = exports.tobs_minigames:Start("thermite", "easy")  -- by name

-- CLIENT (with a callback: no thread needed)
exports.tobs_minigames:Hotwire("easy", function(passed) end)

-- SERVER (use this when the result pays out)
local passed = exports.tobs_minigames:Play(source, "safe", "hard")
```

---

## Playing a minigame

### Three ways to call it

```lua
-- 1. Wait for the result (inside a thread)
local passed = exports.tobs_minigames:Wires("hard")

-- 2. Get the result in a callback (returns at once)
exports.tobs_minigames:Wires("hard", function(passed) end)

-- 3. By name
local passed = exports.tobs_minigames:Start("wires", "hard")
```

### Settings for one call

- Nothing → the normal difficulty (`MG.Difficulty`)
- `"easy"`, `"medium"` or `"hard"`
- A table → a difficulty plus any setting from `config.lua`:

```lua
exports.tobs_minigames:Lockpick({difficulty = "hard", pins = 6, time = 30})
```

Extra settings:

- `fallback = "lockpick"`: if a GTA screen (drill, hack, safe) doesn't load, play this instead
- `animate = false`: no animation on the player (use it when your script plays its own)
- `animation = "tablet"`: a different animation for this call (`"tablet"`, `"phone"`, `"keypad"`, `"repair"`, `"kneel"`, `"hotwire"`)
- `seed = 4`: the same puzzle every time (web games, for testing)

The keypad also takes `code = "4721"` (a code the player already knows) with `show = 0` (not shown first).

### The result

- `true`: **passed**
- `false`: **failed**, gave up, died, or another minigame was already open
- `nil`: a GTA screen didn't load (and there was no `fallback`)

### The drill

The drill can never be finished faster than its `time`, so use it **instead of** a progress bar:

```lua
local drilled = exports.tobs_minigames:Drill({time = 15000, fallback = "lockpick"})
```

### Animations

While a web minigame is open, the player holds a tablet, looks at a phone, presses a keypad, works with their hands or kneels, so others can see what's going on. Set per game in `MG.Animations` (`config.lua`); `animate = false` skips it for one call.

---

## From the server: `Play`

Runs the minigame in the player's game and gives you the result on the server. **Use this when the result pays out.**

```lua
local passed = exports.tobs_minigames:Play(source, "safe", "hard")
if passed then
    -- pay the player
end
```

Or with a callback: `exports.tobs_minigames:Play(source, "keypad", nil, function(passed) end)`

What the server checks for you:

- Only the one answer it asked for, from that player, counts
- An answer that came faster than the game can be played counts as **failed** (limits: `MG.MinTime`)
- The player leaves, or nothing comes back in 10 minutes → **failed**

Still check what matters for your payout (distance, state) in your own script.

---

## Trackers on vehicles

Put a GPS tracker on a car from the server. Players sweep for it with the tracker minigame. Your script hears when it's removed.

**Server: put one on**

```lua
exports.tobs_minigames:SetVehicleTracker(vehicle, {difficulty = "hard", job = jobId})

AddEventHandler("tobs_minigames:trackerRemoved", function(playerId, vehicle, info)
    -- info.job: stop the police GPS
end)
```

`vehicle` can be the entity or its network id. Anything you put in the table comes back as `info`.

**Client: sweep for it**

```lua
exports.ox_target:addGlobalVehicle({{
    name = "sweep", label = "Sweep for trackers", icon = "fa-solid fa-satellite-dish",
    onSelect = function(data) exports.tobs_minigames:SweepVehicle(data.entity) end,
}})
```

`SweepVehicle` returns `true` when the tracker was removed. The player sees a notification either way.

<details>
<summary>All tracker exports and the sweep's reasons</summary>

```lua
exports.tobs_minigames:SetVehicleTracker(vehicle, info)   -- server: true, or false if no such vehicle
exports.tobs_minigames:GetVehicleTracker(vehicle)         -- server: the info table, or nil
exports.tobs_minigames:RemoveVehicleTracker(vehicle)      -- server: true, or false if no such vehicle
exports.tobs_minigames:SweepVehicle(vehicle, function(removed, reason) end)   -- client
```

The callback's `reason`:

- `"removed"`: found and removed
- `"missed"`: the minigame failed; the tracker stays
- `"no_tracker"`: the car has no tracker
- `"too_far"`: too far from the car (`MG.Sweep.distance`)
- `"gone"`: someone else removed it first
- `"no_vehicle"`: not a car
- `"busy"`: already sweeping

</details>

---

## Events

| Event | Side | You get |
| ----- | :--: | ------- |
| `tobs_minigames:finished` | client | `name, result`: any minigame ended |
| `tobs_minigames:played` | server | `playerId, name, result, ms, reason`: a `Play` ended |
| `tobs_minigames:trackerRemoved` | server | `playerId, vehicle, info`: a tracker was removed |
| `tobs_minigames:trackerMissed` | server | `playerId, vehicle, info`: a sweep failed |

`reason` in `played` is `"answered"`, `"too_fast"`, `"left"` or `"no_answer"`.

```lua
AddEventHandler("tobs_minigames:played", function(playerId, name, result, ms, reason)
    print(GetPlayerName(playerId), name, result, ms, reason)
end)
```

---

## Commands

| Command | Who | What |
| ------- | --- | ---- |
| `/minigame` | everyone | Test menu: play one or all games, see the results |
| `/minigame wires hard` | everyone | Play one game straight away |
| `/tobtracker hard` | admins | Put a test tracker on the nearest car |

`/tobtracker` needs `add_ace group.admin command.tobtracker allow`. The test commands give nothing. `MG.TestCommand = false` turns `/minigame` off.

---

## Drop-in replacements

Scripts written for **qb-minigames**, **memorygame**, **mhacking** or **safecracker** (Qbox's bank and store robberies use the last two) can use tobs_minigames without being changed: replace the original with the folder of the same name from `[tobs_minigames-compat]` in the download (`compat/` in this repo). See [compat/README.md](compat/README.md).

---

## The 12 minigames

| Name | Export | What the player does |
| ---- | ------ | -------------------- |
| `drill` | `Drill` | GTA's drill: push through the pins without overheating |
| `hack` | `Hack` | GTA's hacking laptop: HackConnect, then BruteForce |
| `safe` | `Safe` | GTA's safe dial: turn back on each click |
| `thermite` | `Thermite` | Click the squares that lit up |
| `keypad` | `Keypad` | Type the code you saw |
| `wires` | `Wires` | Cut the wires in the right order |
| `lockpick` | `Lockpick` | Stop the pick in each sweet spot |
| `fingerprint` | `Fingerprint` | Pick the 4 pieces of the print |
| `hotwire` | `Hotwire` | Connect each wire to its colour's name |
| `lasers` | `Lasers` | Cross the room without touching a laser |
| `keyfiling` | `KeyFiling` | File each cut down to its line |
| `tracker` | `Tracker` | Find the hidden tracker by its signal |

<details>
<summary>Every game's settings (change them per call, or in config.lua)</summary>

| Game | Settings |
| ---- | -------- |
| `drill` | `time` (ms, shortest drill), `heat`, `cool`, `minSpeed`, `pins`, `shake` |
| `hack` | `lives`, `timeLimit` (s), `ipConnect`, `background` (0–6), `columnSpeed`, `words` |
| `safe` | `numbers`, `tolerance`, `lives`, `time` (s), `speed`, `slowSpeed`, `animate`, `combination` |
| `thermite` | `size`, `squares`, `show` (ms), `mistakes`, `time` (s) |
| `keypad` | `length`, `show` (ms, `0` = not shown), `time` (s), `attempts`, `code` (a code the player already knows) |
| `wires` | `wires`, `cuts`, `time` (s), `labels` |
| `lockpick` | `pins`, `zone`, `speed`, `lives`, `time` (s, optional) |
| `fingerprint` | `decoys`, `time` (s), `lives` |
| `hotwire` | `wires`, `tricky`, `mistakes`, `time` (s) |
| `lasers` | `walls`, `sweepers`, `speed`, `gap`, `move`, `lives`, `time` (s) |
| `keyfiling` | `cuts`, `tolerance`, `speed`, `lives`, `time` (s) |
| `tracker` | `decoys`, `radius`, `lives`, `time` (s) |

What each setting does is explained next to it in `config.lua`.

</details>
