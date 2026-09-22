-- GTA V's safe cracking: the dial, its sounds and animations from the game (texture dictionary
-- "MPSafeCracking", sound set "SAFE_CRACK_SOUNDSET", animations "mini@safe_cracking"). The rules are ours.
-- Sounds, the audio bank and the animations were checked against DurtyFree/gta-v-data-dumps; the sprite
-- names (Dial_BG, Dial, lock_open, lock_closed) were looked up in TimothyDexter/FiveM-SafeCrackingMinigame
-- (no license, so no code was copied).
--
-- Turn the dial with A / D (or the arrow keys), SHIFT for slow. Each number of the combination is
-- dialled in the other direction from the last one: first to the right, then to the left, and so on.
-- When the dial reaches the number a tumbler clicks (sound and controller buzz); turn back while it's
-- still on that number to lock it in. Turning back anywhere else costs a life.
--
-- MGSafe.Start(o) blocks until done and returns true (open), false (out of lives or time, stopped,
-- died) or nil (the dial's textures didn't load). o = the settings from MG.Safe (see config.lua).

MGSafe = {}

local Dict, SoundSet = "MPSafeCracking", "SAFE_CRACK_SOUNDSET"
local Anims = "mini@safe_cracking"

local Help = {
    en = "~INPUT_MOVE_LEFT_ONLY~ ~INPUT_MOVE_RIGHT_ONLY~ Turn the dial~n~~INPUT_SPRINT~ Turn slowly~n~Turn back when it clicks~n~~INPUT_CELLPHONE_CANCEL~ Stop",
    da = "~INPUT_MOVE_LEFT_ONLY~ ~INPUT_MOVE_RIGHT_ONLY~ Drej skiven~n~~INPUT_SPRINT~ Drej langsomt~n~Drej tilbage, når den klikker~n~~INPUT_CELLPHONE_CANCEL~ Stop",
    de = "~INPUT_MOVE_LEFT_ONLY~ ~INPUT_MOVE_RIGHT_ONLY~ Wählscheibe drehen~n~~INPUT_SPRINT~ Langsam drehen~n~Zurückdrehen, wenn es klickt~n~~INPUT_CELLPHONE_CANCEL~ Abbrechen",
    sv = "~INPUT_MOVE_LEFT_ONLY~ ~INPUT_MOVE_RIGHT_ONLY~ Vrid ratten~n~~INPUT_SPRINT~ Vrid långsamt~n~Vrid tillbaka när det klickar~n~~INPUT_CELLPHONE_CANCEL~ Avbryt",
    no = "~INPUT_MOVE_LEFT_ONLY~ ~INPUT_MOVE_RIGHT_ONLY~ Vri skiven~n~~INPUT_SPRINT~ Vri sakte~n~Vri tilbake når det klikker~n~~INPUT_CELLPHONE_CANCEL~ Avbryt",
    nl = "~INPUT_MOVE_LEFT_ONLY~ ~INPUT_MOVE_RIGHT_ONLY~ Draai aan de knop~n~~INPUT_SPRINT~ Langzaam draaien~n~Draai terug als het klikt~n~~INPUT_CELLPHONE_CANCEL~ Stoppen",
}

-- Movement, attack, aim, sprint, cover and pause menu stay off while cracking
local Disabled = {21, 24, 25, 30, 31, 32, 33, 34, 35, 44, 140, 141, 142, 199, 200}

local DIAL = 100 -- numbers on the dial, 0-99

-- Shortest distance between two dial numbers, going round
local function Gap(a, b)
    local d = math.abs(a - b) % DIAL
    return math.min(d, DIAL - d)
end

-- The combination: `count` numbers, each a good way round from the one before
function MGSafe.Combination(count, random)
    random = random or math.random
    local combo = {}
    for i = 1, count do
        local n
        repeat n = random(0, DIAL - 1) until i == 1 or Gap(n, combo[i - 1]) >= 15
        combo[i] = n
    end
    return combo
end

-- Direction for combination number i: 1 = to the right (up the numbers), -1 = to the left
function MGSafe.Direction(i)
    return i % 2 == 1 and 1 or -1
end

-- One frame of cracking. s = {dial, pin, lastDir, armed, lives}, input = {left, right, slow},
-- dt in seconds. Returns true (open), false (out of lives) or nil, plus an event for the effects:
-- "turn" (the dial moved a number), "click" (reached the number), "pin" (locked one in),
-- "open" (the last one), "wrong" (turned back at the wrong place: a life lost).
function MGSafe.Step(s, input, dt, o)
    dt = math.min(dt, 0.1)
    local dir = (input.right and 1 or 0) - (input.left and 1 or 0)
    if dir == 0 then return nil end

    local event
    local target = o.combination[s.pin]
    if s.lastDir ~= 0 and dir ~= s.lastDir then
        -- turning back: locks the number in if the tumbler clicked and the dial is still on it
        if s.armed and Gap(s.dial, target) <= o.tolerance then
            s.pin, s.armed = s.pin + 1, false
            s.lastDir = dir
            if s.pin > #o.combination then return true, "open" end
            return nil, "pin"
        end
        -- turning back at the start of a number in the right direction is just getting ready
        if dir == MGSafe.Direction(s.pin) and not s.armed then
            s.lastDir = dir
        else
            s.lives, s.armed = s.lives - 1, false
            s.lastDir = dir
            if s.lives <= 0 then return false, "wrong" end
            return nil, "wrong"
        end
    end
    s.lastDir = dir

    local before = math.floor(s.dial)
    local speed = input.slow and o.slowSpeed or o.speed
    s.dial = (s.dial + dir * speed * dt) % DIAL
    if math.floor(s.dial) ~= before then event = "turn" end

    if dir == MGSafe.Direction(s.pin) then
        local near = Gap(s.dial, target) <= o.tolerance
        if near and not s.armed then s.armed, event = true, "click" end
        if not near and s.armed then s.armed = false end -- went past it
    end
    return nil, event
