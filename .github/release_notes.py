"""Builds the GitHub release notes for one version from CHANGELOG.md.

Usage: python3 .github/release_notes.py 1.0.0 > notes.md
"""
import re
import sys

REPO = "Vega421/tobs_minigames"
ZIP = "tobs_minigames-v{version}.zip"
DOCS = "https://github.com/Vega421/tobs_minigames#readme"

version = sys.argv[1].lstrip("v")
changelog = open("CHANGELOG.md", encoding="utf-8").read()
match = re.search(r"^## v?" + re.escape(version) + r"\b.*?\n(.*?)(?=^## |\Z)", changelog, re.S | re.M)
changes = match.group(1).strip() if match else "See the [changelog](https://github.com/{}/blob/main/CHANGELOG.md).".format(REPO)

print(f"""## What's new

{changes}

## Install

1. Download **`{ZIP.format(version=version)}`** below.
2. Delete your old `tobs_minigames` folder, then unzip this one into `resources/`.
3. Add `ensure tobs_minigames` to `server.cfg`, before the scripts that use it.

**Works with:** any framework (it doesn't need one). Try the games in game with `/minigame keypad hard`.

---

📖 [Documentation]({DOCS}) · 📝 [Full changelog](https://github.com/{REPO}/blob/main/CHANGELOG.md) · 🐛 [Report a problem](https://github.com/{REPO}/issues)""")
