fx_version "cerulean"
game "gta5"
lua54 "yes"

author "Vega"
description "Minigames for any FiveM script: GTA drill, hacking laptop and safe, thermite, keypad, wires, lockpick and fingerprint"
version "1.0.0"
repository "https://github.com/Vega421/tobs_minigames"

shared_scripts {
    "config.lua",
    "locales/locales.lua",
    "shared/options.lua",
}

client_scripts {
    "client/drill.lua",
    "client/hack.lua",
    "client/safe.lua",
    "client/main.lua",
    "client/tracker.lua",
    "client/testmenu.lua",
}

server_scripts {
    "server/main.lua",
    "server/tracker.lua",
}

ui_page "web/index.html"

files {
    "web/index.html",
    "web/style.css",
    "web/logic.js",
    "web/app.js",
}
