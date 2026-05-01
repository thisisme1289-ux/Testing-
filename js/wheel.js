/* ═══════════════════════════════════════
   CONVEYOR BELT WHEEL ENGINE — v3 CLEAN

   GEOMETRY:
   - Rotor center = bottom-center of .whl-wrap
   - Active slot = slot at index activeIdx, always at angle 270° (12 o'clock)
   - arcStart + activeIdx*arcStep = 270  →  arcStart = 270 - activeIdx*arcStep
   - Spotlight positioned exactly over the active node: same center X/Y

   SMALL-N FIX:
   - For N ≥ 5: totalArc = 180°, edge nodes marked partial (original behaviour)
   - For N = 4: totalArc = 130° → all 4 nodes stay in the visible top half
   - For N = 3: totalArc = 110°
   - For N = 2: totalArc =  80°
   - Edge nodes are NOT marked partial when totalArc < 180°
     (they're fully visible so no reason to hide them)

   ANIMATION:
   - Easing: cubic-bezier(0.16,1,0.3,1) — expo-out, friction stop, no bounce
   - Duration: 700 ms
   - Card crossfade: content fades out, swaps at mid-spin, fades back in
═══════════════════════════════════════ */

const WHL_DURATION = 700;
const WHL_EASE     = 'cubic-bezier(0.16,1,0.3,1)';
const WHL_FADE_MS  = 350;   /* ms into spin when card data swaps */

function wheelSizes() {
  const W = window.innerWidth;
  if (W < 480) return { R:190, ns:92,  SLOTS:5 };
  if (W < 768) return { R:255, ns:114, SLOTS:7 };
  return              { R:335, ns:138, SLOTS:7 };
}

/* Returns arc width and whether edge nodes should be hidden.
   Goal: all nodes must have sin(angle) < 0 (above rotor equator → visible).
   Active node is always at 270° (sin = -1, maximum top).
   Edge node angle = 270° ± (SLOTS-1)/2 * arcStep.
   We want sin(edge angle) ≤ 0  →  edge angle ∈ [180°, 360°].
   A comfortable margin puts the outermost node at ~210° or ~330° max. */
function arcConfig(SLOTS) {
  if (SLOTS <= 2) return { totalArc:  80, partial: false };
  if (SLOTS <= 3) return { totalArc: 110, partial: false };
  if (SLOTS <= 4) return { totalArc: 130, partial: false };
  return              { totalArc: 180, partial: true  };
}

