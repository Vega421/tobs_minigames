# Changelog

All notable changes to tobs_minigames. Each version is also a [GitHub release](https://github.com/Vega421/tobs_minigames/releases) with a ready-to-use zip.

## 1.0.0 · unreleased

**The first version: twelve minigames for any script.**

- **Drill:** GTA Online's Fleeca drilling screen, with heat, 4 lock pins, jams, camera shake and controller vibration. It can't be finished faster than its `time`
- **Hack:** GTA Online's hacking laptop: HackConnect.exe, then BruteForce.exe, with shared lives and a time limit
- **Safe:** GTA V's safe dial, with its tumbler sounds, a controller buzz on each click, and optional safe cracking animations
- **Thermite:** remember the squares that light up on a grid
- **Keypad, wire cutting and lockpick:** new web minigames
- **Fingerprint:** clone prints like the Casino heist's hack: pick the 4 pieces of the print with the arrow keys or the mouse, check with TAB, several prints in a row (`prints`), and a scramble timer that shuffles the pieces (`scramble`). Laid out like the Casino's cloner screen: a big digital clock and lives on top, 8 components in two columns (dim until picked, bracket cursor), the print on the right cut into 4 bands (a flat, clean whorl, loop or arch, so pieces of other prints stand out), a processing bar on each check, the prints and a segmented scramble bar at the bottom. Our own version: no game files copied
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
- **Each web minigame is one real object, drawn with care:** a wall keypad with a display and lights; a thermal charge's control unit with rubber pads; an electrical box with terminal blocks, marker sleeves on the wires and the clues on a sticky note; the lock cut open with springs, pins and the pick, and a scale for the sweet spot; the wiring under the steering column with a labelled terminal strip; a tablet with the room's floor plan; a brass key in a bench vice with a file; the car from above and a handheld RF detector. No window around them: a short instruction and the time under the object, GTA's key bar at the bottom right. The test menu is flat, like GTA's menus. Terminal and glass draw the same objects in their own colours
- The server event `tobs_minigames:played` (player, game, result, time, reason) for logs, and `MG.MinTime` to change the "faster than possible" limits
- **Drop-in replacements** in `compat/`: `qb-minigames`, `memorygame`, `mhacking` and `safecracker` with the same exports and events (the last two cover Qbox's bank and store robberies; the store's safes play GTA's safe dial with the code from the player's note). Each warns in the server console if the original is still running under another name, so scripts written for them play tobs_minigames' games unchanged
- **Animations while playing:** a tablet, phone, keypad, hands-on or kneeling animation per web game (`MG.Animations`), `animate = false` per call
- The keypad takes a known code (`code`, `show = 0`); `GaveUp()` tells if the last game ended with ESC
- **The GTA screens look like GTA Online:** the drill, hack and safe show GTA's key bar at the bottom right (key icons that switch to controller buttons), the game's name with the depth, time or lives at the top, messages for broken pins, jams, overheating, locked numbers and wrong turns, and the same "how to play" card as the web games before they start (only once the screen has loaded; ESC on the card gives up)
- `/minigame`: an in-game test menu with every game's last result, difficulty and look switches, Play all, and a test tracker (`/tobtracker`, admins) to try the trackers on vehicles; `/minigame <name> [difficulty]` plays one straight away
