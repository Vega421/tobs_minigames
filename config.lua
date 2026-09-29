MG = {}

MG.Locale = "en" -- en, da, de, sv, no, nl
MG.Difficulty = "medium" -- used when a script doesn't pick one: "easy", "medium" or "hard"
MG.Sounds = true -- GTA's hacking sounds in the web minigames (clicks, right, wrong, success, fail)

-- /minigame <name> [easy|medium|hard] lets anyone try a minigame (it gives nothing). false = off
MG.TestCommand = "minigame"

-- A line in the server console at start. false = quiet
MG.StartupMessage = true

-- The web minigames' window
MG.Scale = 1.0 -- size on screen: 1.0 = the same share of the screen on any resolution (made for 1080p)
MG.Intro = 5 -- seconds a "how to play" card shows before the game starts by itself (SPACE or a click starts it sooner). 0 = no card
MG.TextSize = 1.0 -- bigger or smaller text, e.g. 1.2
MG.ReducedMotion = false -- true: no shaking or blinking

-- What the player does while a web minigame is open, so others see it. Per game: "tablet",
-- "phone", "keypad", "repair" (working with the hands), "kneel" or "hotwire" (GTA's own, in a car);
-- false = nothing. MG.Animations = false turns them all off. A script that plays its own animation
-- can skip this for one call with {animate = false}. (Drill, hack and safe don't use this.)
MG.Animations = {
    thermite = "tablet", fingerprint = "tablet", lasers = "tablet", tracker = "phone", keypad = "keypad",
    wires = "repair", hotwire = "hotwire", lockpick = "kneel", keyfiling = "kneel",
}

-- Look of the web minigames: "default" (each game is one real object: a keypad, a charge, a junction
-- box, a lock, ... with GTA's key bar), "terminal" (the same objects as green lines on black) or
-- "glass" (the same objects frosted and see-through)
MG.Style = "default"

-- Your own colours, on top of the style's (any CSS colour). Leave a colour out to keep the style's.
-- accent: the test menu's highlighted lines; background: the how-to card, the result and the menu;
-- text; muted: small text; good: right answers; bad: mistakes and lasers; gold: the lockpick's sweet spot
-- Example: MG.Theme = {good = "#3e7bfa", gold = "#b58cff"}
MG.Theme = {}

-- Trackers on vehicles (server/tracker.lua): scripts put them on, players sweep for them with
-- exports.tobs_minigames:SweepVehicle(vehicle). distance: meters from the vehicle; difficulty: when
-- the script doesn't give one; scan: ms a player scans a vehicle that has no tracker before "none
-- found"; notify: GTA notifications for the result
MG.Sweep = {distance = 4.0, difficulty = "medium", scan = 3000, notify = true}

-- Server: an answer to exports.tobs_minigames:Play that comes back faster than this (ms) counts as
-- failed. Leave a game out to use the built-in guess: drill = its time - 1 s, safe = 1.5 s per number,
-- fingerprint = 1.5 s per print, hack = 4 s, keypad / thermite = the time the code or squares are
-- shown + 0.5 s, lasers = 2.5 s, key filing = the time to file every cut to the shallowest depth,
-- the rest = 1 s.
-- Example: MG.MinTime = {lockpick = 2500, wires = 3000}
MG.MinTime = {}

-- Each minigame: the settings, then what "easy", "medium" and "hard" change.
-- A script can pass a difficulty ("hard") or its own settings ({pins = 6}) to override these.

-- GTA Online's Fleeca drilling screen. time: the fastest possible drill in ms (full speed, never
-- overheating); heat / cool: how fast the drill heats up when cutting fast and cools down;
-- pins: depths (0-1) where a lock pin breaks; shake: camera and controller shake
MG.Drill = {
    time = 15000, heat = 0.3, cool = 0.25, minSpeed = 0.1, pins = {0.2, 0.4, 0.6, 0.8}, shake = true,
    easy = {heat = 0.22},
    medium = {},
    hard = {heat = 0.4, cool = 0.2},
}

-- GTA Online's hacking laptop (Pacific Standard): HackConnect.exe, then BruteForce.exe.
-- lives: wrong picks allowed in both programs together; timeLimit: seconds; ipConnect: false skips
-- HackConnect; background: 0 FIB, 1 Pacific Standard, 2 Humane Labs, 3 Los Santos, 4 blue,
-- 5 Merryweather, 6 blue 2; columnSpeed: {min, max} 0-255; words: passwords (8 letters), nil = random
MG.Hack = {
    lives = 5, timeLimit = 70, ipConnect = true, background = 3, columnSpeed = {150, 255},
    easy = {lives = 7, timeLimit = 90},
    medium = {},
    hard = {lives = 3, timeLimit = 50},
}

-- GTA V's safe dial. numbers: numbers in the combination; tolerance: how close to the number the dial
-- must be when turning back; lives: wrong turns allowed; time: seconds; speed / slowSpeed: numbers
-- per second (SHIFT turns slowly); animate: play GTA's safe cracking animations on the player
-- (stand the player at the safe first)
MG.Safe = {
    speed = 22, slowSpeed = 6, animate = false,
    easy = {numbers = 2, tolerance = 3, lives = 3, time = 75},
    medium = {numbers = 3, tolerance = 2, lives = 2, time = 60},
    hard = {numbers = 4, tolerance = 1, lives = 1, time = 50},
}

-- Squares light up on a grid; click the same ones from memory. size: squares per side; squares:
-- how many light up; show: ms they're visible; mistakes: wrong clicks allowed; time: seconds to click
MG.Thermite = {
    easy = {size = 5, squares = 5, show = 3000, mistakes = 2, time = 15},
    medium = {size = 6, squares = 7, show = 2500, mistakes = 1, time = 12},
    hard = {size = 7, squares = 10, show = 2000, mistakes = 0, time = 10},
}

-- Hotwire a car: click a wire, then the terminal with its colour's name. tricky: the names are
-- printed in other colours; mistakes: wrong connections allowed (sparks); time: seconds
MG.Hotwire = {
    easy = {wires = 3, tricky = false, mistakes = 2, time = 20},
    medium = {wires = 4, tricky = true, mistakes = 1, time = 16},
    hard = {wires = 5, tricky = true, mistakes = 0, time = 12},
}

-- Cross a room of lasers with WASD / the arrow keys. walls: laser walls, each with a sliding
-- opening (share of the room: gap); sweepers: short beams moving up and down; speed: how fast the
-- lasers move; move: how fast the player moves (room widths per second); lives: touches allowed
-- (each sends you back to the start); time: seconds
MG.Lasers = {
    move = 0.35,
    easy = {walls = 3, sweepers = 0, speed = 0.5, gap = 0.35, lives = 3, time = 40},
    medium = {walls = 4, sweepers = 1, speed = 0.7, gap = 0.28, lives = 2, time = 35},
    hard = {walls = 5, sweepers = 2, speed = 0.9, gap = 0.22, lives = 1, time = 30},
}

-- File a blank key: pick a cut, hold SPACE to file it down to its line. cuts: cuts on the key;
-- tolerance: how close to the line counts (share of the depth); speed: filing speed (depth per
-- second); lives: keys you can ruin by filing too deep; time: seconds
MG.KeyFiling = {
    easy = {cuts = 4, tolerance = 0.06, speed = 0.3, lives = 3, time = 45},
    medium = {cuts = 5, tolerance = 0.045, speed = 0.4, lives = 2, time = 40},
    hard = {cuts = 6, tolerance = 0.03, speed = 0.5, lives = 1, time = 35},
}

-- Find a GPS tracker on a car: move the scanner, follow the signal, click where it is. decoys:
-- weaker signals from the car's electronics; radius: how close the click must be (share of the
-- car's length); lives: wrong clicks allowed; time: seconds
MG.Tracker = {
    easy = {decoys = 0, radius = 0.07, lives = 3, time = 40},
    medium = {decoys = 1, radius = 0.055, lives = 2, time = 35},
    hard = {decoys = 2, radius = 0.04, lives = 1, time = 30},
}

-- A code flashes on screen; type it on the keypad. show: ms the code is visible; time: seconds
-- to type it; attempts: wrong codes allowed
MG.Keypad = {
    easy = {length = 4, show = 3000, time = 20, attempts = 3},
    medium = {length = 5, show = 2500, time = 15, attempts = 2},
    hard = {length = 6, show = 1800, time = 12, attempts = 1},
}

-- Cut the wires in the order the clues give. A wrong cut fails. wires: wires in the box;
-- cuts: wires to cut; time: seconds; labels: each wire's colour name on a marker sleeve, for
-- colour-blind players
MG.Wires = {
    labels = true,
    easy = {wires = 4, cuts = 2, time = 25},
    medium = {wires = 5, cuts = 3, time = 20},
    hard = {wires = 6, cuts = 4, time = 15},
}

-- Set each pin by pressing space (or clicking) while the pick is in the pin's sweet spot.
-- zone: width of the sweet spot (0-1); speed: sweeps per second; lives: picks that can break
MG.Lockpick = {
    easy = {pins = 3, zone = 0.18, speed = 0.7, lives = 3},
    medium = {pins = 4, zone = 0.13, speed = 1.0, lives = 2},
    hard = {pins = 5, zone = 0.09, speed = 1.4, lives = 1},
}

-- Clone a fingerprint, like the Casino heist's hack: pick the 4 pieces of the print shown, then check
-- (TAB). prints: prints to clone in a row; decoys: wrong pieces among them (4 = 8 pieces, like the
-- Casino); time: seconds for all prints; lives: wrong checks allowed; scramble: seconds until the
-- pieces are shuffled (and your picks cleared), 0 = never
MG.Fingerprint = {
    easy = {prints = 1, decoys = 4, time = 40, lives = 3, scramble = 0},
    medium = {prints = 2, decoys = 4, time = 60, lives = 3, scramble = 25},
    hard = {prints = 3, decoys = 6, time = 75, lives = 2, scramble = 15},
}
