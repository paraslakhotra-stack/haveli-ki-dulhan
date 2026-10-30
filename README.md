# 🕯 NIGHTFALL — *The Blackthorn Wedding*

A story-mode horror party game for a bachelor party.
- The laptop shows the haunted manor on the TV.
- Every guest's phone is their controller, like BombSquad Remote.
- Guests don't download anything: they scan a QR code.

About 60–80 minutes, 3–12 players (best with 6–10), split into 2–3 competing covens.

> The full story, every narration line and all the content are in **[STORY.md](STORY.md)**.

---

## Party-night setup (5 minutes)

**You need:** a laptop (Mac or Windows) with **Node.js 18+**, an HDMI cable to the TV, and a Wi-Fi network that both the laptop and the guests' phones are on.

1. **Install once, before the party** (needs internet):
   ```bash
   cd nightfall
   npm install
   ```
2. **Start the game.** On a Mac, double-click `start.command`. On Windows, double-click `start.bat`. Or run:
   ```bash
   npm start
   ```
   The terminal prints two addresses and a QR code.
3. **Plug the laptop into the TV.** Open **http://localhost:3000/tv** in Chrome, press **F** for full screen, then click **Enter the Manor**. That click turns the sound on.
4. **Guests scan the QR code on the TV.** They type a name, take a selfie and tap *Sign the Guest Book*.
5. **The first person to join is the Host ♛.**
   - The host taps **Set up the night** and chooses who the groom is and the bride's name.
   - The host picks **Mild** or **Spicy**. Spicy is still office-safe.
   - Optionally, the host fills in "How well do they know the groom?" questions.
   - Then the host taps **Begin the Night**.

Turn the volume **up**. The sound design does half the scaring.

### If phones can't connect
- The phones must be on the **same Wi-Fi** as the laptop. Guest networks that isolate devices block the game; use the main network or a phone hotspot.
- **Windows:** when the firewall pops up, click **Allow access** and tick *Private networks*.
- **Mac:** click **Allow** on the *"node" wants to accept incoming connections* prompt.
- If the printed address is wrong (VPNs and Docker can confuse it), find the laptop's Wi-Fi IP and have guests open `http://THAT-IP:3000/play`.
- **Port busy?** The game automatically tries 3001, 3002 and so on, and prints the address it actually used.

### "Install" on phones (optional)
- **iPhone:** tap Share, then **Add to Home Screen**.
- **Android:** tap ⋮, then **Add to Home screen** or **Install app**.

The game then opens full screen like an app. It isn't required, though: the browser works fine.

---

## The night

| | Chapter | Games |
|---|---|---|
| ✦ | **The Invitation** | Sign the guest book with a selfie. The Sorting Candles pick the covens. |
| I | **The Guest Book** | **Séance Circle**: a coven communication puzzle where clues are on other people's phones. |
| II | **The Library of Whispers** | **Forbidden Quiz**: groom questions, horror trivia, and "Who among you…" votes. |
| III | **The Nursery** | **Trials of Nerve**: Hold the Candle, The Music Box, Banish Her, Don't Blink and The Portrait Gallery. |
| IV | **The Reception Hall** | **The Possessed** (a secret traitor), **The Toast** (roasts, with host veto), **The Poisoned Glass** (a coven logic puzzle) and **The Unmasking**. |
| V | **The Dead Don't Dance** | **Zombie apocalypse.** Everyone fights on the TV with a phone thumbstick, earns weapons and powers, and faces the boss Edmund. |
| VI | **The Midnight Vow** | **The Crypt Code**, where clues collected all night are shared out loud. Then **The Three Brides**: white whispers are true and red ones lie. Then **The Vow of the Bachelors**. |
| ☀ | **Dawn** | Credits starring everyone's faces, awards, and the Blackthorn Trophy. |

The lowest scorer of chapters I–IV pays **Vesper's Dues**, a forfeit card. Players can always **pass**.

---

## Host cheat sheet

| Want to… | Phone (host) | Laptop keyboard |
|---|---|---|
| Pause or resume | ⏸ (bottom-left) or ♛ → Pause | **Space** |
| Skip the current step | ⏭ | **N** or **→** |
| Start from the lobby | *Begin the Night* | **S** |
| Full screen | — | **F** |
| Change Mild or Spicy mid-game | ♛ → Heat level | — |
| Turn the narrator voice on or off | ♛ → Spoken narration | — |
| Remove a guest | ♛ → Guests → Remove | — |
| Jump to a chapter (rehearsal) | ♛ → Jump to a chapter | — |
| Restart everything | ♛ → Restart the night | — |

- **Veto:** in The Toast and The Vow, the host sees every answer before the TV does and can hide anything that might upset someone.
- **Phones locking is fine.** A guest who locks their phone or refreshes rejoins their own seat. If the host disappears for 30 seconds, the crown passes to someone else.
- **Laptop crashed or went to sleep?** Run `npm start` again. The night **resumes at the chapter it was on**, with all scores kept. Use `npm start -- --new` to start fresh.

---

## For tinkerers

```bash
npm test
```
Unit tests: the engine plays full nights with bots, plus team balance, secrets, reconnect, pause, save/resume and the arena.

```bash
npm run fast
```
Every timer runs about 12× faster. Good for a rehearsal.

```bash
npm run e2e
```
Real Chromium: a TV plus phones play the entire night and the run fails on any console error. Needs Playwright.

```bash
node test/e2e/showcase.mjs
```
Real-speed screenshots of every environment.

- **Engine:** `server/engine/`. A server-authoritative state machine, with one step module per game in `steps/` and the zombie simulation in `arena/sim.js`.
- **Content:** `server/content/`. Narration, quiz, roasts and forfeits, with mild and spicy versions. Edit freely.
- **TV:** `public/tv/`. Procedural environments, the narrator, the arena renderer and the screens.
- **Phones:** `public/play/`.
- **Sound:** `public/shared/audio.js`. Everything is synthesised live with Web Audio, including convolution reverb, the music-box lullaby and zombie groans. There are no audio files.
- **Open-source libraries used** (all MIT/ISC, all served locally so the game works offline):
  - [nipplejs](https://github.com/yoannmoinet/nipplejs): the thumbstick.
  - [ZzFX](https://github.com/KilledByAPixel/ZzFX): weapon sounds.
  - [simplex-noise](https://github.com/jwagner/simplex-noise.js): fog and grass.
  - [canvas-confetti](https://github.com/catdad/canvas-confetti): petals.
  - Socket.IO, Express and node-qrcode.
