MG = {}

MG.Locale = "en" -- en, da, de, sv, no, nl
MG.Difficulty = "medium" -- used when a script doesn't pick one: "easy", "medium" or "hard"
MG.Sounds = true -- GTA's hacking sounds in the web minigames (clicks, right, wrong, success, fail)

-- /minigame <name> [easy|medium|hard] lets anyone try a minigame (it gives nothing). false = off
MG.TestCommand = "minigame"

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

-- A code flashes on screen; type it on the keypad. show: ms the code is visible; time: seconds
-- to type it; attempts: wrong codes allowed
MG.Keypad = {
    easy = {length = 4, show = 3000, time = 20, attempts = 3},
    medium = {length = 5, show = 2500, time = 15, attempts = 2},
    hard = {length = 6, show = 1800, time = 12, attempts = 1},
}

-- Cut the wires in the order the clues give. A wrong cut fails. wires: wires in the box;
-- cuts: wires to cut; time: seconds; labels: each wire's colour name on it (every colour also has
-- its own pattern), for colour-blind players
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

-- Pick the 4 pieces of the fingerprint shown. decoys: wrong pieces among them; time: seconds;
-- lives: wrong guesses allowed
MG.Fingerprint = {
    easy = {decoys = 4, time = 30, lives = 3},
    medium = {decoys = 6, time = 25, lives = 2},
    hard = {decoys = 8, time = 20, lives = 1},
}
