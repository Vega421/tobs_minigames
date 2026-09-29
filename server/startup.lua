-- One short line in the server console when tobs_minigames starts, and a hint when the server runs
-- minigame resources that a drop-in from [tobs_minigames-compat] could replace (so the scripts that
-- use them get tobs_minigames' games without being edited). MG.StartupMessage = false turns it off.

-- The originals a drop-in can replace. Our drop-ins say "played with tobs_minigames" in their
-- manifest description, so they aren't mistaken for the originals.
MGReplaceable = {"qb-minigames", "memorygame", "mhacking", "safecracker"}

-- The drop-ins come in a later update: until then the hint stays off, since the download has no
-- [tobs_minigames-compat] folder to point to
MGDropInsShipped = false

local function IsOurDropIn(res)
    local d = GetResourceMetadata(res, "description", 0)
    return type(d) == "string" and d:find("played with tobs_minigames", 1, true) ~= nil
end

-- The original minigame resources running on this server that a drop-in could replace
function MGReplaceableRunning()
    local found = {}
    for _, name in ipairs(MGReplaceable) do
        if GetResourceState(name) == "started" and not IsOurDropIn(name) then found[#found + 1] = name end
    end
    return found
end

function MGStartupMessage()
    local version = GetResourceMetadata(GetCurrentResourceName(), "version", 0) or "?"
    print(("^2[tobs_minigames] %s started. Test every minigame in game with /%s.^7"):format(version, MG.TestCommand or "minigame"))
    if not MGDropInsShipped then return {} end
    local found = MGReplaceableRunning()
    if #found > 0 then
        print(("^3[tobs_minigames] Optional: %s can use tobs_minigames' games too. Replace %s with the folder of the same name from [tobs_minigames-compat] and the scripts that use %s switch over without edits.^7")
            :format(table.concat(found, ", "), #found == 1 and "it" or "each", #found == 1 and "it" or "them"))
    end
    return found
end

Citizen.CreateThread(function()
    if MG.StartupMessage == false then return end
    Citizen.Wait(3000) -- after the other resources have started
    MGStartupMessage()
end)
