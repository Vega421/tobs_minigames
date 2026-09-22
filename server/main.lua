-- Server export: run a minigame for a player and get the result on the server, where payouts happen.
--
--   local passed = exports.tobs_minigames:Play(playerId, "safe", "hard")   -- inside a thread
--   exports.tobs_minigames:Play(playerId, "keypad", nil, function(passed) ... end)
--
-- Returns true / false like the client exports (nil: GTA's screen didn't load and there's no fallback).
-- The server only accepts the one answer it asked for, from that player, and treats an answer that
-- came back faster than the game can be played (MGMinTime) as failed. The result is still decided in
-- the player's game, so keep checking what matters for a payout (distance, state) in your script.

local Waiting = {} -- [id] = {src, name, started, min, promise}
local NextId = 0
local MaxWait = 10 * 60 * 1000 -- give up after 10 minutes

local function Done(id, result)
    local w = Waiting[id]
    if w == nil then return end
    Waiting[id] = nil
    w.promise:resolve(result)
end

-- The shortest possible time, allowing for the fallback game if GTA's screen doesn't load
local function MinTime(game, opts)
    local o = MGOptions(game, opts)
    local min = MGMinTime(game, o)
    local fallback = MGName(o.fallback)
    if fallback then min = math.min(min, MGMinTime(fallback, MGOptions(fallback, o.difficulty))) end
    return min
end

local function Play(src, name, opts, cb)
    if type(opts) == "function" and cb == nil then opts, cb = nil, opts end
    local game = MGName(name)
    src = tonumber(src)
    if game == nil or src == nil or GetPlayerName(src) == nil then
        print(("^1[tobs_minigames] Play: unknown minigame '%s' or player '%s'^7"):format(tostring(name), tostring(src)))
        if cb then cb(false) return nil end
        return false
    end
    if cb then
        Citizen.CreateThread(function() cb(Play(src, game, opts)) end)
        return nil
    end

    NextId = NextId + 1
    local id = NextId
    local p = promise.new()
    Waiting[id] = {src = src, name = game, started = GetGameTimer(), min = MinTime(game, opts), promise = p}
    TriggerClientEvent("tobs_minigames:play", src, id, game, opts)
    Citizen.SetTimeout(MaxWait, function() Done(id, false) end)
    return Citizen.Await(p)
end
exports("Play", Play)

RegisterNetEvent("tobs_minigames:result")
AddEventHandler("tobs_minigames:result", function(id, result)
    local src = source
    local w = Waiting[id]
    if w == nil or w.src ~= src then return end -- not asked for, or another player's game
    if result == true and GetGameTimer() - w.started < w.min then
        print(("^3[tobs_minigames] %s (%d) finished %s faster than possible: counted as failed^7"):format(GetPlayerName(src) or "?", src, w.name))
        result = false
    end
    if result ~= nil then result = result == true end
    Done(id, result)
end)

AddEventHandler("playerDropped", function()
    local src = source
    for id, w in pairs(Waiting) do
        if w.src == src then Done(id, false) end
    end
end)
