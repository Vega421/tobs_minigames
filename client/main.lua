-- tobs_minigames: minigames any script can call, from the client.
--
--   exports.tobs_minigames:Drill(opts)        GTA's Fleeca drilling screen
--   exports.tobs_minigames:Hack(opts)         GTA's hacking laptop (HackConnect + BruteForce)
--   exports.tobs_minigames:Keypad(opts)       remember a code, type it
--   exports.tobs_minigames:Wires(opts)        cut the wires in the right order
--   exports.tobs_minigames:Lockpick(opts)     set each pin in its sweet spot
--   exports.tobs_minigames:Fingerprint(opts)  pick the pieces of a fingerprint
--   exports.tobs_minigames:Start(name, opts)  any of them by name ("drill", "keypad", ...)
--   exports.tobs_minigames:IsActive()         true while a minigame is open
--
-- opts: nil (MG.Difficulty), "easy" / "medium" / "hard", or a table ({difficulty = "hard", pins = 6})
-- that overrides the settings in config.lua. Each call waits until the game ends and returns true
-- (passed) or false (failed, gave up, died, another game already open). Drill and Hack return nil
-- when GTA's screen didn't load, so the script can use something else.
-- The result is decided in the player's game: a server must still check anything that pays out.

local Games = {drill = "Drill", hack = "Hack", keypad = "Keypad", wires = "Wires", lockpick = "Lockpick", fingerprint = "Fingerprint"}
local Levels = {easy = true, medium = true, hard = true}
local Active = false
local Pending -- the web game's promise while one is open

-- Settings for one game: the config, then the difficulty, then the script's own settings
function MGOptions(name, opts)
    local conf = MG[Games[name]] or {}
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

-- Opens a web game and waits for its result. It also ends (failed) if the player dies, or if the
-- page never answers well after the game's time limit.
local function RunWeb(name, o)
    local p = promise.new()
    Pending = p
    SetNuiFocus(true, true) -- before opening, so an answer can never leave the focus on
    SendNUIMessage({action = "open", game = name, opts = o, text = MGTexts()})
    local ped = PlayerPedId()
    local limit = (o.time or 240) + (o.show or 0) / 1000 + 15
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
    if type(name) == "string" then name = name:lower() end
    if Games[name] == nil then
        print(("^1[tobs_minigames] Unknown minigame '%s'. Use: drill, hack, keypad, wires, lockpick, fingerprint^7"):format(tostring(name)))
        return false
    end
    if Active then return false end
    Active = true
    local o = MGOptions(name, opts)
    local ok, result = pcall(function()
        if name == "drill" then return MGDrill.Start(o) end
        if name == "hack" then return MGHack.Start(o) end
        return RunWeb(name, o)
    end)
    Active = false
    if not ok then
        print(("^1[tobs_minigames] The %s minigame stopped with an error: %s^7"):format(name, tostring(result)))
        Finish(false)
        return false
    end
    return result
end

for name, export in pairs(Games) do
    exports(export, function(opts) return Run(name, opts) end)
end
exports("Start", Run)
exports("IsActive", function() return Active end)

-- /minigame <name> [difficulty]: try one (it gives nothing)
local function Chat(text)
    TriggerEvent("chat:addMessage", {args = {"tobs_minigames", text}})
end

if MG.TestCommand then
    RegisterCommand(MG.TestCommand, function(_, args)
        local name = args[1] and args[1]:lower()
        if Games[name] == nil then Chat(ML("test_usage", MG.TestCommand)) return end
        Citizen.CreateThread(function()
            local result = Run(name, args[2])
            if result == nil then Chat(ML("test_no_screen", name))
            elseif result then Chat(ML("test_passed", name))
            else Chat(ML("test_failed", name)) end
        end)
    end, false)
end

AddEventHandler("onResourceStop", function(res)
    if res == GetCurrentResourceName() and Pending then SetNuiFocus(false, false) end
end)
