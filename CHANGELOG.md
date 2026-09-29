# Changelog

All notable changes to tobs_minigames. Each version is also a [GitHub release](https://github.com/Vega421/tobs_minigames/releases) with a ready-to-use zip.

## 1.0.0 · 2026-09-29

**The first version: twelve minigames any script can use.**

- **GTA's own screens:** the Fleeca **drill** (it can't be finished faster than its `time`, so it can stand in for a progress bar), the Pacific Standard hacking laptop (**hack**: HackConnect.exe, then BruteForce.exe) and GTA V's **safe** dial with its tumbler sounds. Each shows GTA's key bar, the game's name with the depth, time or lives, and short messages
- **Nine web minigames, each drawn as one real object:** **thermite** (a charge's control unit with rubber pads), **keypad** (a wall keypad with a display), **wires** (an electrical box and the clues on a sticky note), **lockpick** (the lock cut open, with a scale for the sweet spot), **fingerprint** (a Casino-style cloner: pick the 4 pieces of each print), **hotwire** (the wiring under the steering column), **lasers** (a tablet with the room's floor plan), **key filing** (a brass key in a vice) and **tracker** (the car from above and an RF detector)
- Easy, medium and hard for each game, every setting in `config.lua`, and any of them can be changed for one call
- **For scripts:** client exports that wait in a thread or take a callback, `Start(name)`, `IsActive()`, `GaveUp()`; `fallback` plays another game when a GTA screen doesn't load; the `tobs_minigames:finished` event
- **Honest results on the server:** `Play(playerId, name, opts)` accepts one answer, from that player, and not faster than the game can be played (`MG.MinTime`); the `tobs_minigames:played` event for logs
- **Trackers on vehicles** for car boosting: `SetVehicleTracker` / `GetVehicleTracker` / `RemoveVehicleTracker`, `SweepVehicle(vehicle)`, and the `trackerRemoved` / `trackerMissed` events
- A "how to play" card before each game (`MG.Intro`), GTA's key bar, GTA's hacking sounds (`MG.Sounds`), and animations on the player so others see what they're doing (`MG.Animations`)
- Three looks (`MG.Style`: default, terminal and glass) and your own colours (`MG.Theme`); the same size on every resolution (`MG.Scale`), `MG.TextSize` and `MG.ReducedMotion`; colour names on the wires for colour-blind players
- `/minigame`: a test menu with every game, a difficulty and look to try, Play all, and a test tracker (`/tobtracker`, admins)
- English, Danish, German, Swedish, Norwegian and Dutch

