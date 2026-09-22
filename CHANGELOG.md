# Changelog

All notable changes to tobs_minigames. Each version is also a [GitHub release](https://github.com/Vega421/tobs_minigames/releases) with a ready-to-use zip.

## 1.0.0 · unreleased

**The first version: twelve minigames for any script.**

- **Drill:** GTA Online's Fleeca drilling screen, with heat, 4 lock pins, jams, camera shake and controller vibration. It can't be finished faster than its `time`
- **Hack:** GTA Online's hacking laptop: HackConnect.exe, then BruteForce.exe, with shared lives and a time limit
- **Safe:** GTA V's safe dial, with its tumbler sounds, a controller buzz on each click, and optional safe cracking animations
- **Thermite:** remember the squares that light up on a grid
- **Keypad, wire cutting, lockpick and fingerprint:** new web minigames
- **Hotwire, laser grid, key filing and tracker sweep:** web minigames for car theft, heists and stolen cars. Every laser room is checked to be crossable in time
- Easy, medium and hard for each, and every setting can be changed by the calling script
- **Easy to build in:** `exports.tobs_minigames:Play(playerId, name, opts)` runs a game from the server (one answer, from that player, not faster than possible); client exports wait in a thread or take a callback; `fallback` plays another game when a GTA screen doesn't load; the `tobs_minigames:finished` event reports every result
- GTA's hacking sounds in the web minigames (`MG.Sounds`), and colour names plus a pattern on every wire for colour-blind players (`MG.Wires.labels`)
- English, Danish, German, Swedish, Norwegian and Dutch
- `dev/preview.html` to try the web minigames in a browser, without FiveM
- **Trackers on vehicles:** `SetVehicleTracker` / `GetVehicleTracker` / `RemoveVehicleTracker` on the server, `SweepVehicle(vehicle)` on the client, and the `trackerRemoved` / `trackerMissed` server events: a ready-made way to use the tracker sweep in a script
- The window: a "how to play" card before each game (`MG.Intro`), keycaps in the hints, lives as dots, seconds on the timer with a low-time warning, a shake on mistakes and a flash on right steps, a result screen with the time, and the same size on every resolution (`MG.Scale`); `MG.TextSize` and `MG.ReducedMotion` for accessibility
- Key filing redrawn as a real key with filings, a radar sweep and a detailed car in the tracker sweep, sparks in the laser grid
- Three looks for the web minigames (`MG.Style`): default, terminal (green hacker terminal) and glass (frosted glass), plus `MG.Theme` for your own colours on top
- The server event `tobs_minigames:played` (player, game, result, time, reason) for logs, and `MG.MinTime` to change the "faster than possible" limits
- `/minigame <name> [difficulty]` to try them in game
