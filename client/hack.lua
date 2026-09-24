-- GTA Online's hacking laptop (scaleform "HACKING_PC", from the Pacific Standard heist) as a hack minigame.
-- The player opens My Computer, runs HackConnect.exe (IP Connect: arrow keys + Enter), then
-- BruteForce.exe (stop each letter column on the password: Enter or left click).
-- Method names and click results were looked up in TransitNode/Hacking_PC and draobrehtom's
-- HackingGame gist (neither has a license, so no code was copied from them).
--
-- MGHack.Start(o, intro) blocks until done and returns true (hacked), false (out of lives, out of
-- time, powered off, stopped or died), or nil if the laptop screen didn't load. o = the settings from
-- MG.Hack (see config.lua): lives, ipConnect, timeLimit, background, columnSpeed, words.
-- intro: shows the "how to play" card once the laptop has loaded; false from it = gave up.
-- On screen, like GTA Online: the key bar at the bottom right, the title and time left at the top
-- (client/gtaui.lua).

MGHack = {}

-- What the scaleform returns when something is clicked
MGHack.Result = {POWER_OFF = 6, HACKCONNECT = 82, BRUTEFORCE = 83, IP_WIN = 84, IP_LOSE = 85, WORD_WIN = 86, WRONG_LETTER = 87}

local Text = {
    en = {pc = "My Computer", off = "Power Off", disk = "Local Disk (C:)", net = "Network", usb = "External Device (J:)",
          ip_ok = "CONNECTED", ip_first = "Run HackConnect.exe first", win = "BRUTEFORCE SUCCESSFUL!", lose = "BRUTEFORCE FAILED!", time = "Time left: %d s"},
    da = {pc = "Denne computer", off = "Sluk", disk = "Lokal disk (C:)", net = "Netværk", usb = "Ekstern enhed (J:)",
          ip_ok = "FORBUNDET", ip_first = "Kør HackConnect.exe først", win = "BRUTEFORCE LYKKEDES!", lose = "BRUTEFORCE MISLYKKEDES!", time = "Tid tilbage: %d s"},
    de = {pc = "Arbeitsplatz", off = "Ausschalten", disk = "Lokaler Datenträger (C:)", net = "Netzwerk", usb = "Externes Gerät (J:)",
          ip_ok = "VERBUNDEN", ip_first = "Zuerst HackConnect.exe ausführen", win = "BRUTEFORCE ERFOLGREICH!", lose = "BRUTEFORCE FEHLGESCHLAGEN!", time = "Verbleibend: %d s"},
    sv = {pc = "Den här datorn", off = "Stäng av", disk = "Lokal disk (C:)", net = "Nätverk", usb = "Extern enhet (J:)",
          ip_ok = "ANSLUTEN", ip_first = "Kör HackConnect.exe först", win = "BRUTEFORCE LYCKADES!", lose = "BRUTEFORCE MISSLYCKADES!", time = "Tid kvar: %d s"},
    no = {pc = "Denne datamaskinen", off = "Slå av", disk = "Lokal disk (C:)", net = "Nettverk", usb = "Ekstern enhet (J:)",
          ip_ok = "TILKOBLET", ip_first = "Kjør HackConnect.exe først", win = "BRUTEFORCE VELLYKKET!", lose = "BRUTEFORCE MISLYKTES!", time = "Tid igjen: %d s"},
    nl = {pc = "Deze computer", off = "Uitschakelen", disk = "Lokale schijf (C:)", net = "Netwerk", usb = "Extern apparaat (J:)",
          ip_ok = "VERBONDEN", ip_first = "Voer eerst HackConnect.exe uit", win = "BRUTEFORCE GELUKT!", lose = "BRUTEFORCE MISLUKT!", time = "Resterende tijd: %d s"},
}

-- Movement, attack, aim, phone arrows and pause menu go to the laptop instead
local Disabled = {24, 25, 30, 31, 32, 33, 34, 35, 44, 140, 141, 142, 172, 173, 174, 175, 176, 199, 200}
-- Arrow keys during IP Connect: control -> scaleform input event (up, down, left, right)
local Arrows = {{172, 8}, {173, 9}, {174, 10}, {175, 11}}

-- Calls a scaleform method with numbers, booleans and strings as parameters
local function Call(sf, method, ...)
    BeginScaleformMovieMethod(sf, method)
    for _, v in ipairs({...}) do
        if type(v) == "boolean" then ScaleformMovieMethodAddParamBool(v)
        elseif type(v) == "string" then ScaleformMovieMethodAddParamTextureNameString(v)
        elseif math.type(v) == "integer" then ScaleformMovieMethodAddParamInt(v)
        else ScaleformMovieMethodAddParamFloat(v) end
    end
    EndScaleformMovieMethod()
end

local function Sound(name) PlaySoundFrontend(-1, name, "", true) end

function MGHack.Word(o)
    if type(o.words) == "table" and #o.words > 0 then return o.words[math.random(#o.words)] end
    local w = ""
    for _ = 1, 8 do w = w .. string.char(math.random(65, 90)) end
    return w
end

local function Setup(sf, o, t)
    Call(sf, "SET_LABELS", t.disk, t.net, t.usb, "HackConnect.exe", "BruteForce.exe")
    Call(sf, "SET_BACKGROUND", math.floor(o.background))
    Call(sf, "ADD_PROGRAM", 1.0, 4.0, t.pc)
    Call(sf, "ADD_PROGRAM", 6.0, 6.0, t.off)
    Call(sf, "SET_LIVES", math.floor(o.lives), math.floor(o.lives))
    local lo, hi = math.floor(o.columnSpeed[1]), math.floor(o.columnSpeed[2])
    for col = 0, 7 do Call(sf, "SET_COLUMN_SPEED", col, math.random(math.min(lo, hi), math.max(lo, hi))) end
