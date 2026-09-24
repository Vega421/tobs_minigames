-- Shared on-screen text for the three GTA screens (drill, hack, safe), in GTA Online's style:
--
-- MGButtons: GTA's key bar at the bottom right ("instructional buttons": a key icon and what it
-- does). Movie and method names (INSTRUCTIONAL_BUTTONS, CLEAR_ALL, SET_DATA_SLOT,
-- DRAW_INSTRUCTIONAL_BUTTONS) were checked in TomGrobbe/MenuAPI (names only). The icons come from
-- GetControlInstructionalButton and are pushed with ScaleformMovieMethodAddParamPlayerNameString,
-- which switches them to controller icons when a controller is used (citizenfx/natives).
--
-- MGHud: the title and short messages at the top centre of the screen.

MGButtons = {}

-- buttons = {{control = 32, label = "Push"}, ...}. The first one is drawn on the right.
-- Returns the movie, or nil when it didn't load (the game then just runs without the bar).
function MGButtons.Load(buttons)
    local sf = RequestScaleformMovie("INSTRUCTIONAL_BUTTONS")
    local waited = 0
    while not HasScaleformMovieLoaded(sf) do
        if waited >= 2000 then return nil end
        Citizen.Wait(10)
        waited = waited + 10
    end
    BeginScaleformMovieMethod(sf, "CLEAR_ALL")
    EndScaleformMovieMethod()
    for i, b in ipairs(buttons) do
        BeginScaleformMovieMethod(sf, "SET_DATA_SLOT")
        ScaleformMovieMethodAddParamInt(i - 1)
        ScaleformMovieMethodAddParamPlayerNameString(GetControlInstructionalButton(0, b.control, true))
        BeginTextCommandScaleformString("STRING")
        AddTextComponentSubstringPlayerName(b.label)
        EndTextCommandScaleformString()
        EndScaleformMovieMethod()
    end
    BeginScaleformMovieMethod(sf, "DRAW_INSTRUCTIONAL_BUTTONS")
    ScaleformMovieMethodAddParamInt(0)
    EndScaleformMovieMethod()
    return sf
end

-- Every frame, after the game's own screen (so the bar is drawn on top)
function MGButtons.Draw(sf)
    if sf then DrawScaleformMovieFullscreen(sf, 255, 255, 255, 255, 0) end
end

function MGButtons.Release(sf)
    if sf then SetScaleformMovieAsNoLongerNeeded(sf) end
end

MGHud = {}

-- White text with an outline, centred at y (0 = top of the screen)
function MGHud.Text(text, y, scale)
    SetTextFont(4)
    SetTextScale(scale or 0.45, scale or 0.45)
    SetTextColour(255, 255, 255, 230)
    SetTextCentre(true)
    SetTextOutline()
    BeginTextCommandDisplayText("STRING")
    AddTextComponentSubstringPlayerName(text)
    EndTextCommandDisplayText(0.5, y)
end

-- A short message under the title for `ms` milliseconds. m = the table the game keeps it in.
function MGHud.Say(m, text, ms)
    if m == nil then return end
    m.text, m.untilMs = text, GetGameTimer() + (ms or 2000)
end

-- The title (the game's name), a line under it (time, lives, depth), and the current message
function MGHud.Draw(title, info, m)
    MGHud.Text(title, 0.025, 0.55)
    if info and info ~= "" then MGHud.Text(info, 0.068, 0.42) end
    if m and m.text and GetGameTimer() < (m.untilMs or 0) then MGHud.Text(m.text, 0.105, 0.48) end
end
