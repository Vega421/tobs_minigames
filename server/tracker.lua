-- Trackers on vehicles, for scripts: your script puts a tracker on a vehicle, players sweep for it
-- with the tracker minigame, and your script hears when one is removed.
--
--   exports.tobs_minigames:SetVehicleTracker(vehicle, info)  -- info: {difficulty = "hard", ...your own data}
--   exports.tobs_minigames:RemoveVehicleTracker(vehicle)
--   exports.tobs_minigames:GetVehicleTracker(vehicle)        -- info, or nil
--   (vehicle: the entity or its network id)
--
--   AddEventHandler("tobs_minigames:trackerRemoved", function(playerId, vehicle, info) end)
--   AddEventHandler("tobs_minigames:trackerMissed", function(playerId, vehicle, info) end)
--
-- Players sweep with the client export exports.tobs_minigames:SweepVehicle(vehicle). The server checks
-- the vehicle, the distance and the tracker, runs the minigame (Play), and only the first player to
-- find a tracker removes it. The tracker is kept in the vehicle's state bag (tobsTracker), set only
-- by the server.

local Sweeping = {} -- [playerId] = true while they sweep

local function Vehicle(v)
    if v == nil then return nil end
    if DoesEntityExist(v) then return v end
    local ent = NetworkGetEntityFromNetworkId(v)
    if ent and ent ~= 0 and DoesEntityExist(ent) then return ent end
    return nil
end

local function SetVehicleTracker(v, info)
    local veh = Vehicle(v)
    if veh == nil then return false end
    if type(info) ~= "table" then info = {} end
    Entity(veh).state:set("tobsTracker", info, true)
    return true
end

local function RemoveVehicleTracker(v)
    local veh = Vehicle(v)
    if veh == nil then return false end
    Entity(veh).state:set("tobsTracker", nil, true)
    return true
end

local function GetVehicleTracker(v)
    local veh = Vehicle(v)
    if veh == nil then return nil end
    return Entity(veh).state.tobsTracker
end

exports("SetVehicleTracker", SetVehicleTracker)
exports("RemoveVehicleTracker", RemoveVehicleTracker)
exports("GetVehicleTracker", GetVehicleTracker)

-- Is the player near the vehicle? Without OneSync the server can't see positions: then yes.
local function Near(src, veh)
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return true end
    local a, b = GetEntityCoords(ped), GetEntityCoords(veh)
    if a.x == 0 and a.y == 0 and a.z == 0 then return true end
    return #(a - b) <= (MG.Sweep.distance or 4.0) + 2.0
end

local function Answer(src, result, reason)
    TriggerClientEvent("tobs_minigames:sweepResult", src, result, reason)
end

RegisterNetEvent("tobs_minigames:sweep")
AddEventHandler("tobs_minigames:sweep", function(netId)
    local src = source
    if Sweeping[src] then return end
    local veh = tonumber(netId) and NetworkGetEntityFromNetworkId(tonumber(netId))
    if not veh or veh == 0 or not DoesEntityExist(veh) or GetEntityType(veh) ~= 2 then return Answer(src, false, "no_vehicle") end
    if not Near(src, veh) then return Answer(src, false, "too_far") end
    local info = Entity(veh).state.tobsTracker
    if info == nil then return Answer(src, false, "no_tracker") end

    Sweeping[src] = true
    Citizen.CreateThread(function()
        local difficulty = type(info) == "table" and info.difficulty or MG.Sweep.difficulty
        local found = MGPlay(src, "tracker", difficulty)
        Sweeping[src] = nil
        -- still there, still near, and nobody removed it meanwhile
        if found == true and DoesEntityExist(veh) and Near(src, veh) and Entity(veh).state.tobsTracker ~= nil then
            Entity(veh).state:set("tobsTracker", nil, true)
            TriggerEvent("tobs_minigames:trackerRemoved", src, veh, info)
            return Answer(src, true, "removed")
        end
        if found == true then return Answer(src, false, "gone") end
        TriggerEvent("tobs_minigames:trackerMissed", src, veh, info)
        Answer(src, false, "missed")
    end)
end)

AddEventHandler("playerDropped", function()
    Sweeping[source] = nil
end)

-- TESTING: put a tracker on the vehicle an admin is in, or the nearest one within 10 m. From the
-- test menu (/minigame) or /tobtracker [easy|medium|hard]; needs the ace command.tobtracker.
local Levels = {easy = true, medium = true, hard = true}

local function NearestVehicle(src)
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return nil end
    local inside = GetVehiclePedIsIn(ped, false)
    if inside and inside ~= 0 then return inside end
    local here = GetEntityCoords(ped)
    local best, bestDist = nil, 10.0
    for _, veh in ipairs(GetAllVehicles()) do
        local d = #(here - GetEntityCoords(veh))
        if d < bestDist then best, bestDist = veh, d end
    end
    return best
end

local function TestTracker(src, difficulty)
    if not IsPlayerAceAllowed(tostring(src), "command.tobtracker") then
        return TriggerClientEvent("tobs_minigames:testNotice", src, "not_allowed")
    end
    local veh = NearestVehicle(src)
    if not veh then return TriggerClientEvent("tobs_minigames:testNotice", src, "no_vehicle_near") end
    SetVehicleTracker(veh, {difficulty = Levels[difficulty] and difficulty or MG.Sweep.difficulty, test = true})
    print(("[tobs_minigames] %s put a test tracker on vehicle %d"):format(GetPlayerName(src) or src, veh))
    TriggerClientEvent("tobs_minigames:testNotice", src, "tracker_placed")
end

RegisterNetEvent("tobs_minigames:testTracker")
AddEventHandler("tobs_minigames:testTracker", function(difficulty)
    TestTracker(source, difficulty)
end)

RegisterCommand("tobtracker", function(src, args)
    if src == 0 then print("[tobs_minigames] /tobtracker is for players in the game.") return end
    TestTracker(src, args[1])
end, true)