end

-- Handles one click result. Returns true / false when the hack is over, nil to keep going.
-- g = {app = nil | "ip" | "word", ipDone, lives, msg = {} (the message at the top)}
function MGHack.Handle(sf, g, id, o, t)
    local R = MGHack.Result
    if id == R.POWER_OFF then
        return false
    elseif id == R.HACKCONNECT and not g.app then
        Call(sf, "OPEN_APP", 0.0)
        g.app = "ip"
    elseif id == R.BRUTEFORCE and not g.app then
        if o.ipConnect and not g.ipDone then
            Sound("HACKING_CLICK_BAD")
            MGHud.Say(g.msg, t.ip_first, 3000)
            return nil
        end
        Call(sf, "SET_LIVES", g.lives, math.floor(o.lives))
        Call(sf, "OPEN_APP", 1.0)
        Call(sf, "SET_ROULETTE_WORD", MGHack.Word(o))
        g.app = "word"
    elseif id == R.IP_WIN and g.app == "ip" then
        Sound("HACKING_SUCCESS")
        Call(sf, "SET_IP_OUTCOME", true, t.ip_ok)
        Call(sf, "CLOSE_APP")
        g.app, g.ipDone = nil, true
    elseif id == R.IP_LOSE and g.app == "ip" then
        Sound("HACKING_FAILURE")
        return false
    elseif id == R.WRONG_LETTER and g.app then
        -- a wrong pick in either app costs a life (both apps share them, like in GTA Online)
        g.lives = g.lives - 1
        Sound("HACKING_CLICK_BAD")
        Call(sf, "SET_LIVES", g.lives, math.floor(o.lives))
        if g.lives <= 0 then
            Sound("HACKING_FAILURE")
            if g.app == "word" then Call(sf, "SET_ROULETTE_OUTCOME", false, t.lose) end
            return false
        end
    elseif id == R.WORD_WIN and g.app == "word" then
        Sound("HACKING_SUCCESS")
        Call(sf, "SET_ROULETTE_OUTCOME", true, t.win)
        return true
    end
    return nil
end

-- The key bar: select (left click, or ENTER inside a program), back, the arrow keys and ESC
local function Buttons()
    return MGButtons.Load({
        {control = 200, label = ML("btn_stop")},
        {control = 172, label = ML("btn_move")},
        {control = 25, label = ML("btn_back")},
        {control = 24, label = ML("btn_select")},
    })
end

function MGHack.Start(o, intro)
    if MGHack.active then return false end
    local t = Text[MG.Locale] or Text.en

    local sf = RequestScaleformMovieSkipRenderWhilePaused("HACKING_PC") -- old name: RequestScaleformMovieInteractive
    local waited = 0
    while not HasScaleformMovieLoaded(sf) do
        if waited >= 5000 then return nil end -- no laptop screen: the caller runs its normal minigame
        Citizen.Wait(10)
        waited = waited + 10
    end

    if intro and not intro() then
        SetScaleformMovieAsNoLongerNeeded(sf)
        return false
    end

    MGHack.active = true
    Setup(sf, o, t)
    local buttons = Buttons()
    local title = ML("title_hack")
    local g = {lives = math.floor(o.lives), msg = {}}
    local ped, started = PlayerPedId(), GetGameTimer()
    local pending, result, shownUntil

    while result == nil or (shownUntil and GetGameTimer() < shownUntil) do
        for _, c in ipairs(Disabled) do DisableControlAction(0, c, true) end
        DrawScaleformMovieFullscreen(sf, 255, 255, 255, 255, 0)

        if result == nil then
            local left = o.timeLimit - (GetGameTimer() - started) / 1000
            if left <= 0 or IsEntityDead(ped) or IsDisabledControlJustPressed(0, 200) then
                result = false
            else
                Call(sf, "SET_CURSOR", GetControlNormal(0, 239), GetControlNormal(0, 240))
                if not pending then
                    if IsDisabledControlJustPressed(0, 24) or (g.app and IsDisabledControlJustPressed(0, 176)) then
                        BeginScaleformMovieMethod(sf, "SET_INPUT_EVENT_SELECT")
                        pending = EndScaleformMovieMethodReturnValue()
                        Sound("HACKING_CLICK")
                    elseif IsDisabledControlJustPressed(0, 25) and not g.app then
                        Call(sf, "SET_INPUT_EVENT_BACK")
                        Sound("HACKING_CLICK")
                    elseif g.app then
                        for _, a in ipairs(Arrows) do
                            if IsDisabledControlJustPressed(0, a[1]) then Call(sf, "SET_INPUT_EVENT", a[2]) break end
                        end
                    end
                end
                if pending and IsScaleformMovieMethodReturnValueReady(pending) then
                    local id = GetScaleformMovieMethodReturnValueInt(pending)
                    pending = nil
                    result = MGHack.Handle(sf, g, id, o, t)
                    -- let the win / lose message show for a moment
                    if result ~= nil and g.app == "word" then shownUntil = GetGameTimer() + 2500 end
                end
                MGHud.Draw(title, string.format(t.time, math.ceil(left)), g.msg)
                MGButtons.Draw(buttons)
            end
        end
        Citizen.Wait(0)
    end

    SetScaleformMovieAsNoLongerNeeded(sf)
    MGButtons.Release(buttons)
    MGHack.active = false
    return result
end
