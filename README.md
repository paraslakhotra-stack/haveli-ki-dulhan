# 🪔 HAVELI KI DULHAN — *a Nightfall story*

A story-mode **Indian horror party game** for a bachelor party.
- **The story:** a Punjabi groom's bachelor gang breaks down outside a haunted Rajasthani haveli, where Rajkumari Chandravati, the **Chudail Dulhan**, has been waiting for a dulha since 1925.
- **How it plays:** the haveli appears on the TV, and every guest's phone is their controller, like BombSquad Remote. Guests just open a link or scan a QR code.
- **Players:** 3–12 players (best with 6–10), split into 2–3 teams: Team Kaali Billi, Team Ullu and Team Naag.
- **Length:** about 60–80 minutes.
- **Language:** Hinglish, office-safe, and switchable between Mild and Spicy.

> The full story, every narration line and all the content are in **[STORY.md](STORY.md)**.

---

## Play online (Render): one link, anyone can start

**Deploy once (about 5 minutes):**
1. Go to **[render.com](https://render.com)** and sign in with GitHub. Then choose **New → Blueprint** and pick this repo.
2. Render reads `render.yaml` and creates the **haveli-ki-dulhan** web service. Click **Apply**.
3. When it shows *Live*, your links are:
   - **TV / laptop:** `https://<your-service>.onrender.com/tv`
   - **Phones:** scan the QR code on the TV, or open `https://<your-service>.onrender.com/play`

**On the night:**
1. Open the **/tv** link on whatever is connected to the TV: a laptop over HDMI, or a smart TV / Chromecast browser.
2. Click **Haveli Mein Chalo** to turn the sound on, and press **F** for full screen.
3. Guests scan the QR code and join from anywhere. They don't need the same Wi-Fi.

**Free plan tips:**
- The server **sleeps after 15 minutes idle**, so open the /tv link about a minute before the party to wake it.
- While the TV page is open, it pings the server so it stays awake.
- If you want it to never sleep, switch the service to Render's *Starter* plan.

There is **one shared game** per deployment. If the host taps **Restart the night**, everything starts fresh.

## Play offline (laptop + Wi-Fi)

**Install once:**
```bash
npm install
```

**Start the game:** double-click `start.command` on a Mac or `start.bat` on Windows. Or run:
```bash
npm start
```

**Then:**
1. Open **http://localhost:3000/tv** on the laptop connected to the TV.
2. Phones on the **same Wi-Fi** scan the QR code.
3. **Windows:** allow Node through the firewall. **Mac:** click "Allow incoming connections".

**Everyone:**
- The first person to join is the **Host ♛**.
- The host taps **Raat set up karo**, chooses the dulha, the bride's name and Mild or Spicy, and can optionally fill in "How well do they know the groom?".
- Then the host taps **Begin the Night**.

## The night

| | Chapter | Games |
|---|---|---|
| ✦ | **Shaadi Ka Card** | Sign the haveli ka register with a selfie. The diyas pick your team. |
| I | **Haveli Ka Darwaza** | **Tantrik Rangoli**: a team communication puzzle where the clues are on other people's phones. |
| II | **Pothi Khana** | **Forbidden Quiz**: groom questions, shaadi trivia, Bollywood horror and "Kaun hai jo…?" votes. |
| III | **Zenana Ka Jhoola** | **Trials of Nerve**: Diya Pakdo, Payal Ki Taal, Nimbu-Mirchi Bhagao, Pairon Ko Mat Dekho and Shaadi Album. |
| IV | **Sangeet Ki Daawat** | **The Possessed** (a secret traitor), **Sangeet Roast** (with host veto), **Zehreeli Thandai** (a team logic puzzle) and the **Unmasking**. |
| V | **Murda Baraat** | **Zombie baraat.** Everyone fights on the TV with a phone thumbstick against baraatis, Gossip Aunties and angry Fufajis, then the boss **Kunwar Vikram, the Bhoot Dulha**. Weapons level up from Desi Katta to Anaar Rocket. |
| VI | **Aadhi Raat Ka Mandap** | **Tijori Ka Taala**: the clues collected all night, shared out loud. Then **Teen Dulhanein**: white whispers are true and red ones lie. Then the **Saat Vachan of the Bachelors**. |
| ☀ | **Vidaai at Sunrise** | Credits starring everyone's faces, awards, and the Kesargarh Trophy. |

The lowest scorer of chapters I–IV pays **Chudail Ka Hisaab**, a forfeit card. Players can always **pass**.

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
