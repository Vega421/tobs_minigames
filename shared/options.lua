-- The minigames and how their settings are put together, for the client and the server.

MGGames = {
    drill = "Drill", hack = "Hack", safe = "Safe", thermite = "Thermite",
    keypad = "Keypad", wires = "Wires", lockpick = "Lockpick", fingerprint = "Fingerprint",
}
local Levels = {easy = true, medium = true, hard = true}

-- "Keypad", "KEYPAD" -> "keypad"; nil for anything that isn't a minigame
function MGName(name)
    if type(name) ~= "string" then return nil end
    name = name:lower()
    return MGGames[name] and name or nil
end

-- Settings for one game: the config, then the difficulty, then the script's own settings.
-- opts: nil (MG.Difficulty), "easy" / "medium" / "hard", or a table ({difficulty = "hard", pins = 6})
function MGOptions(name, opts)
    local conf = MG[MGGames[name]] or {}
    local level = MG.Difficulty
    if type(opts) == "string" then level, opts = opts, nil end
    if type(opts) == "table" and opts.difficulty then level = opts.difficulty end
    if not Levels[level] then level = "medium" end
    local o = {}
    for k, v in pairs(conf) do
        if not Levels[k] then o[k] = v end
    end
    for k, v in pairs(conf[level] or {}) do o[k] = v end
    for k, v in pairs(type(opts) == "table" and opts or {}) do o[k] = v end
    o.difficulty = level
    return o
end

-- The shortest time a real player could finish a game in (ms). The server rejects faster results.
function MGMinTime(name, o)
    local own = type(MG.MinTime) == "table" and MG.MinTime[name]
    if type(own) == "number" then return own end
    if name == "drill" then return (o.time or 0) - 1000 end
    if name == "safe" then return (o.numbers or 1) * 1500 end
    if name == "hack" then return 4000 end
    if name == "keypad" or name == "thermite" then return (o.show or 0) + 500 end
    return 1000
end
