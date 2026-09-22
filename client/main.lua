-- tobs_minigames: minigames any script can call. See README.md for examples.
--
-- Client exports (each one waits until the game ends, so call it inside a thread, or pass a callback):
--   exports.tobs_minigames:Drill(opts, cb)        GTA's Fleeca drilling screen
--   exports.tobs_minigames:Hack(opts, cb)         GTA's hacking laptop (HackConnect + BruteForce)
--   exports.tobs_minigames:Safe(opts, cb)         GTA's safe dial: turn to each number, turn back on the click
--   exports.tobs_minigames:Thermite(opts, cb)     remember which squares lit up, click them
--   exports.tobs_minigames:Keypad(opts, cb)       remember a code, type it
--   exports.tobs_minigames:Wires(opts, cb)        cut the wires in the right order
--   exports.tobs_minigames:Lockpick(opts, cb)     set each pin in its sweet spot
--   exports.tobs_minigames:Fingerprint(opts, cb)  pick the pieces of a fingerprint
--   exports.tobs_minigames:Hotwire(opts, cb)      connect each wire to the terminal with its colour's name
--   exports.tobs_minigames:Lasers(opts, cb)       cross a room of moving lasers
--   exports.tobs_minigames:KeyFiling(opts, cb)    file each cut of a blank key down to its line
--   exports.tobs_minigames:Tracker(opts, cb)      find a GPS tracker on a car by its signal
--   exports.tobs_minigames:Start(name, opts, cb)  any of them by name ("drill", "keypad", ...)
--   exports.tobs_minigames:IsActive()             true while a minigame is open
-- The server can also run one for a player: exports.tobs_minigames:Play(playerId, name, opts)
-- (server/main.lua), which is the one to use when the result pays out.
--
-- opts: nil (MG.Difficulty), "easy" / "medium" / "hard", or a table ({difficulty = "hard", pins = 6})
-- that overrides the settings in config.lua. {fallback = "lockpick"} plays that game instead when a
-- GTA screen doesn't load. cb: function(result) called when it ends; the export then returns at once.
-- Result: true (passed) or false (failed, gave up, died, another game already open). Drill, Hack and
-- Safe give nil when GTA's screen didn't load and there's no fallback.
-- When a game ends, the client event "tobs_minigames:finished" (name, result) fires for other scripts.

local Active = false
local Pending -- the web game's promise while one is open

local function Finish(success)
    local p = Pending
    if p == nil then return end
    Pending = nil
    SetNuiFocus(false, false)
    SendNUIMessage({action = "close"})
    p:resolve(success == true)
end

RegisterNUICallback("done", function(data, cb)
    Finish(type(data) == "table" and data.success == true)
    cb({})
end)

-- The web games' sounds are GTA's hacking sounds (checked in DurtyFree/gta-v-data-dumps). The page
-- asks by a short name; only these can be played.
local Sounds = {
    click = "HACKING_CLICK", move = "HACKING_MOVE_CURSOR", good = "HACKING_CLICK_GOOD",
    bad = "HACKING_CLICK_BAD", success = "HACKING_SUCCESS", fail = "HACKING_FAILURE",
}
RegisterNUICallback("sound", function(data, cb)
    local name = type(data) == "table" and Sounds[data.name]
    if name and MG.Sounds ~= false and Pending then PlaySoundFrontend(-1, name, "", true) end
    cb({})
end)

-- Opens a web game and waits for its result. It also ends (failed) if the player dies, or if the
-- page never answers well after the game's time limit.
local function RunWeb(name, o)
    local p = promise.new()
    Pending = p
    SetNuiFocus(true, true) -- before opening, so an answer can never leave the focus on
    SendNUIMessage({action = "open", game = name, opts = o, text = MGTexts(), theme = MG.Theme, style = MG.Style,
        ui = {scale = MG.Scale, intro = MG.Intro, textSize = MG.TextSize, reducedMotion = MG.ReducedMotion}})
    local ped = PlayerPedId()
    local limit = (o.time or 240) + (o.show or 0) / 1000 + (tonumber(MG.Intro) or 0) + 15
    local deadline = GetGameTimer() + limit * 1000
    Citizen.CreateThread(function()
        while Pending == p do
            if IsEntityDead(ped) or GetGameTimer() > deadline then Finish(false) end
            Citizen.Wait(250)
        end
    end)
    return Citizen.Await(p)
end

local function Run(name, opts)
    local game = MGName(name)
    if game == nil then
        print(("^1[tobs_minigames] Unknown minigame '%s'. Use: drill, hack, safe, thermite, keypad, wires, lockpick, fingerprint, hotwire, lasers, keyfiling, tracker^7"):format(tostring(name)))
        return false
    end
    if Active then return false end
    Active = true
    local o = MGOptions(game, opts)
    local ok, result = pcall(function()
        if game == "drill" then return MGDrill.Start(o) end
        if game == "hack" then return MGHack.Start(o) end
        if game == "safe" then return MGSafe.Start(o) end
        return RunWeb(game, o)
    end)
    Active = false
    if not ok then
        print(("^1[tobs_minigames] The %s minigame stopped with an error: %s^7"):format(game, tostring(result)))
        Finish(false)
        result = false
    end
    -- GTA's screen didn't load: play the fallback game instead, at the same difficulty
    if result == nil and o.fallback and MGName(o.fallback) ~= game then
        return Run(o.fallback, o.difficulty)
    end
    TriggerEvent("tobs_minigames:finished", game, result)
    return result
end

-- Waits for the result, or with a callback runs in its own thread and returns at once
local function Call(name, opts, cb)
    if type(opts) == "function" and cb == nil then opts, cb = nil, opts end
    if type(cb) ~= "function" then return Run(name, opts) end
    Citizen.CreateThread(function() cb(Run(name, opts)) end)
    return nil
end

for name, export in pairs(MGGames) do
    exports(export, function(opts, cb) return Call(name, opts, cb) end)
end
exports("Start", Call)
exports("IsActive", function() return Active end)

-- The server asks for a game (exports.tobs_minigames:Play) and gets the result back
RegisterNetEvent("tobs_minigames:play")
AddEventHandler("tobs_minigames:play", function(id, name, opts)
    Citizen.CreateThread(function()
        local result = Run(name, opts)
        TriggerServerEvent("tobs_minigames:result", id, result)
    end)
end)

-- /minigame <name> [difficulty]: try one (it gives nothing)
local function Chat(text)
    TriggerEvent("chat:addMessage", {args = {"tobs_minigames", text}})
end

if MG.TestCommand then
    RegisterCommand(MG.TestCommand, function(_, args)
        local name = MGName(args[1])
        if name == nil then Chat(ML("test_usage", MG.TestCommand)) return end
        Call(name, args[2], function(result)
            if result == nil then Chat(ML("test_no_screen", name))
            elseif result then Chat(ML("test_passed", name))
            else Chat(ML("test_failed", name)) end
        end)
    end, false)
end

AddEventHandler("onResourceStop", function(res)
    if res == GetCurrentResourceName() and Pending then SetNuiFocus(false, false) end
end)
