# ScrollStudio — Design system

Estratto dalla GIF di riferimento (800×600, 136 frame a 25 fps, loop 5,44 s).
I colori sono medie di aree: la GIF ha una palette ridotta con dithering, quindi i singoli pixel (e gli "aloni colorati" che si vedono in alcuni frame) non sono affidabili.
Tutti i token sono in [`css/tokens.css`](css/tokens.css).

## Design language

- **Galleria in una stanza.** Le storie sono quadri appesi a una parete grigio chiaro; subito sotto, una scena "habitat" (scrivania, sedia Eames, pianta) ancora la pagina al pavimento.
- **Silenzio cromatico.** Interfaccia quasi monocroma: il colore arriva dalle foto, dal quadrato gradiente "Stories" e dal solo "+" corallo.
- **Testo sottile e piccolo.** Font geometrico, peso light per i titoli, nessun grassetto.
- **Profondità morbida.** Card senza bordo, angoli 4px, ombra larga e diffusa verso il basso.
- **Le immagini escono dal quadro.** Soggetti scontornati possono sbordare dalla card (capelli di Milkbath, ombra del cono di Design).
- **Aprire una storia = entrarci.** La card si dissolve nella parete, il paesaggio si allarga oltre il bordo, compaiono i capitoli (Explorer, Base Camp) e il "+".

## Colori

| Token | Hex | Uso |
|---|---|---|
| `--wall-top` → `--wall-bottom` | `#E9E9E8` → `#D7D6D5` | parete, dall'alto verso il pavimento |
| `--wall-glow` | `#FAFAFA` (85%) | luce sulla parete dietro una storia aperta |
| `--card` | `#FBFBFA` | fondo card |
| `--ink-900` | `#2B2B2D` | titoli |
| `--ink-700` | `#48484B` | testo, nav, autori, footer |
| `--coral` | `#FD767E` | bottone "+" della storia aperta |
| `--brand-gradient` | `#3D55CF → #6A5BE6 → #9A62F6 → #C46BFF` | quadrato "Stories", favicon |

## Tipografia

**Urbanist** (Google Fonts, 300/400) — sostituto libero di Gilroy/Sofia Pro, "a" a un piano come nell'originale.

| Ruolo | Dimensione (px del frame 800) | Peso |
|---|---|---|
| Meta header / nav | 9 | 400 |
| Titolo card | 17 | 300 |
| Autore card | 10.5 | 400 |
| Capitolo grande ("Explorer") | 26 | 300 |
| Capitolo piccolo ("Base Camp") | 16.5 | 300 |
| Titolo sezione ("Stories") | 20 | 300 |

## Unità e layout

- `1u` = 1px del frame 800×600. `1cu` = 1px di una card larga 175 (dentro la card tutto è in `cu`).
- La stanza è ancorata in alto come nella GIF: header `0–68u`, card a `107u` (175×240u, passo 235u), "Servizi" a `455u`, scrivania a `360u`. La scena continua fino al pavimento (`730u`): la stanza intera, scrivania compresa, sta sempre nello schermo senza scroll; sotto c'è solo il footer.

| Formato | Scala | Note |
|---|---|---|
| Desktop e finestre orizzontali | `min(100vw/800, 100svh/730)` | la stanza (730u) entra in altezza; su schermi larghi le card si moltiplicano ai lati |
| Tablet verticale | `min(100vw/620, 100svh/740)` | card più grandi, "Servizi" sopra la scrivania |
| Telefono ≤640px | card `min(58vw, 300px, 33svh − 62px)`, scrivania larga 2 card | header su due righe, poi card, "Servizi", scrivania: tutto nello schermo fino a 320×568 |

## Motion (misurato dalla GIF)

| Movimento | Durata | Curva |
|---|---|---|
| Scorrimento di 1 card, lancio di più card, chiusura storia | 600 ms (chiusura 400 ms) | tabella `GLIDE_CURVE`: partenza quasi lineare, frenata morbida — identica a qualunque distanza |
| Apertura storia | 360 ms | tabella `OPEN_CURVE`: parte veloce |
| Vicini all'apertura | sinistra −160cu, destra +210cu | |
| Fondo card / ombra all'apertura | 200 ms / 480 ms | |
| Capitoli e "+" | entrano dopo 120–220 ms | |

Le tabelle sono in [`js/main.js`](js/main.js) e replicate in CSS come `linear()` (`--ease-glide`, `--ease-open`).

## Interazioni

