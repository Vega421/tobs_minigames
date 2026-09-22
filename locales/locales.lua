-- Texts for the web minigames and the test command. The drill and the laptop keep their GTA help
-- texts in client/drill.lua and client/hack.lua. Keep %s and %d: they're replaced with words and numbers.
-- Wire colours come twice: as an adjective for "the red wire" (red = ...) and as a name for
-- "the wire right below red" (n_red = ...).

MGLocales = {
    en = {
        title_keypad = "Keypad", title_wires = "Wire cutting", title_lockpick = "Lockpick", title_fingerprint = "Fingerprint",
        keypad_memorize = "Remember the code", keypad_enter = "Enter the code", keypad_wrong = "Wrong code",
        clear = "Clear", enter = "Enter",
        wires_hint = "Cut the wires in this order",
        clue_color = "the %s wire", clue_position = "wire %d from the top",
        clue_below = "the wire right below %s", clue_above = "the wire right above %s",
        red = "red", blue = "blue", yellow = "yellow", green = "green", white = "white", black = "black", orange = "orange", purple = "purple",
        n_red = "red", n_blue = "blue", n_yellow = "yellow", n_green = "green", n_white = "white", n_black = "black", n_orange = "orange", n_purple = "purple",
        lockpick_hint = "Press SPACE or click when the pick is in the gold zone", pick_broke = "The pick broke",
        fingerprint_hint = "Select the 4 pieces of this fingerprint", check = "Check", no_match = "No match",
        lives = "Lives", attempts = "Attempts", give_up = "ESC to give up",
        success = "Success", failed = "Failed", time_up = "Time's up",
        test_usage = "Usage: /%s drill|hack|keypad|wires|lockpick|fingerprint [easy|medium|hard]",
        test_passed = "You passed the %s minigame.", test_failed = "You failed the %s minigame.",
        test_no_screen = "The %s minigame's screen didn't load.",
    },
    da = {
        title_keypad = "Kodelås", title_wires = "Klip ledningerne", title_lockpick = "Dirk", title_fingerprint = "Fingeraftryk",
        keypad_memorize = "Husk koden", keypad_enter = "Indtast koden", keypad_wrong = "Forkert kode",
        clear = "Slet", enter = "OK",
        wires_hint = "Klip ledningerne i denne rækkefølge",
        clue_color = "den %s ledning", clue_position = "ledning %d fra toppen",
        clue_below = "ledningen lige under %s", clue_above = "ledningen lige over %s",
        red = "røde", blue = "blå", yellow = "gule", green = "grønne", white = "hvide", black = "sorte", orange = "orange", purple = "lilla",
        n_red = "rød", n_blue = "blå", n_yellow = "gul", n_green = "grøn", n_white = "hvid", n_black = "sort", n_orange = "orange", n_purple = "lilla",
        lockpick_hint = "Tryk MELLEMRUM eller klik, når dirken er i det gyldne felt", pick_broke = "Dirken knækkede",
        fingerprint_hint = "Vælg de 4 dele af dette fingeraftryk", check = "Tjek", no_match = "Ikke et match",
        lives = "Liv", attempts = "Forsøg", give_up = "ESC for at give op",
        success = "Lykkedes", failed = "Mislykkedes", time_up = "Tiden er gået",
        test_usage = "Brug: /%s drill|hack|keypad|wires|lockpick|fingerprint [easy|medium|hard]",
        test_passed = "Du klarede %s-minispillet.", test_failed = "Du fejlede %s-minispillet.",
        test_no_screen = "Skærmen til %s-minispillet kunne ikke indlæses.",
    },
    de = {
        title_keypad = "Tastenfeld", title_wires = "Kabel schneiden", title_lockpick = "Dietrich", title_fingerprint = "Fingerabdruck",
        keypad_memorize = "Merk dir den Code", keypad_enter = "Gib den Code ein", keypad_wrong = "Falscher Code",
        clear = "Löschen", enter = "OK",
        wires_hint = "Schneide die Kabel in dieser Reihenfolge",
        clue_color = "das %s Kabel", clue_position = "Kabel %d von oben",
        clue_below = "das Kabel direkt unter %s", clue_above = "das Kabel direkt über %s",
        red = "rote", blue = "blaue", yellow = "gelbe", green = "grüne", white = "weiße", black = "schwarze", orange = "orange", purple = "lila",
        n_red = "Rot", n_blue = "Blau", n_yellow = "Gelb", n_green = "Grün", n_white = "Weiß", n_black = "Schwarz", n_orange = "Orange", n_purple = "Lila",
        lockpick_hint = "Drück LEERTASTE oder klick, wenn der Dietrich im goldenen Bereich ist", pick_broke = "Der Dietrich ist abgebrochen",
        fingerprint_hint = "Wähle die 4 Teile dieses Fingerabdrucks", check = "Prüfen", no_match = "Keine Übereinstimmung",
        lives = "Leben", attempts = "Versuche", give_up = "ESC zum Aufgeben",
        success = "Geschafft", failed = "Fehlgeschlagen", time_up = "Zeit abgelaufen",
        test_usage = "Nutzung: /%s drill|hack|keypad|wires|lockpick|fingerprint [easy|medium|hard]",
        test_passed = "Du hast das Minispiel %s geschafft.", test_failed = "Du hast das Minispiel %s nicht geschafft.",
        test_no_screen = "Der Bildschirm des Minispiels %s wurde nicht geladen.",
    },
    sv = {
        title_keypad = "Kodlås", title_wires = "Klipp kablarna", title_lockpick = "Dyrk", title_fingerprint = "Fingeravtryck",
        keypad_memorize = "Kom ihåg koden", keypad_enter = "Skriv in koden", keypad_wrong = "Fel kod",
        clear = "Rensa", enter = "OK",
        wires_hint = "Klipp kablarna i den här ordningen",
        clue_color = "den %s kabeln", clue_position = "kabel %d uppifrån",
        clue_below = "kabeln direkt under %s", clue_above = "kabeln direkt över %s",
        red = "röda", blue = "blå", yellow = "gula", green = "gröna", white = "vita", black = "svarta", orange = "orange", purple = "lila",
        n_red = "röd", n_blue = "blå", n_yellow = "gul", n_green = "grön", n_white = "vit", n_black = "svart", n_orange = "orange", n_purple = "lila",
        lockpick_hint = "Tryck MELLANSLAG eller klicka när dyrken är i det gyllene fältet", pick_broke = "Dyrken gick sönder",
        fingerprint_hint = "Välj de 4 delarna av det här fingeravtrycket", check = "Kolla", no_match = "Ingen matchning",
        lives = "Liv", attempts = "Försök", give_up = "ESC för att ge upp",
        success = "Lyckades", failed = "Misslyckades", time_up = "Tiden är ute",
        test_usage = "Användning: /%s drill|hack|keypad|wires|lockpick|fingerprint [easy|medium|hard]",
        test_passed = "Du klarade minispelet %s.", test_failed = "Du misslyckades med minispelet %s.",
        test_no_screen = "Skärmen för minispelet %s laddades inte.",
    },
    no = {
        title_keypad = "Kodelås", title_wires = "Klipp ledningene", title_lockpick = "Dirk", title_fingerprint = "Fingeravtrykk",
        keypad_memorize = "Husk koden", keypad_enter = "Skriv inn koden", keypad_wrong = "Feil kode",
        clear = "Slett", enter = "OK",
        wires_hint = "Klipp ledningene i denne rekkefølgen",
        clue_color = "den %s ledningen", clue_position = "ledning %d fra toppen",
        clue_below = "ledningen rett under %s", clue_above = "ledningen rett over %s",
        red = "røde", blue = "blå", yellow = "gule", green = "grønne", white = "hvite", black = "svarte", orange = "oransje", purple = "lilla",
        n_red = "rød", n_blue = "blå", n_yellow = "gul", n_green = "grønn", n_white = "hvit", n_black = "svart", n_orange = "oransje", n_purple = "lilla",
        lockpick_hint = "Trykk MELLOMROM eller klikk når dirken er i det gylne feltet", pick_broke = "Dirken knakk",
        fingerprint_hint = "Velg de 4 delene av dette fingeravtrykket", check = "Sjekk", no_match = "Ingen treff",
        lives = "Liv", attempts = "Forsøk", give_up = "ESC for å gi opp",
        success = "Klarte det", failed = "Mislyktes", time_up = "Tiden er ute",
        test_usage = "Bruk: /%s drill|hack|keypad|wires|lockpick|fingerprint [easy|medium|hard]",
        test_passed = "Du klarte %s-minispillet.", test_failed = "Du klarte ikke %s-minispillet.",
        test_no_screen = "Skjermen til %s-minispillet lastet ikke.",
    },
    nl = {
        title_keypad = "Toetsenpaneel", title_wires = "Draden knippen", title_lockpick = "Slot openen", title_fingerprint = "Vingerafdruk",
        keypad_memorize = "Onthoud de code", keypad_enter = "Voer de code in", keypad_wrong = "Verkeerde code",
        clear = "Wissen", enter = "OK",
        wires_hint = "Knip de draden in deze volgorde",
        clue_color = "de %s draad", clue_position = "draad %d van boven",
        clue_below = "de draad direct onder %s", clue_above = "de draad direct boven %s",
        red = "rode", blue = "blauwe", yellow = "gele", green = "groene", white = "witte", black = "zwarte", orange = "oranje", purple = "paarse",
        n_red = "rood", n_blue = "blauw", n_yellow = "geel", n_green = "groen", n_white = "wit", n_black = "zwart", n_orange = "oranje", n_purple = "paars",
        lockpick_hint = "Druk op SPATIE of klik als het slothaakje in het gouden vak is", pick_broke = "Het slothaakje brak",
        fingerprint_hint = "Kies de 4 stukken van deze vingerafdruk", check = "Controleren", no_match = "Geen match",
        lives = "Levens", attempts = "Pogingen", give_up = "ESC om op te geven",
        success = "Gelukt", failed = "Mislukt", time_up = "De tijd is om",
        test_usage = "Gebruik: /%s drill|hack|keypad|wires|lockpick|fingerprint [easy|medium|hard]",
        test_passed = "Je hebt de %s-minigame gehaald.", test_failed = "Je hebt de %s-minigame niet gehaald.",
        test_no_screen = "Het scherm van de %s-minigame is niet geladen.",
    },
}

-- The texts for MG.Locale, with English for anything missing
function MGTexts()
    local out = {}
    for k, v in pairs(MGLocales.en) do out[k] = v end
    for k, v in pairs(MGLocales[MG.Locale] or {}) do out[k] = v end
    return out
end

function ML(key, ...)
    local text = (MGLocales[MG.Locale] or MGLocales.en)[key] or MGLocales.en[key] or key
    if select("#", ...) > 0 then return text:format(...) end
    return text
end
