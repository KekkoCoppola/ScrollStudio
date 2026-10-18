(() => {
  'use strict';

  // Language: the page is written in Italian; English sits next to each text in data-en
  // (and data-en-<attribute> for attributes). The first switch keeps the Italian in data-it.
  const LANG_KEY = 'scrollstudio-lang';
  const TRANSLATED_ATTRS = ['aria-label', 'aria-roledescription', 'content'];
  let lang = 'it';

  function setLanguage(next) {
    lang = next === 'en' ? 'en' : 'it';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-en]').forEach((el) => {
      if (el.dataset.it === undefined) el.dataset.it = el.textContent;
      el.textContent = el.dataset[lang];
    });
    TRANSLATED_ATTRS.forEach((attr) => {
      document.querySelectorAll(`[data-en-${attr}]`).forEach((el) => {
        if (!el.hasAttribute(`data-it-${attr}`)) el.setAttribute(`data-it-${attr}`, el.getAttribute(attr));
        el.setAttribute(attr, el.getAttribute(`data-${lang}-${attr}`));
      });
    });
    document.querySelectorAll('[data-lang]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === lang));
    });
  }

  document.querySelectorAll('[data-lang]').forEach((button) => {
    button.addEventListener('click', () => {
      setLanguage(button.dataset.lang);
      try {
        localStorage.setItem(LANG_KEY, lang);
      } catch {
        // storage blocked: the choice lasts until the page is closed
      }
    });
  });

  let savedLang = null;
  try {
    savedLang = localStorage.getItem(LANG_KEY);
  } catch {
    // storage blocked: Italian
  }
  setLanguage(savedLang);

  const root = document.querySelector('[data-carousel]');
  if (!root) return;

  const track = root.querySelector('[data-carousel-track]');
  const glow = root.querySelector('[data-carousel-glow]');
  const toggle = root.querySelector('[data-carousel-toggle]');
  const originals = Array.from(track.querySelectorAll('.carousel__slide'));
  if (!originals.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const phone = window.matchMedia('(max-width: 640px)');

  // Motion measured frame by frame from the reference GIF (25 fps).
  // Slides, flings and closing share one 600 ms curve, whatever the distance travelled.
  const GLIDE_CURVE = [0, 0.077, 0.166, 0.255, 0.345, 0.43, 0.514, 0.6, 0.677, 0.749, 0.813, 0.872, 0.923, 0.962, 0.991, 1];
  const GLIDE_MS = 600;
  const CLOSE_MS = 400;
  const DWELL_MS = 2400; // rest between automatic steps
  const TOGGLE_LABELS = {
    pause: { it: 'Metti in pausa i progetti', en: 'Pause projects' },
    play: { it: 'Riproduci i progetti', en: 'Play projects' },
  };
  const PUSH_LEFT = 160; // card units the neighbours move aside (and fade out) when a story opens
  const PUSH_RIGHT = 210;
  // An opened card is centred together with its "Provalo" block: the pair spans 0–410 card units.
  const OPEN_GROUP_CENTER = 205;
  const FLING_PROJECTION = 520; // ms; matches the starting speed of the glide curve

  const fromTable = (table) => (p) => {
    const x = Math.min(1, Math.max(0, p)) * (table.length - 1);
    const i = Math.floor(x);
    return i >= table.length - 1 ? 1 : table[i] + (table[i + 1] - table[i]) * (x - i);
  };
  const glideEase = fromTable(GLIDE_CURVE);
  const mod = (n, m) => ((n % m) + m) % m;
  const motionMs = (ms) => (reduceMotion.matches ? 0 : ms);

  let slides = originals;
  let cardW = 0;
  let pitch = 0;
  let startX = 0;
  let loopLen = 0;

  let offset = 0; // px travelled; grows as the strip moves right → left
  let spread = 0; // 0 = closed, 1 = a story is open and its neighbours have moved aside
  let openSlide = null;
  let isOpen = false;
  let rafId = 0;
  let autoplayTimer = 0;
  const tweens = new Map();

  const pause = { hover: false, focus: false, drag: false, user: false, hidden: false };
  const drag = { active: false, id: null, x0: 0, offset0: 0, moved: false, suppressClick: false, samples: [] };

  root.classList.add('is-enhanced');

  // Layout

  function buildClones(sets) {
    track.querySelectorAll('[data-clone]').forEach((node) => node.remove());
    projects.forEach((project) => { project.mirrors = []; });
    const clones = [];
    for (let s = 1; s < sets; s += 1) {
      originals.forEach((slide) => {
        const clone = slide.cloneNode(true);
        clone.dataset.clone = '';
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('a, button').forEach((el) => { el.tabIndex = -1; });
        if (projects.has(slide)) mirror(clone, projects.get(slide));
        clones.push(clone);
      });
    }
    track.append(...clones);
    slides = [...originals, ...clones];
  }

  function measure() {
    const style = getComputedStyle(track);
    cardW = originals[0].offsetWidth;
    pitch = cardW + parseFloat(style.columnGap || '0');
    startX = parseFloat(style.paddingLeft || '0');
    // Enough cards to cover the viewport plus one hidden card on each side.
    const needed = Math.ceil((track.clientWidth + 2 * pitch) / pitch);
    buildClones(Math.max(1, Math.ceil(needed / originals.length)));
    loopLen = slides.length * pitch;
  }

  const slotX = (i) => startX + mod(i * pitch - offset + pitch, loopLen) - pitch;

  // Where an opened card settles: centred with its "Provalo" block; on phones, the first slot.
  const openTargetX = () => (phone.matches ? startX : track.clientWidth / 2 - OPEN_GROUP_CENTER * (cardW / 175));

  function render() {
    if (!loopLen) return; // not laid out yet
    const cu = cardW / 175;
    const openSlot = openSlide ? slotX(slides.indexOf(openSlide)) : 0;
    const openX = openSlot + (openTargetX() - openSlot) * spread;
    const fade = Math.max(0, 1 - spread * 1.5); // the others are gone before the card arrives
    for (let i = 0; i < slides.length; i += 1) {
      const slide = slides[i];
      let x = slotX(i);
      const other = openSlide && slide !== openSlide && spread > 0;
      if (slide === openSlide) x = openX;
      else if (other) x += (x < openSlot ? -PUSH_LEFT : PUSH_RIGHT) * cu * spread;
      slide.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      slide.style.opacity = other ? fade.toFixed(3) : '';
      slide.style.visibility = other && fade === 0 ? 'hidden' : '';
      slide.style.pointerEvents = other ? 'none' : '';
    }
    if (glow) {
      glow.style.opacity = spread.toFixed(3);
      glow.style.transform = `translate3d(${(openX + cardW / 2).toFixed(2)}px, 0, 0)`;
    }
  }

  // Tweens

  function setValue(key, value) {
    if (key === 'offset') offset = value;
    else spread = value;
  }

  function normalize() {
    offset = mod(offset, loopLen);
  }

  function requestFrame() {
    if (!rafId) rafId = requestAnimationFrame(frame);
  }

  function animate(key, to, ms, ease, done) {
    const from = key === 'offset' ? offset : spread;
    if (ms <= 0 || from === to) {
      tweens.delete(key);
      setValue(key, to);
      if (key === 'offset') normalize();
      render();
      if (done) done();
      return;
    }
    tweens.set(key, { from, to, t0: performance.now(), ms, ease, done });
    requestFrame();
  }

  function frame(now) {
    rafId = 0;
    const finished = [];
    tweens.forEach((tw, key) => {
      const p = (now - tw.t0) / tw.ms;
      setValue(key, tw.from + (tw.to - tw.from) * tw.ease(p));
      if (p >= 1) finished.push([key, tw]);
    });
    finished.forEach(([key, tw]) => {
      if (tweens.get(key) === tw) tweens.delete(key);
      if (key === 'offset') normalize();
    });
    render();
    finished.forEach(([, tw]) => { if (tw.done) tw.done(); });
    if (tweens.size) requestFrame();
  }

  const targetOffset = () => (tweens.has('offset') ? tweens.get('offset').to : offset);

  // Moves

  function step(dir) {
    if (openSlide) closeStory(() => {});
    animate('offset', (Math.round(targetOffset() / pitch) + dir) * pitch, motionMs(GLIDE_MS), glideEase, scheduleAutoplay);
  }

  function openStory(slide) {
    clearTimeout(autoplayTimer);
    if (openSlide && openSlide !== slide) {
      closeStory(() => openStory(slide));
      return;
    }
    // The strip stops where it is; only the chosen card travels to the centre (see render).
    tweens.delete('offset');
    openSlide = slide;
    isOpen = true;
    slide.classList.add('is-open');
    animate('spread', 1, motionMs(GLIDE_MS), glideEase);
  }

  function closeStory(done) {
    if (!openSlide) {
      if (done) done();
      return;
    }
    const slide = openSlide;
    isOpen = false;
    slide.classList.remove('is-open');
    animate('spread', 0, motionMs(CLOSE_MS), glideEase, () => {
      if (!isOpen && openSlide === slide) openSlide = null;
      render();
      if (done) {
        done();
        return;
      }
      // A story opened mid-glide leaves the strip between two slots: settle it.
      const rest = Math.round(offset / pitch) * pitch;
      if (Math.abs(rest - offset) > 0.5) animate('offset', rest, motionMs(GLIDE_MS), glideEase, scheduleAutoplay);
      else scheduleAutoplay();
    });
  }

  // Autoplay

  function isPaused() {
    return reduceMotion.matches || openSlide !== null || Object.values(pause).some(Boolean);
  }

  function scheduleAutoplay() {
    clearTimeout(autoplayTimer);
    if (!loopLen || tweens.has('offset') || isPaused()) return;
    autoplayTimer = setTimeout(() => step(1), DWELL_MS);
  }

  function setPause(key, value) {
    pause[key] = value;
    scheduleAutoplay();
  }

  // Project videos: each project downloads and decodes one <video>, in its original card; the cards
  // cloned for the loop get a <canvas> that copies its frames. A video plays once the page has
  // loaded, only while one of its cards is on screen, and never with reduced motion.

  const MIRROR_FRAME_MS = 1000 / 30; // the videos are 30 fps
  const projects = new Map(); // original slide → { video, focus, mirrors, visible, drawnAt }
  originals.forEach((slide) => {
    const video = slide.querySelector('video');
    if (!video) return;
    const focus = getComputedStyle(video).objectPosition.split(' ').map((v) => parseFloat(v) / 100);
    projects.set(slide, { video, focus, mirrors: [], visible: new Set(), drawnAt: 0 });
  });
  const surfaceOwner = new Map(); // video or canvas → its project
  let pageLoaded = document.readyState === 'complete';
  let mirrorId = 0;

  function mirror(clone, project) {
    const video = clone.querySelector('video');
    const canvas = document.createElement('canvas');
    canvas.className = video.className;
    canvas.setAttribute('aria-hidden', 'true');
    // the poster shows until the first frame is copied
    canvas.style.background = `url("${project.video.poster}") ${project.focus[0] * 100}% ${project.focus[1] * 100}% / cover`;
    video.replaceWith(canvas);
    project.mirrors.push(canvas);
  }

  function sizeMirrors() {
    const w = Math.round(cardW * Math.min(window.devicePixelRatio || 1, 2));
    const h = Math.round((w * 240) / 175);
    projects.forEach((project) => {
      project.drawnAt = 0;
      project.mirrors.forEach((canvas) => {
        canvas.width = w;
        canvas.height = h;
      });
    });
  }

  // Same crop as object-fit: cover with the video's object-position.
  function paint(canvas, { video, focus }) {
    const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
    const sw = canvas.width / scale;
    const sh = canvas.height / scale;
    const sx = (video.videoWidth - sw) * focus[0];
    const sy = (video.videoHeight - sh) * focus[1];
    canvas.getContext('2d').drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }

  function drawMirrors(now) {
    mirrorId = 0;
    let playing = false;
    projects.forEach((project) => {
      if (project.video.paused) return;
      playing = true;
      if (project.video.readyState < 2 || now - project.drawnAt < MIRROR_FRAME_MS - 2) return;
      project.drawnAt = now;
      project.mirrors.forEach((canvas) => {
        if (project.visible.has(canvas)) paint(canvas, project);
      });
    });
    if (playing) mirrorId = requestAnimationFrame(drawMirrors);
  }

  function updatePlayback(project) {
    const { video } = project;
    if (pageLoaded && project.visible.size && !reduceMotion.matches) {
      video.play().catch(() => {}); // playback refused: the posters stay
      if (!mirrorId) mirrorId = requestAnimationFrame(drawMirrors);
    } else if (!video.paused) {
      video.pause(); // pausing an idle video would start loading it
    }
  }

  const videoObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      const changed = new Set();
      entries.forEach(({ target, isIntersecting }) => {
        const project = surfaceOwner.get(target);
        if (!project) return;
        if (isIntersecting) project.visible.add(target);
        else project.visible.delete(target);
        changed.add(project);
      });
      changed.forEach(updatePlayback);
    })
    : null;

  function watchVideos() {
    surfaceOwner.clear();
    projects.forEach((project) => {
      project.visible.clear();
      [project.video, ...project.mirrors].forEach((surface) => surfaceOwner.set(surface, project));
    });
    sizeMirrors();
    if (!videoObserver) {
      surfaceOwner.forEach((project, surface) => project.visible.add(surface));
      projects.forEach(updatePlayback);
      return;
    }
    // Observing again reports every surface's current visibility straight away.
    videoObserver.disconnect();
    surfaceOwner.forEach((project, surface) => videoObserver.observe(surface));
  }

  // Videos wait for the page itself: fonts, posters and logos come first.
  if (!pageLoaded) {
    window.addEventListener('load', () => {
      pageLoaded = true;
      projects.forEach(updatePlayback);
    }, { once: true });
  }

  // Drag, swipe and fling

  track.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || drag.active) return;
    if (e.target.closest('.story__detail a')) return;
    drag.active = true;
    drag.id = e.pointerId;
    drag.x0 = e.clientX;
    drag.moved = false;
    drag.samples = [[e.timeStamp, e.clientX]];
  });

  track.addEventListener('pointermove', (e) => {
    if (!drag.active || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x0;
    if (!drag.moved) {
      if (Math.abs(dx) < 6) return;
      // Capture only once it is a real drag, so plain clicks still open the story.
      drag.moved = true;
      tweens.delete('offset');
      drag.offset0 = offset + dx;
      try {
        track.setPointerCapture(e.pointerId);
      } catch {
        // pointer already released; the drag still works without capture
      }
      root.classList.add('is-dragging');
      setPause('drag', true);
      if (openSlide) closeStory(() => {});
    }
    offset = drag.offset0 - dx;
    drag.samples.push([e.timeStamp, e.clientX]);
    while (drag.samples.length > 2 && e.timeStamp - drag.samples[0][0] > 100) drag.samples.shift();
    render();
  });

  function endDrag(e) {
    if (!drag.active || e.pointerId !== drag.id) return;
    drag.active = false;
    if (!drag.moved) return;
    drag.suppressClick = true;
    root.classList.remove('is-dragging');
    const [t0, x0] = drag.samples[0];
    const [t1, x1] = drag.samples[drag.samples.length - 1];
    const resting = e.timeStamp - t1 > 80; // finger held still before release: no fling
    const velocity = t1 > t0 && !resting ? -(x1 - x0) / (t1 - t0) : 0; // offset px per ms
    const reach = 4 * pitch;
    const projected = offset + Math.max(-reach, Math.min(reach, velocity * FLING_PROJECTION));
    animate('offset', Math.round(projected / pitch) * pitch, motionMs(GLIDE_MS), glideEase, scheduleAutoplay);
    setPause('drag', false);
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('dragstart', (e) => e.preventDefault());

  // Click a card to open it; click it again, press Esc or click the wall to close.
  track.addEventListener('click', (e) => {
    if (drag.suppressClick) {
      drag.suppressClick = false;
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const story = e.target.closest('.story');
    if (!story) return;
    e.preventDefault();
    const slide = story.closest('.carousel__slide');
    if (slide === openSlide && isOpen) closeStory();
    else openStory(slide);
  }, true);

  document.addEventListener('click', (e) => {
    if (!isOpen || e.target.closest('.carousel__slide.is-open, .story')) return;
    closeStory();
  });

  // Horizontal wheel / trackpad moves the stories; vertical wheel scrolls the page.
  let wheelAcc = 0;
  let wheelLockUntil = 0;
  root.addEventListener('wheel', (e) => {
    const horizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = horizontal ? e.deltaX : (e.shiftKey ? e.deltaY : 0);
    if (!delta) return;
    e.preventDefault();
    const now = performance.now();
    if (now < wheelLockUntil) return;
    wheelAcc += delta;
    if (Math.abs(wheelAcc) >= 30) {
      step(Math.sign(wheelAcc));
      wheelAcc = 0;
      wheelLockUntil = now + GLIDE_MS;
    }
  }, { passive: false });

  // Keyboard
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'Escape' && isOpen) closeStory();
    else return;
    e.preventDefault();
  });

  // Focus: pause, and bring a focused card that sits off-screen into the first slot.
  root.addEventListener('focusin', (e) => {
    setPause('focus', true);
    const slide = e.target.closest('.carousel__slide');
    if (!slide || slide === openSlide) return;
    const i = slides.indexOf(slide);
    const rect = slide.getBoundingClientRect();
    const box = track.getBoundingClientRect();
    if (i < 0 || (rect.left >= box.left && rect.right <= box.right)) return;
    if (openSlide) closeStory(() => {});
    const k = Math.round((targetOffset() - i * pitch) / loopLen);
    animate('offset', i * pitch + k * loopLen, motionMs(GLIDE_MS), glideEase, scheduleAutoplay);
  });

  root.addEventListener('focusout', (e) => {
    if (!root.contains(e.relatedTarget)) setPause('focus', false);
  });

  // Focusing a card can make the browser scroll the clipped track; keep it pinned.
  track.addEventListener('scroll', () => {
    track.scrollLeft = 0;
  });

  track.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'mouse') setPause('hover', true);
  });
  track.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse') setPause('hover', false);
  });

  document.addEventListener('visibilitychange', () => setPause('hidden', document.hidden));
  reduceMotion.addEventListener('change', scheduleAutoplay);
  reduceMotion.addEventListener('change', watchVideos);

  if (toggle) {
    toggle.addEventListener('click', () => {
      const paused = !pause.user;
      toggle.setAttribute('aria-pressed', String(paused));
      const label = TOGGLE_LABELS[paused ? 'play' : 'pause'];
      toggle.dataset.it = label.it;
      toggle.dataset.en = label.en;
      toggle.textContent = label[lang];
      setPause('user', paused);
    });
  }

  // Init + resize: keep the same card in the first slot, close any open story.
  let lastWidth = -1;
  function relayout() {
    // No size yet (hidden frame, 0×0 viewport): zero-width cards would need endless clones. Wait for a resize.
    if (!originals[0].offsetWidth || track.clientWidth === lastWidth) return;
    lastWidth = track.clientWidth;
    const index = pitch ? Math.round(targetOffset() / pitch) : 0;
    tweens.clear();
    if (openSlide) openSlide.classList.remove('is-open');
    openSlide = null;
    isOpen = false;
    spread = 0;
    measure();
    offset = mod(index * pitch, loopLen);
    render();
    watchVideos();
    scheduleAutoplay();
  }

  relayout();
  new ResizeObserver(relayout).observe(track);
})();
