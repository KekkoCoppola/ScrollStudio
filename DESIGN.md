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
- La stanza è ancorata in alto come nella GIF: header `0–68u`, card a `107u` (175×240u, passo 235u), "Stories" a `455u`, scrivania a `360u`. La scena continua fino al pavimento (`730u`), poi il footer: la pagina scorre.

| Formato | Scala | Note |
|---|---|---|
| Desktop orizzontale ≥1024px | `max(min(100vw/800, 100svh/600), 100vw/1000)` | la prima schermata è il frame della GIF |
| Finestre/tablet <1024px orizzontali | `100vw/800` | inquadratura identica alla GIF (4ª card che sbuca) |
| Tablet verticale | `min(100vw/620, 100svh/740)` | card più grandi, "Stories" sopra la scrivania |
| Telefono ≤640px | card `min(58vw, 300px)` | header su due righe, poi card, "Stories", scrivania |

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

## Sostituire i placeholder

| File | Uso | Formato consigliato |
|---|---|---|
| `assets/placeholders/story-01.svg`, `story-02.svg`, `story-04.svg` | immagine card (riempie la card) | JPG/WebP 700×960, zona alta chiara per il titolo |
| `assets/placeholders/story-03-pano.svg` | panorama di Apogee: la card ne mostra il centro, aprendo si vede tutto | PNG trasparente 880×400; box `--l:-80; --t:33; --w:440` (cu) |
| `assets/placeholders/pop-01-shadow.svg`, `pop-04-hair.svg` | parti che escono dalla card | PNG trasparente; posizione con `--l --t --w` |
| `assets/placeholders/avatar-0X.svg` | avatar autori | 128×128 |
| `assets/scene/desk-scene.svg` | scena scrivania | facoltativo: PNG trasparente 1380×1080 |

Per una card con panorama usa `class="story story--pano"` e `<img class="story__pano">` (vedi Apogee in [`index.html`](index.html)). Capitoli: ogni `<a class="point">` ha la posizione in cu (`--x --y`, e `--xs --ys` per il telefono).

`assets/extracted/` contiene ritagli dello screenshot originale solo come riferimento (bassa risoluzione, con dithering).
