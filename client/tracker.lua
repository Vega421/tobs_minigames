-- Sweeping a vehicle for a tracker (see server/tracker.lua):
--
--   exports.tobs_minigames:SweepVehicle(vehicle)                        -- inside a thread: true = removed
--   exports.tobs_minigames:SweepVehicle(vehicle, function(removed, reason) end)
--
-- reason: "removed", "missed" (the minigame failed), "no_tracker", "too_far", "gone" (someone else
-- removed it first), "no_vehicle" or "busy". The player looks at their phone while scanning
-- (GTA scenario WORLD_HUMAN_STAND_MOBILE), and a GTA notification tells them the result (MG.Sweep.notify).
-- Example with ox_target:
--   exports.ox_target:addGlobalVehicle({{name = "sweep", label = "Sweep for trackers", icon = "fa-solid fa-satellite-dish",
--       onSelect = function(data) exports.tobs_minigames:SweepVehicle(data.entity) end}})

local Busy = false
local Pending

RegisterNetEvent("tobs_minigames:sweepResult")
AddEventHandler("tobs_minigames:sweepResult", function(result, reason)
    local p = Pending
    Pending = nil
    if p then p:resolve({result == true, reason}) end
end)

local Messages = {removed = "tracker_removed", missed = "tracker_missed", no_tracker = "no_tracker", too_far = "too_far", gone = "no_tracker"}

local function Notify(reason)
    if not MG.Sweep.notify or not Messages[reason] then return end
    BeginTextCommandThefeedPost("STRING")
    AddTextComponentSubstringPlayerName(ML(Messages[reason]))
    EndTextCommandThefeedPostTicker(false, false)
end

local function Sweep(vehicle)
    if Busy then return false, "busy" end
    if not vehicle or vehicle == 0 or not DoesEntityExist(vehicle) or not IsEntityAVehicle(vehicle) then return false, "no_vehicle" end
    local ped = PlayerPedId()
    if #(GetEntityCoords(ped) - GetEntityCoords(vehicle)) > (MG.Sweep.distance or 4.0) then
        Notify("too_far")
        return false, "too_far"
    end
    Busy = true
    local started = GetGameTimer()
    TaskStartScenarioInPlace(ped, "WORLD_HUMAN_STAND_MOBILE", 0, true)
    local p = promise.new()
    Pending = p
    TriggerServerEvent("tobs_minigames:sweep", NetworkGetNetworkIdFromEntity(vehicle))
    -- no answer at all (server restarted): give up after the longest a sweep can take
    Citizen.SetTimeout(10 * 60 * 1000 + 5000, function() if Pending == p then Pending = nil p:resolve({false, "no_answer"}) end end)
    local answer = Citizen.Await(p)
    local result, reason = answer[1], answer[2]
    -- a vehicle without a tracker still takes a moment to scan
    if reason == "no_tracker" then
        local left = (MG.Sweep.scan or 3000) - (GetGameTimer() - started)
        if left > 0 then Citizen.Wait(left) end
    end
    ClearPedTasks(ped)
    Busy = false
    Notify(reason)
    return result, reason
end

MGSweepVehicle = Sweep -- for the test menu
MGNotify = function(key)
    BeginTextCommandThefeedPost("STRING")
    AddTextComponentSubstringPlayerName(ML(key))
    EndTextCommandThefeedPostTicker(false, false)
end

exports("SweepVehicle", function(vehicle, cb)
    if type(cb) ~= "function" then return (Sweep(vehicle)) end
    Citizen.CreateThread(function() cb(Sweep(vehicle)) end)
    return nil
end)
