fx_version "cerulean"
game "gta5"
lua54 "yes"

author "Vega"
description "Minigames for any FiveM script: GTA drill, GTA hacking laptop, keypad, wires, lockpick and fingerprint"
version "1.0.0"
repository "https://github.com/Vega421/tobs_minigames"

shared_scripts {
    "config.lua",
    "locales/locales.lua",
}

client_scripts {
    "client/drill.lua",
    "client/hack.lua",
    "client/main.lua",
}

ui_page "web/index.html"

files {
    "web/index.html",
    "web/style.css",
    "web/logic.js",
    "web/app.js",
}
