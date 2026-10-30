# 🪔 HAVELI KI DULHAN — *a Nightfall story*

A story-mode **Indian horror party game** for a bachelor party.
- **The story:** a Punjabi groom's bachelor gang breaks down outside a haunted Rajasthani haveli, where Rajkumari Chandravati, the **Chudail Dulhan**, has been waiting for a dulha since 1925.
- **How it plays:** the haveli appears on the TV, and every guest's phone is their controller, like BombSquad Remote. Guests just open a link or scan a QR code.
- **Players:** 3–16 players (best with 6–12), split into 2–4 teams: Team Kaali Billi, Team Ullu, Team Naag and Team Chamgadad.
- **Length:** about 90 minutes (Full) or 60 minutes (Short), chosen by the host.
- **Voice:** a scary ElevenLabs cast: a deep, heavy-bass narrator and Chandravati's whispering ghost voice.
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

### Voice-over (ElevenLabs)
- The game ships with **recorded ElevenLabs voices**: *Brian* is the narrator (with extra bass and a hall echo added), *Lily* is Chandravati (slowed, drenched in reverb, with a whisper double) and *Sarah* is the bride on the phone. Nothing to set up.
- **Live names (optional):** in Render → your service → **Environment**, add `ELEVENLABS_API_KEY` with your ElevenLabs key. The lines that mention the groom and bride are then spoken live with their real names (about 12 lines, roughly 1,500 characters per night). Without a key, those lines say "dulhe raja" and "dulhan" instead.
- **Other voices (optional):** set `VO_NARRATOR`, `VO_GHOST` or `VO_BRIDE` to any ElevenLabs voice id.
- **Host:** ♛ → Voice: *Cinematic* (ElevenLabs), *Laptop voice*, or *Captions only*.

### Character art (Google Flow, optional)
- **[ART_PROMPTS.md](ART_PROMPTS.md)** has a prompt for every character and chapter card: Rani Chandravati, the jump scare, Kunwar Vikram, the murda baraat, the three dulhans, the haveli, and each chapter.
- **Make them:** generate the images in **Google Flow**, name them as listed, and put them in a Google Drive folder called **Haveli Art**.
- **Import them:** run `node tools/art-import.mjs <folder>`, or ask Claude to import them. They then appear behind the story with a slow pan, on the chapter cards, in the jump scare and in the boss reveal.
- **Fallback:** any image that's missing falls back to the game's own painted scenes.

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
- The host taps **Raat set up karo** and chooses:
  - the dulha and the bride's name
  - Mild or Spicy
  - Voice: Cinematic, Laptop voice, or Captions only
  - Night length: Full or Short

  They can also fill in "How well do they know the groom?" (optional).
- Then the host taps **Begin the Night**.

## The night

| | Chapter | Games |
|---|---|---|
| ✦ | **Shaadi Ka Card** | Sign the haveli ka register with a selfie. The diyas pick your team. |
| I | **Haveli Ka Darwaza** | **Tantrik Rangoli**: a team communication puzzle where the clues are on other people's phones. |
| II | **Pothi Khana** | **Forbidden Quiz**: groom questions, shaadi trivia, Bollywood horror and "Kaun hai jo…?" votes. |
| III | **Zenana Ka Jhoola** | **Trials of Nerve**: Diya Pakdo, Payal Ki Taal, Nimbu-Mirchi Bhagao, Pairon Ko Mat Dekho and Shaadi Album. |
| IV | **Sangeet Ki Daawat** | **The Possessed** (a secret traitor), **Sangeet Roast** (with host veto), **Zehreeli Thandai** (a team logic puzzle) and the **Unmasking**. |
| V | **Solah Shringar Ki Khoj** | **Split-screen treasure hunt.** The TV splits into one pane per team. Each team roams the haveli following riddles on their phones and a mini-map hint that sharpens over time; every station asks a shaadi question. Chandravati's shadows freeze you, so raise your diya. Found adornments become power-ups in the next chapter. |
| VI | **Murda Baraat** | **Zombie baraat.** Phones become twin-stick gamepads: move with the left thumb, aim with the right, guns never stop firing, plus dash and nimbu-mirchi bombs. Fight baraatis, Naagin dancers, Gossip Aunties and swelling Fufajis, then the boss **Kunwar Vikram, the Bhoot Dulha**. A **Baraat Break** shaadi question mid-fight hands out powers. |
| VII | **Aadhi Raat Ka Mandap** | **Tijori Ka Taala** (the clues collected all night), the **Phere Quiz** (7 rapid shaadi questions), **Teen Dulhanein** (white whispers are true, red ones lie), then the **Saat Vachan of the Bachelors**. |
| ☀ | **Vidaai at Sunrise** | Credits starring everyone's faces, awards, and the Kesargarh Trophy. |

