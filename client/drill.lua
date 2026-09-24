-- GTA Online's Fleeca drilling screen (scaleform "DRILLING").
-- The scaleform only draws; the drilling rules below are ours. Scaleform method names from
-- meta-hub/fivem-drilling (GPL-3.0): https://github.com/meta-hub/fivem-drilling
--
-- Controls: W / up arrow pushes the drill, S / down arrow pulls it back, A / D or left / right
-- arrow change the drill speed, Backspace stops. Cutting fast heats the drill; at 100 % it breaks.
-- Pushing through the part that is already drilled costs nothing and cools the drill.
-- The drill reacts: the camera and controller shake with the drill speed while cutting, each lock
-- pin breaks with a sound and a jolt, and pushing too slowly jams the drill.
--
-- MGDrill.Start(o, intro) blocks until done and returns true (drilled through), false (broken,
-- stopped, died) or nil (the screen didn't load). o = the settings from MG.Drill (see config.lua).
-- intro: shows the "how to play" card once the screen has loaded; false from it = gave up. It is the
-- timed part of drilling: a script should run it instead of a progress bar, not before one.
-- On screen, like GTA Online: the key bar at the bottom right, the title and depth at the top, and
-- a message when a pin breaks, the drill jams or it's close to overheating (client/gtaui.lua).

MGDrill = {}

-- Sounds (all in DLC_HEIST_FLEECA_SOUNDSET) and the camera shake used while cutting
local SoundSet, Shake = "DLC_HEIST_FLEECA_SOUNDSET", "ROAD_VIBRATION_SHAKE"

-- Movement, attack, aim, cover and pause menu stay off while drilling
local Disabled = {24, 25, 30, 31, 32, 33, 34, 35, 44, 140, 141, 142, 199, 200}

-- One frame of drilling. s = {speed, pos, depth, heat} (all 0-1), input = {push, back, faster, slower},
-- dt in seconds. Returns true when drilled through, false when the drill broke, nil otherwise, plus
-- an event for the effects: "pin" (a pin broke) or "jam" (pushing without enough speed).
-- s.cutting is true while the drill cuts new metal.
-- Cutting at speed v moves v / time per second and heats by (heat * v^2 - cool * 0.7) per second,
-- so about 75 % speed (with the defaults) cuts without heating up; faster needs pauses to cool.
function MGDrill.Step(s, input, dt, o)
    dt = math.min(dt, 0.1) -- a hitch can't skip ahead
    if input.faster then s.speed = math.min(1.0, s.speed + 0.6 * dt)
    elseif input.slower then s.speed = math.max(0.0, s.speed - 0.6 * dt) end

    local cutting, event = false, nil
    if input.push then
        if s.pos < s.depth then
            s.pos = math.min(s.depth, s.pos + 0.5 * dt)
        elseif s.speed >= o.minSpeed then
            local before = s.pos
            s.pos = math.min(1.0, s.pos + s.speed * dt / (o.time / 1000))
            s.depth = s.pos
            cutting = true
            for _, pin in ipairs(o.pins or {}) do
                if before < pin and s.pos >= pin then event = "pin" end
            end
        else
            event = "jam"
        end
    elseif input.back then
        s.pos = math.max(0.0, s.pos - 0.5 * dt)
    end

    if cutting then
        s.heat = math.max(0.0, s.heat + (o.heat * s.speed * s.speed - o.cool * 0.7) * dt)
    else
        s.heat = math.max(0.0, s.heat - o.cool * dt)
    end

    s.cutting = cutting
    if s.heat >= 1.0 then return false, event end
    if s.pos >= 1.0 then return true, event end
    return nil, event
end

local function SetFloat(sf, method, value)
    BeginScaleformMovieMethod(sf, method)
    ScaleformMovieMethodAddParamFloat(value)
    EndScaleformMovieMethod()
end

-- Sounds, camera shake and controller vibration for one frame
local function Effects(s, event, o, fx, now)
    if event == "pin" then
        PlaySoundFrontend(-1, "Drill_Pin_Break", SoundSet, true)
        fx.joltUntil = now + 300
        if o.shake then SetPadShake(0, 300, 255) end
    elseif event == "jam" and now >= (fx.jamAt or 0) then
        PlaySoundFrontend(-1, "Drill_Jam", SoundSet, true)
        fx.jamAt = now + 1500
    end
    if not o.shake then return end
    local amp = 0.0
    if s.cutting then amp = 0.3 + s.speed * 0.7 end
    if now < (fx.joltUntil or 0) then amp = 2.0 end
    if amp ~= fx.amp then SetGameplayCamShakeAmplitude(amp); fx.amp = amp end
    if s.cutting then SetPadShake(0, 50, math.floor(60 + s.speed * 140)) end
end

local function ReadInput()
    return {
        push = IsDisabledControlPressed(0, 32) or IsControlPressed(0, 172),
        back = IsDisabledControlPressed(0, 33) or IsControlPressed(0, 173),
        slower = IsDisabledControlPressed(0, 34) or IsControlPressed(0, 174),
        faster = IsDisabledControlPressed(0, 35) or IsControlPressed(0, 175),
    }
end

-- The key bar: W / S / A / D and ESC, labelled in MG.Locale
local function Buttons()
    return MGButtons.Load({
        {control = 200, label = ML("btn_stop")},
        {control = 35, label = ML("btn_faster")},
        {control = 34, label = ML("btn_slower")},
        {control = 33, label = ML("btn_pull")},
        {control = 32, label = ML("btn_push")},
    })
end

function MGDrill.Start(o, intro)
    if MGDrill.active then return false end

    local sf = RequestScaleformMovie("DRILLING")
    local waited = 0
    while not HasScaleformMovieLoaded(sf) do
        if waited >= 5000 then return nil end -- no drilling screen: the calling script decides
        Citizen.Wait(10)
        waited = waited + 10
    end

    if intro and not intro() then
        SetScaleformMovieAsNoLongerNeeded(sf)
        return false
    end

    MGDrill.active = true
    local buttons = Buttons()
    local title, msg, pins = ML("title_drill"), {}, 0
    local s = {speed = 0.0, pos = 0.0, depth = 0.0, heat = 0.0}
    local shown = {}
    for _, m in ipairs({"SET_SPEED", "SET_DRILL_POSITION", "SET_TEMPERATURE", "SET_HOLE_DEPTH"}) do SetFloat(sf, m, 0.0) end

    local ped = PlayerPedId()
    local result, event, fx = nil, nil, {}
    if o.shake then ShakeGameplayCam(Shake, 0.0) end
    while result == nil do
        for _, c in ipairs(Disabled) do DisableControlAction(0, c, true) end
        if IsControlJustPressed(0, 177) or IsDisabledControlJustPressed(0, 200) or IsEntityDead(ped) then
            result = false
        else
            local jamAt = fx.jamAt or 0
            result, event = MGDrill.Step(s, ReadInput(), GetFrameTime(), o)
            if result == false then event, fx.jamAt = "jam", 0 end -- overheated: the drill jams and breaks
            Effects(s, event, o, fx, GetGameTimer())
            if event == "pin" then
                pins = pins + 1
                MGHud.Say(msg, ML("drill_pin", pins, #(o.pins or {})), 1800)
            elseif event == "jam" and result == nil and GetGameTimer() >= jamAt then
                MGHud.Say(msg, ML("drill_jam"), 1500)
            elseif s.heat >= 0.8 and result == nil then
                MGHud.Say(msg, ML("drill_hot"), 300)
            end
        end

        for m, v in pairs({SET_SPEED = s.speed, SET_DRILL_POSITION = s.pos, SET_TEMPERATURE = s.heat, SET_HOLE_DEPTH = s.depth}) do
            if shown[m] ~= v then SetFloat(sf, m, v); shown[m] = v end
        end
        DrawScaleformMovieFullscreen(sf, 255, 255, 255, 255, 0)
        MGHud.Draw(title, ML("depth", math.floor(s.pos * 100)), msg)
        MGButtons.Draw(buttons)
        Citizen.Wait(0)
    end

    if o.shake then
        StopGameplayCamShaking(true)
        StopPadShake(0)
    end
    SetScaleformMovieAsNoLongerNeeded(sf)
    MGButtons.Release(buttons)
    MGDrill.active = false
    return result
end
