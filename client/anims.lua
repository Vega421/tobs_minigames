-- What the player does while a web minigame is open, so others can see it: hold a tablet, look at a
-- phone, press a keypad, work with their hands, kneel, or hotwire (in a car). Set per game in
-- MG.Animations; a script turns it off for one call with {animate = false} (when it plays its own).
-- Animation, scenario and prop names checked in DurtyFree/gta-v-data-dumps. The tablet's hand
-- position is the one popular emote menus use: check it in game.

MGAnim = {}

MGAnim.Kinds = {
    tablet = {dict = "amb@code_human_in_bus_passenger_idles@female@tablet@base", anim = "base", flag = 49,
              prop = "prop_cs_tablet", bone = 60309, pos = {0.03, 0.002, -0.0}, rot = {10.0, 160.0, 0.0}},
    phone = {scenario = "WORLD_HUMAN_STAND_MOBILE"},
    keypad = {scenario = "PROP_HUMAN_ATM"},
    repair = {dict = "mini@repair", anim = "fixing_a_player", flag = 1},
    kneel = {dict = "anim@amb@clubhouse@tutorial@bkr_tut_ig3@", anim = "machinic_loop_mechandplayer", flag = 1},
    -- in a car GTA's own hotwire animation, on foot working with the hands
    hotwire = {vehicle = {dict = "veh@std@ds@base", anim = "hotwire", flag = 49}, foot = "repair"},
}

local function Load(request, loaded, name)
    request(name)
    local until_ = GetGameTimer() + 2000
    while not loaded(name) do
        if GetGameTimer() > until_ then return false end
        Citizen.Wait(10)
    end
    return true
end

-- Starts the animation for a game. Returns something to pass to MGAnim.Stop, or nil when there's none.
function MGAnim.Start(game, o)
    if MG.Animations == false or type(MG.Animations) ~= "table" or (o and o.animate == false) then return nil end
    local ped = PlayerPedId()
    if IsEntityDead(ped) then return nil end
    local kind = MGAnim.Kinds[(o and o.animation) or MG.Animations[game]]
    if kind == nil then return nil end
    local inVehicle = IsPedInAnyVehicle(ped, false)
    if kind.vehicle or kind.foot then
        kind = inVehicle and kind.vehicle or MGAnim.Kinds[kind.foot]
    elseif inVehicle then
        return nil -- only hotwiring is animated in a car
    end
    if kind == nil then return nil end

    if kind.scenario then
        TaskStartScenarioInPlace(ped, kind.scenario, 0, true)
        return {ped = ped, scenario = true}
    end
    if not Load(RequestAnimDict, HasAnimDictLoaded, kind.dict) then return nil end
    TaskPlayAnim(ped, kind.dict, kind.anim, 3.0, -3.0, -1, kind.flag or 1, 0, false, false, false)
    local h = {ped = ped, dict = kind.dict, anim = kind.anim}
    if kind.prop then
        local model = GetHashKey(kind.prop)
        if Load(RequestModel, HasModelLoaded, model) then
            local c = GetEntityCoords(ped)
            local prop = CreateObject(model, c.x, c.y, c.z + 0.2, true, true, false)
            AttachEntityToEntity(prop, ped, GetPedBoneIndex(ped, kind.bone), kind.pos[1], kind.pos[2], kind.pos[3],
                                 kind.rot[1], kind.rot[2], kind.rot[3], true, true, false, true, 1, true)
            SetModelAsNoLongerNeeded(model)
            h.prop = prop
        end
    end
    return h
end

function MGAnim.Stop(h)
    if h == nil then return end
    if h.scenario then
        ClearPedTasks(h.ped)
    else
        StopAnimTask(h.ped, h.dict, h.anim, 1.0)
        RemoveAnimDict(h.dict)
    end
    if h.prop and DoesEntityExist(h.prop) then
        DetachEntity(h.prop, true, false)
        DeleteObject(h.prop)
    end
end
