# Bedrock Games

Browser game library for Bedrock. It only opens when launched from Bedrock (see `gate.js`).

- `config/games.json`: the original Bedrock games (hosted in `projects/`)
- `config/ugs-games.json`: games from the Ultimate Game Stash (`ugs/` loader pages)
- `js/library.js`: search, filters, favorites and the player. Stash games run in a sandboxed frame with a storage shim; the player's Compatibility mode runs a game unsandboxed.

Many games come from the Ultimate Game Stash. All games belong to their respective owners.
