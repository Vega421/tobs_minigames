-- The in-game test menu: /minigame with no name (MG.TestCommand). It lists every minigame with its
-- last result, switches difficulty and look for the test, plays one or all of them, and tests the
-- trackers on vehicles. Nothing is given or taken; results also go to the F8 console.

local Order = {"drill", "hack", "safe", "thermite", "keypad", "wires", "lockpick", "fingerprint",
               "hotwire", "lasers", "keyfiling", "tracker"}
local GTA = {drill = true, hack = true, safe = true}
local Levels = {easy = true, medium = true, hard = true}
local Styles = {"default", "terminal", "glass"}
local Results = {} -- [game] = {result = true / false / nil, ms, difficulty, style}
local Settings = {difficulty = MG.Difficulty, style = MG.Style}
local Busy = false

local function Menu()
    local games = {}
    for _, name in ipairs(Order) do
        local r = Results[name]
        games[#games + 1] = {name = name, gta = GTA[name] == true, played = r ~= nil,
                             result = r and r.result, ms = r and r.ms, difficulty = r and r.difficulty}
    end
    SetNuiFocus(true, true)
    SendNUIMessage({action = "menu", games = games, difficulty = Settings.difficulty, style = Settings.style,
                    styles = Styles, text = MGTexts(), theme = MG.Theme, ui = {scale = MG.Scale, textSize = MG.TextSize, reducedMotion = MG.ReducedMotion}})
end

local function Hide()
    SendNUIMessage({action = "menu_close"})
    SetNuiFocus(false, false)
end

function MGOpenTestMenu()
    if Busy or MGIsActive() then return end
    Menu()
end

-- The difficulty and look the menu asks for, if they're real ones
local function Take(data)
    if type(data) ~= "table" then return end
    if Levels[data.difficulty] then Settings.difficulty = data.difficulty end
    for _, s in ipairs(Styles) do
        if data.style == s then Settings.style = s end
    end
end

local function PlayOne(game)
    local started = GetGameTimer()
    local result = MGRun(game, Settings.difficulty, Settings.style)
    local ms = GetGameTimer() - started
    Results[game] = {result = result, ms = ms, difficulty = Settings.difficulty, style = Settings.style}
    local what = result == nil and "didn't load" or (result and "passed" or "failed")
    print(("[tobs_minigames] test: %s (%s, %s) %s after %.1f s"):format(game, Settings.difficulty, Settings.style, what, ms / 1000))
    return result
end

RegisterNUICallback("menuSettings", function(data, cb)
    Take(data)
    cb({})
end)

RegisterNUICallback("menuClose", function(_, cb)
    Hide()
    cb({})
end)

RegisterNUICallback("menuPlay", function(data, cb)
    cb({})
    local game = type(data) == "table" and MGName(data.game)
    if Busy or not game then return end
    Take(data)
    Busy = true
    Hide()
    Citizen.CreateThread(function()
        Citizen.Wait(250)
        PlayOne(game)
        Busy = false
        Menu()
    end)
end)

RegisterNUICallback("menuAll", function(data, cb)
    cb({})
    if Busy then return end
    Take(data)
    Busy = true
    Hide()
    Citizen.CreateThread(function()
        local passed, played = 0, 0
        for _, game in ipairs(Order) do
            Citizen.Wait(600)
            local result = PlayOne(game)
            played = played + 1
            if result == true then passed = passed + 1 end
            if result == false and MGGaveUp() then break end -- ESC: stop the run
        end
        print(("[tobs_minigames] test: %d of %d passed"):format(passed, played))
        Busy = false
        Menu()
    end)
end)

-- The closest vehicle: the one you're in, or the nearest within 8 m
local function NearestVehicle()
    local ped = PlayerPedId()
    local inside = GetVehiclePedIsIn(ped, false)
    if inside and inside ~= 0 then return inside end
    local best, bestDist = nil, 8.0
    local here = GetEntityCoords(ped)
    for _, veh in ipairs(GetGamePool("CVehicle")) do
        local d = #(here - GetEntityCoords(veh))
        if d < bestDist then best, bestDist = veh, d end
    end
    return best
end

RegisterNUICallback("menuTracker", function(data, cb)
    cb({})
    if Busy or type(data) ~= "table" then return end
    if data.action == "place" then
        -- the server checks you're an admin (command.tobtracker) and picks the vehicle
        TriggerServerEvent("tobs_minigames:testTracker", Settings.difficulty)
    elseif data.action == "sweep" then
        local veh = NearestVehicle()
        if not veh then MGNotify("no_vehicle_near") return end
        Busy = true
        Hide()
        Citizen.CreateThread(function()
            local removed, reason = MGSweepVehicle(veh)
            print(("[tobs_minigames] test: sweep %s (%s)"):format(removed and "removed the tracker" or "found no tracker", tostring(reason)))
            Busy = false
            Menu()
        end)
    end
end)

RegisterNetEvent("tobs_minigames:testNotice")
AddEventHandler("tobs_minigames:testNotice", function(key)
    if key == "tracker_placed" or key == "no_vehicle_near" or key == "not_allowed" then MGNotify(key) end
end)