- Autoplay: un passo verso sinistra ogni 2,4 s. Si ferma su hover, focus, storia aperta, tab nascosta, `prefers-reduced-motion`, o col pulsante pausa (Tab per raggiungerlo).
- Trascina/swipe: sotto metà card torna indietro, oltre avanza; un lancio veloce scorre più card (max 4).
- Rotella orizzontale / trackpad / Shift+rotella → carosello. Rotella verticale → scroll della pagina.
- Click su una card → si porta nel 2° slot (1° su telefono) e si apre. Click di nuovo, Esc o click sulla parete → si chiude.
- Frecce ←/→ con focus nel carosello.

## Lingue (IT / EN)

- Italiano di default. Lo switch in alto a destra (bandiera + sigla; su telefono nella prima riga) passa all'inglese e la scelta resta in `localStorage` (`scrollstudio-lang`).
- I testi italiani sono scritti nell'HTML; l'inglese sta accanto, sullo stesso elemento: `data-en="…"` per il testo, `data-en-aria-label`, `data-en-aria-roledescription`, `data-en-content` per gli attributi.
- Testo nuovo da tradurre = elemento con solo testo dentro (niente icone: avvolgi il testo in uno `<span>`) + `data-en`.
- La data in alto segue la lingua ("Venerdì, 10 ago" / "Friday, 10 aug"); le etichette del pulsante pausa sono in `TOGGLE_LABELS` in [`js/main.js`](js/main.js).
- Lingua attiva: inchiostro `--ink-900` e bandiera a colori; l'altra: `--ink-700` e bandiera in grigio al 50%.

## Progetti (card video)

Il carosello mostra i progetti: Bouncical e TopFratmRanks. Ogni card è `class="story story--video"` con un `<video class="story__image">` al posto dell'immagine: riempie la card (`object-fit: cover`), testo chiaro e sfumatura scura in alto per il titolo.

| File | Uso | Formato |
|---|---|---|
| `assets/projects/<progetto>.mp4` | video della card, in loop e muto | H.264 verticale 9:16, senza audio, `+faststart`, ≤720px di larghezza |
| `assets/projects/<progetto>.jpg` | poster: primo frame, mostrato prima del play e con `prefers-reduced-motion` | JPG alla stessa risoluzione |
| `assets/projects/<progetto>-logo.svg` | logo nell'avatar in basso a sinistra (cerchio di 26cu, anello chiaro sul video) | SVG quadrato 128, contenuto entro il cerchio inscritto, niente scritte |

Loghi: `bouncical-logo.svg` è il marchio di `logo.png` del repo ridisegnato per l'avatar (senza scritta, linee e palline più spesse); `topfratmranks-logo.svg` è un podio tricolore con corona, provvisorio finché il progetto non ha un logo suo.

- `preload="none"`: [`js/main.js`](js/main.js) avvia solo i video visibili (anche le copie del loop) e mette in pausa gli altri.
- Aperta la card: "Provalo" → sito live, "Codice" → repo GitHub, il bottone corallo (↗) apre il sito.
- Per aggiungere un progetto: copia una `<li class="carousel__slide">` di un progetto e cambia video, poster, testi (italiano e `data-en`) e link.

Ricodifica dal video sorgente:

```sh
ffmpeg -i sorgente.mp4 -vf "scale=720:-2,fps=30" -c:v libx264 -preset slow -crf 27 -pix_fmt yuv420p -an -movflags +faststart assets/projects/nome.mp4
ffmpeg -i assets/projects/nome.mp4 -frames:v 1 -q:v 4 assets/projects/nome.jpg
```

## Card con immagine (placeholder)

Non più usate in `index.html`, ora occupato dai progetti. I file restano come riferimento per card con immagine, panorama o parti che escono dal quadro (le quattro storie di esempio sono nel primo commit).

| File | Uso | Formato consigliato |
|---|---|---|
| `assets/placeholders/story-01.svg`, `story-02.svg`, `story-04.svg` | immagine card (riempie la card) | JPG/WebP 700×960, zona alta chiara per il titolo |
| `assets/placeholders/story-03-pano.svg` | panorama di Apogee: la card ne mostra il centro, aprendo si vede tutto | PNG trasparente 880×400; box `--l:-80; --t:33; --w:440` (cu) |
| `assets/placeholders/pop-01-shadow.svg`, `pop-04-hair.svg` | parti che escono dalla card | PNG trasparente; posizione con `--l --t --w` |
| `assets/placeholders/avatar-0X.svg` | avatar autori | 128×128 |
| `assets/scene/desk-scene.svg` | scena scrivania | facoltativo: PNG trasparente 1380×1080 |

Per una card con panorama usa `class="story story--pano"` e `<img class="story__pano">` (vedi Apogee nel primo commit). Capitoli: ogni `<a class="point">` ha la posizione in cu (`--x --y`, e `--xs --ys` per il telefono).

`assets/extracted/` contiene ritagli dello screenshot originale solo come riferimento (bassa risoluzione, con dithering).