end

local function Sound(name) PlaySoundFrontend(-1, name, SoundSet, true) end

local function ReadInput()
    return {
        left = IsDisabledControlPressed(0, 34) or IsControlPressed(0, 174),
        right = IsDisabledControlPressed(0, 35) or IsControlPressed(0, 175),
        slow = IsDisabledControlPressed(0, 21),
    }
end

local function Draw(s, o, aspect)
    DrawSprite(Dict, "Dial_BG", 0.5, 0.42, 0.3, aspect * 0.3, 0.0, 255, 255, 255, 255)
    DrawSprite(Dict, "Dial", 0.5, 0.42, 0.15, aspect * 0.15, s.dial * 360.0 / DIAL, 255, 255, 255, 255)
    local n = #o.combination
    for i = 1, n do
        local x = 0.5 + (i - (n + 1) / 2) * 0.05
        DrawSprite(Dict, i < s.pin and "lock_open" or "lock_closed", x, 0.72, 0.03, aspect * 0.03, 0.0, 255, 255, 255, 255)
    end
end

local function DrawTop(text)
    SetTextFont(4)
    SetTextScale(0.45, 0.45)
    SetTextColour(255, 255, 255, 220)
    SetTextCentre(true)
    SetTextOutline()
    BeginTextCommandDisplayText("STRING")
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayText(0.5, 0.06)
end

local function PlayAnim(ped, anim, current)
    if current == anim then return current end
    TaskPlayAnim(ped, Anims, anim, 4.0, -4.0, -1, 1, 0, false, false, false)
    return anim
end

function MGSafe.Start(o)
    if MGSafe.active then return false end
    RequestStreamedTextureDict(Dict, false)
    local waited = 0
    while not HasStreamedTextureDictLoaded(Dict) do
        if waited >= 5000 then return nil end -- no dial textures: the calling script decides
        Citizen.Wait(10)
        waited = waited + 10
    end
    RequestAmbientAudioBank("SAFE_CRACK", false)
    local ped = PlayerPedId()
    if o.animate then
        RequestAnimDict(Anims)
        local until_ = GetGameTimer() + 3000
        while not HasAnimDictLoaded(Anims) and GetGameTimer() < until_ do Citizen.Wait(10) end
    end

    MGSafe.active = true
    if not o.combination then o.combination = MGSafe.Combination(o.numbers) end
    local s = {dial = 0.0, pin = 1, lastDir = 0, armed = false, lives = o.lives}
    local help = Help[MG.Locale] or Help.en
    local started, lastTurn, anim = GetGameTimer(), 0, nil
    local aspect = GetAspectRatio(false)
    local result

    while result == nil do
        for _, c in ipairs(Disabled) do DisableControlAction(0, c, true) end
        local left = o.time - (GetGameTimer() - started) / 1000
        if left <= 0 or IsControlJustPressed(0, 177) or IsDisabledControlJustPressed(0, 200) or IsEntityDead(ped) then
            result = false
        else
            local input = ReadInput()
            local event
            result, event = MGSafe.Step(s, input, GetFrameTime(), o)
            local now = GetGameTimer()
            if event == "turn" and now - lastTurn > 60 then Sound("TUMBLER_TURN") lastTurn = now end
            if event == "click" then Sound("TUMBLER_PIN_FALL") SetPadShake(0, 120, 200) end
            if event == "pin" then Sound("TUMBLER_PIN_FALL") end
            if event == "open" then Sound("TUMBLER_PIN_FALL_FINAL") end
            if event == "wrong" then Sound("TUMBLER_RESET") end
            if o.animate then
                local turning = input.left ~= input.right
                anim = PlayAnim(ped, not turning and "idle_base" or (input.right and "dial_turn_clock_normal" or "dial_turn_anti_normal"), anim)
            end
            DrawTop(("%s: %d   %d s"):format(ML("lives"), s.lives, math.ceil(left)))
        end
        Draw(s, o, aspect)
        BeginTextCommandDisplayHelp("STRING")
        AddTextComponentSubstringPlayerName(help)
        EndTextCommandDisplayHelp(0, false, false, -1)
        Citizen.Wait(0)
    end

    if result and o.animate then Sound("SAFE_DOOR_OPEN") end
    if o.animate then ClearPedTasks(ped) end
    SetStreamedTextureDictAsNoLongerNeeded(Dict)
    MGSafe.active = false
    return result
end