function buildWheel(host, dishes, catLabel, accentColor, uid) {
  const N = dishes.length;
  if (!N) return;

  const { R, ns, SLOTS: rawSlots } = wheelSizes();
  const SLOTS     = Math.min(rawSlots, N);
  const nr        = ns / 2;
  const activeIdx = Math.floor(SLOTS / 2);

  const { totalArc, partial: usePartial } = arcConfig(SLOTS);
  const arcStep  = SLOTS > 1 ? totalArc / (SLOTS - 1) : 0;
  const arcStart = 270 - activeIdx * arcStep;   /* centres arc at 270° */

  const topPad   = 58;
  const wrapH    = topPad + R + nr;
  const spotSize = ns;
  const spotTop  = topPad;

  let activeDish = 0;
  let spinning   = false;

  /* ── DOM ── */
  host.innerHTML = `
    <div class="whl-wrap" id="${uid}_wrap"
         style="height:${wrapH}px;overflow:hidden;position:relative;">
      <div class="whl-table" style="
        width:${(R+nr)*2+80}px;height:${(R+nr)*2+80}px;
        position:absolute;left:50%;bottom:0;transform:translateX(-50%);
      "></div>
      <div class="whl-spotlight" style="
        width:${spotSize}px;height:${spotSize}px;position:absolute;
        left:50%;top:${spotTop}px;transform:translateX(-50%);
        z-index:15;pointer-events:none;
      "></div>
      <div class="whl-rotor" id="${uid}_rotor" style="
        width:${R*2}px;height:${R*2}px;position:absolute;
        left:50%;top:${wrapH-R}px;transform:translateX(-50%);
      "></div>
    </div>
    <div class="whl-bottom">
      <button class="whl-arr whl-arr-left" onclick="${uid}_rotate(-1)">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="whl-card-wrap">
        <div class="whl-card empty" id="${uid}_card" onclick="${uid}_doAdd()">
          <div class="whl-card-inner" id="${uid}_ci">
            <div class="whl-card-thumb" id="${uid}_cthumb">
              <img id="${uid}_cimg" src="" alt="" loading="lazy">
            </div>
            <div class="whl-card-cat"   id="${uid}_ccat"></div>
            <div class="whl-card-name"  id="${uid}_cname"></div>
            <div class="whl-card-price" id="${uid}_cprice"></div>
            <button class="whl-add-btn"
                    onclick="event.stopPropagation();${uid}_doAdd()">
              <svg viewBox="0 0 24 24">
                <line x1="12" y1="5"  x2="12" y2="19"/>
                <line x1="5"  y1="12" x2="19" y2="12"/>
              </svg>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
      <button class="whl-arr whl-arr-right" onclick="${uid}_rotate(1)">
        <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <div class="whl-arrows-mobile">
        <button class="whl-arr" onclick="${uid}_rotate(-1)">
          <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <button class="whl-arr" onclick="${uid}_rotate(1)">
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>`;

  const rotor = document.getElementById(`${uid}_rotor`);

  /* ── Build nodes ── */
  for (let i = 0; i < SLOTS; i++) {
    const deg = arcStart + i * arcStep;
    const rad = deg * Math.PI / 180;
    const x   = R + R * Math.cos(rad) - nr;
    const y   = R + R * Math.sin(rad) - nr;

    const isActive  = (i === activeIdx);
    /* Only hide edge nodes when the arc is wide enough to push them off-screen */
    const isPartial = usePartial && (i === 0 || i === SLOTS - 1);

    const node = document.createElement('div');
    node.className = 'whl-node'
      + (isActive  ? ' active'  : '')
      + (isPartial ? ' partial' : '');
    node.id = `${uid}_node${i}`;
    node.style.cssText =
      `width:${ns}px;height:${ns}px;left:${x}px;top:${y}px;position:absolute;`
      + (isPartial ? 'pointer-events:none;' : '');
    node.innerHTML = `
      <div class="whl-node-face" id="${uid}_face${i}">
        <img id="${uid}_img${i}" src="" alt="" loading="lazy">
      </div>
      <div class="whl-node-label" id="${uid}_lbl${i}"></div>`;

    if (!isPartial && !isActive) {
      const steps = activeIdx - i;
      node.addEventListener('click', () => doRotate(steps));
    }
    if (isActive) {
      node.addEventListener('click', () => window[`${uid}_doAdd`]());
    }
    rotor.appendChild(node);
  }

  /* ── Image assignment ── */
  function renderImages() {
    for (let i = 0; i < SLOTS; i++) {
      const di   = ((activeDish + (activeIdx - i)) % N + N) % N;
      const dish = dishes[di];
      const img  = document.getElementById(`${uid}_img${i}`);
      const lbl  = document.getElementById(`${uid}_lbl${i}`);
      if (img) { img.src = getImg(dish.name); img.alt = dish.name; }
      if (lbl)   lbl.textContent = dish.name.split(' ').slice(0, 3).join(' ');
    }
  }

  /* ── Initial silent render ── */
  function render() {
    rotor.style.transition = 'none';
    rotor.style.transform  = `translateX(-50%) rotate(0deg)`;
    for (let i = 0; i < SLOTS; i++) {
      const face = document.getElementById(`${uid}_face${i}`);
      const lbl  = document.getElementById(`${uid}_lbl${i}`);
      if (face) { face.style.transition = 'none'; face.style.transform = 'rotate(0deg)'; }
      if (lbl)    lbl.style.transform = 'translateX(-50%) rotate(0deg)';
    }
    renderImages();
    updateCard();
  }

  function updateCard() {
    const card = document.getElementById(`${uid}_card`);
    if (!card) return;
    setCardData(dishes[((activeDish % N) + N) % N]);
    card.classList.remove('empty');
  }

  function setCardData(dish) {
    const ci = document.getElementById(`${uid}_cimg`);
    const cc = document.getElementById(`${uid}_ccat`);
    const cn = document.getElementById(`${uid}_cname`);
    const cp = document.getElementById(`${uid}_cprice`);
    if (ci) { ci.src = getImg(dish.name); ci.alt = dish.name; }
    if (cc)   cc.textContent = catLabel;
    if (cn)   cn.textContent = dish.name;
    if (cp)   cp.textContent = '\u20B9' + dish.price;
  }

  /* ── Rotate ──────────────────────────────────────────────────────
     Timeline (WHL_DURATION = 700 ms):
       t = 0 ms         → .fading on ci: text + thumb fade OUT over 280 ms
       t = 0 ms         → rotor spins with expo-out easing
       t = WHL_FADE_MS  → content invisible: swap card data silently
       t = WHL_DURATION → animation done, snap rotor back to 0° (invisible)
                          reassign node images, single rAF → remove .fading
  ── */
  function doRotate(steps) {
    if (spinning) return;
    spinning = true;

    const card     = document.getElementById(`${uid}_card`);
    const ci       = document.getElementById(`${uid}_ci`);
    const animDeg  = steps * arcStep;
    const nextDish = ((activeDish + steps) % N + N) % N;

    /* 1. Fade card content out */
    if (ci) ci.classList.add('fading');

    /* 2. Spin rotor — expo-out feels like a physical push coasting to rest */
    rotor.style.transition = `transform ${WHL_DURATION}ms ${WHL_EASE}`;
    rotor.style.transform  = `translateX(-50%) rotate(${animDeg}deg)`;

    /* 3. Counter-rotate faces so images stay upright during the spin */
    for (let i = 0; i < SLOTS; i++) {
      const face = document.getElementById(`${uid}_face${i}`);
      const lbl  = document.getElementById(`${uid}_lbl${i}`);
      if (face) {
        face.style.transition = `transform ${WHL_DURATION}ms ${WHL_EASE}`;
        face.style.transform  = `rotate(${-animDeg}deg)`;
      }
      if (lbl) lbl.style.transform = `translateX(-50%) rotate(${-animDeg}deg)`;
    }

    /* 4. Mid-spin: content invisible — swap data silently */
    setTimeout(() => {
      setCardData(dishes[nextDish]);
      if (card) card.classList.remove('empty');
    }, WHL_FADE_MS);

    /* 5. End: silent rotor reset → reassign images → fade content back in */
    setTimeout(() => {
      activeDish = nextDish;

      rotor.style.transition = 'none';
      rotor.style.transform  = `translateX(-50%) rotate(0deg)`;
      for (let i = 0; i < SLOTS; i++) {
        const face = document.getElementById(`${uid}_face${i}`);
        const lbl  = document.getElementById(`${uid}_lbl${i}`);
        if (face) { face.style.transition = 'none'; face.style.transform = 'rotate(0deg)'; }
        if (lbl)    lbl.style.transform = 'translateX(-50%) rotate(0deg)';
      }

      renderImages();

      requestAnimationFrame(() => {
        if (ci) ci.classList.remove('fading');
        spinning = false;
      });
    }, WHL_DURATION + 16);
  }

  window[`${uid}_rotate`] = (dir) => doRotate(dir);

  /* ── Add active dish to cart ─────────────────────────────────────
     Only navigate to menu page when coming FROM the home page.
     If already on the menu, add silently — no rebuild, no flicker.
  ── */
  window[`${uid}_doAdd`] = function() {
    const dish = dishes[((activeDish % N) + N) % N];
    const ex   = cart.find(c => c.id === dish.id);
    if (ex) ex.qty++;
    else cart.push({
      id: dish.id, name: dish.name, price: dish.price, cat: catLabel, qty: 1
    });
    save();
    refreshCart();
    toast('\u2713 Added \u2014 ' + dish.name.split(' ').slice(0, 3).join(' '));

    const homePage = document.getElementById('home');
    if (homePage && homePage.classList.contains('on')) {
      showPage('menuPg');
      buildMenuUI();
      switchCat(dish.cat || catLabel);
      requestAnimationFrame(() => {
        const targetCat = dish.cat || catLabel;
        const sbBtn = [...document.querySelectorAll('.sb-btn')]
          .find(b => b.textContent.trim().startsWith(targetCat.split(' ')[0]));
        if (sbBtn) sbBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  };

  /* ── Touch swipe with momentum ── */
  let tx0 = 0, tt0 = 0, mSteps = 0, mDir = 0, mTimer = null;

  function fireMomentum() {
    if (mSteps <= 0) return;
    doRotate(mDir);
    mSteps--;
    if (mSteps > 0) mTimer = setTimeout(fireMomentum, WHL_DURATION + 40);
  }

  const wrap = document.getElementById(`${uid}_wrap`);
  if (wrap) {
    wrap.addEventListener('touchstart', e => {
      tx0 = e.touches[0].clientX;
      tt0 = Date.now();
      clearTimeout(mTimer); mSteps = 0;
    }, { passive: true });

    wrap.addEventListener('touchend', e => {
      const dx  = e.changedTouches[0].clientX - tx0;
      const dt  = Math.max(Date.now() - tt0, 1);
      const vel = Math.abs(dx) / dt;
      if (Math.abs(dx) < 28) return;

      mDir = dx < 0 ? -1 : 1;
      if      (vel > 2.2) mSteps = 4;
      else if (vel > 1.4) mSteps = 3;
      else if (vel > 0.7) mSteps = 2;
      else                mSteps = 1;

      fireMomentum();
    }, { passive: true });
  }

  render();
       }