The lowest scorer of chapters I–IV pays **Chudail Ka Hisaab**, a forfeit card. Players can always **pass**.

**Phone controls in the action chapters:**
- **Landscape:** turn the phone sideways for a real controller grip. The screen stays awake and goes full-screen (on Android).
- **Treasure hunt:**
  - left thumb moves
  - 🪔 hold to raise your diya
  - the riddle and a garam/thanda meter are on screen
- **Zombie baraat:**
  - left thumb moves
  - right thumb aims (guns always fire)
  - 💨 dash, 🍋 bomb, ✦ power

**No lag:** stick input goes straight to the server 30 times a second on its own channel. The TV gets compact binary snapshots and smooths them out, so a late packet never shows as a stutter.

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
node test/e2e/arena-check.mjs --chapter hunt --players 12
```
Real-speed bots in the hunt or the arena, with frame times and server tick stats.

```bash
node test/e2e/phone-check.mjs
```
Screenshots of the phone controllers.

```bash
npm run e2e
```
Real Chromium: a TV plus phones play the entire night and the run fails on any console error. Needs Playwright.

```bash
node test/e2e/showcase.mjs
```
Real-speed screenshots of every environment.

- **Engine:** `server/engine/`. A server-authoritative state machine, with one step module per game in `steps/`, the zombie simulation in `arena/sim.js` and the treasure hunt in `hunt/sim.js`. The haveli floor plan in `public/shared/haveli-map.js` is shared by the server and the TV.
- **Real-time:**
  - `public/shared/rtcodec.js` (binary snapshots)
  - `public/tv/rtclient.js` (interpolation buffer)
  - `public/play/pad.js` (multitouch twin-stick gamepad)
  - The server runs a drift-corrected 30 Hz loop. `GET /stats` shows tick timings, and `/tv?debug` shows FPS and snapshot jitter.
- **Sprites:** `public/tv/sprites.js`. Chibi baraatis with selfie faces and safas, and animated zombies, all pre-rendered once.
- **Voice-over:**
  - `public/vo/` holds the clips and a manifest.
  - `tools/vo-build.mjs` and `tools/vo-align.py` are the recording pipeline.
  - `server/tts.js` serves the optional live voice.
- **Content:** `server/content/`. Narration, quiz, roasts and forfeits, with mild and spicy versions. Edit freely.
- **TV:** `public/tv/`. Procedural environments, the narrator, the arena renderer and the screens.
- **Phones:** `public/play/`.
- **Sound:**
  - `public/shared/audio.js` synthesises the ambience and effects live: tanpura, shehnai, ghungroo, dhol and convolution reverb.
  - `public/shared/music.js` holds the adaptive score (tabla, santoor and sarangi in a taal) and plays the recorded **Haveli theme** (`public/audio/theme.mp3`).
- **Open-source libraries used** (all MIT/ISC, all served locally so the game works offline):
  - [nipplejs](https://github.com/yoannmoinet/nipplejs): the thumbstick.
  - [ZzFX](https://github.com/KilledByAPixel/ZzFX): weapon sounds.
  - [simplex-noise](https://github.com/jwagner/simplex-noise.js): fog and grass.
  - [canvas-confetti](https://github.com/catdad/canvas-confetti): petals.
  - Socket.IO, Express and node-qrcode.
