/* ═══════════════════════════════════════
   CONVEYOR BELT WHEEL ENGINE — v3 CLEAN

   GEOMETRY:
   - Rotor center = bottom-center of .whl-wrap
   - Active slot = slot at index activeIdx, always at angle 270° (12 o'clock)
   - arcStart + activeIdx*arcStep = 270  →  arcStart = 270 - activeIdx*arcStep
   - Spotlight positioned exactly over the active node: same center X/Y

   DISH TRACKING:
   - activeDish = index of dish currently under spotlight
   - On rotate(dir): activeDish shifts, rotor spins by arcStep*dir degrees
   - Card updates at mid-spin (WHL_FADE_MS) while faded → fades in as rotor settles

   SMALL CATEGORY FALLBACK (N < 5):
   - Categories with 2–4 dishes skip the wheel entirely
   - buildSmallCatLayout() renders a centred card grid instead

   ANIMATION NOTES:
   - Easing: cubic-bezier(0.16,1,0.3,1) — expo-out. Fast start, friction stop.
     No overshoot. Feels like a physical plate being pushed and coasting to rest.
   - Duration: 700ms per step.
   - Card crossfade: content + thumb fade out (280ms CSS), swap at 350ms mid-spin,
     fade back in via rAF after rotor reset. Smooth, never a hard pop.
═══════════════════════════════════════ */

const WHL_DURATION = 700;
const WHL_EASE     = 'cubic-bezier(0.16,1,0.3,1)';
const WHL_FADE_MS  = 350;

function wheelSizes() {
  const W = window.innerWidth;
  if (W < 480) return { R:190, ns:92,  SLOTS:5 };
  if (W < 768) return { R:255, ns:114, SLOTS:7 };
  return              { R:335, ns:138, SLOTS:7 };
}

/* ═══════════════════════════════════════
   SMALL CATEGORY CARD GRID  (N < 5)
═══════════════════════════════════════ */
function buildSmallCatLayout(host, dishes, catLabel, accentColor, uid) {
  const N = dishes.length;

  window[uid + '_addSmall'] = function(idx) {
    const d  = dishes[idx];
    const ex = cart.find(c => c.id === d.id);
    if (ex) ex.qty++;
    else cart.push({ id: d.id, name: d.name, price: d.price, cat: catLabel, qty: 1 });
    save();
    refreshCart();
    toast('\u2713 Added \u2014 ' + d.name.split(' ').slice(0, 3).join(' '));
  };

  const cards = dishes.map((dish, i) => `
    <div class="sml-card" id="${uid}_sml${i}">
      <div class="sml-img-wrap">
        <img src="${getImg(dish.name)}" alt="${dish.name}" loading="lazy">
      </div>
      <div class="sml-cat">${catLabel}</div>
      <div class="sml-name">${dish.name}</div>
      <div class="sml-price">&#8377;${dish.price}</div>
      <button class="sml-btn" onclick="${uid}_addSmall(${i})">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none"
             stroke="#fff" stroke-width="2.5">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5"  y1="12" x2="19" y2="12"/>
        </svg>
        Add to Cart
      </button>
    </div>
  `).join('');

  if (!document.getElementById('sml_card_styles')) {
    const style = document.createElement('style');
    style.id = 'sml_card_styles';
    style.textContent = `
      .sml-row{display:flex;flex-wrap:wrap;gap:18px;justify-content:center;padding:8px 24px 52px;}
      .sml-card{display:flex;flex-direction:column;align-items:center;background:var(--card,#fff);border-radius:22px;padding:26px 22px 22px;box-shadow:var(--sh-md);border:1.5px solid rgba(0,0,0,.045);flex:1 1 160px;max-width:220px;min-width:150px;cursor:pointer;transition:transform .22s var(--spring,cubic-bezier(.34,1.56,.64,1)),box-shadow .22s;text-align:center;}
      .sml-card:hover{transform:translateY(-5px);box-shadow:0 18px 44px rgba(0,0,0,.13);}
      .sml-card:active{transform:scale(.97);}
      .sml-img-wrap{width:110px;height:110px;border-radius:50%;overflow:hidden;border:3px solid rgba(43,191,155,.55);box-shadow:0 0 0 6px rgba(43,191,155,.1),0 6px 18px rgba(43,191,155,.18);margin-bottom:18px;background:#e8e4dc;flex-shrink:0;}
      .sml-img-wrap img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .4s;}
      .sml-card:hover .sml-img-wrap img{transform:scale(1.08);}
      .sml-cat{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.8px;color:var(--a,#2bbf9b);margin-bottom:7px;}
      .sml-name{font-family:'Cormorant Garamond',serif;font-size:18px;font-weight:700;color:var(--ink,#1a1916);line-height:1.25;margin-bottom:8px;}
      .sml-price{font-family:'DM Mono',monospace;font-size:17px;font-weight:500;color:var(--p,#1f7a63);margin-bottom:18px;}
      .sml-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;width:100%;padding:11px 16px;border-radius:50px;border:none;background:linear-gradient(135deg,var(--p,#1f7a63),var(--a,#2bbf9b));color:#fff;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:700;box-shadow:0 4px 14px rgba(31,122,99,.3);cursor:pointer;transition:transform .2s var(--spring,cubic-bezier(.34,1.56,.64,1)),box-shadow .2s;}
      .sml-btn:hover{transform:translateY(-2px);box-shadow:0 8px 22px rgba(31,122,99,.42);}
      .sml-btn:active{transform:scale(.95);}
      @media(max-width:480px){.sml-row{gap:12px;padding:8px 16px 44px;}.sml-card{padding:20px 16px 18px;}.sml-img-wrap{width:90px;height:90px;}.sml-name{font-size:16px;}}
    `;
    document.head.appendChild(style);
  }

  host.innerHTML = `<div class="sml-row">${cards}</div>`;
}


/* ═══════════════════════════════════════
   MAIN WHEEL BUILDER
═══════════════════════════════════════ */
function buildWheel(host, dishes, catLabel, accentColor, uid) {
  const N = dishes.length;
  if (!N) return;

  if (N < 5) {
    buildSmallCatLayout(host, dishes, catLabel, accentColor, uid);
    return;
  }

  const { R, ns, SLOTS: rawSlots } = wheelSizes();
  const SLOTS     = Math.min(rawSlots, N);
  const nr        = ns / 2;
  const activeIdx = Math.floor(SLOTS / 2);
  const arcStep   = SLOTS > 1 ? 180 / (SLOTS - 1) : 0;
  const arcStart  = 270 - activeIdx * arcStep;
  const topPad    = 58;
  const wrapH     = topPad + R + nr;
  const spotSize  = ns;
  const spotTop   = topPad;

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
    const deg      = arcStart + i * arcStep;
    const rad      = deg * Math.PI / 180;
    const x        = R + R * Math.cos(rad) - nr;
    const y        = R + R * Math.sin(rad) - nr;
    const isActive  = (i === activeIdx);
    const isPartial = (i === 0 || i === SLOTS - 1);

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
     Timeline for one step (WHL_DURATION = 700ms):

       t = 0ms          → .fading added  : card content + thumb fade OUT (280ms CSS)
       t = 0ms          → rotor starts spinning with expo-out easing
       t = WHL_FADE_MS  → content is fully invisible: silently swap card data
       t = WHL_DURATION → rotor animation done
         → transition:none set, rotor snaps back to 0° (invisible, fading still on)
         → node images reassigned
         → single rAF: remove .fading → content fades IN (280ms CSS)
         → spinning = false
  ── */
  function doRotate(steps) {
    if (spinning) return;
    spinning = true;

    const card     = document.getElementById(`${uid}_card`);
    const ci       = document.getElementById(`${uid}_ci`);
    const animDeg  = steps * arcStep;
    const nextDish = ((activeDish + steps) % N + N) % N;

    /* 1. Begin card fade-out */
    if (ci) ci.classList.add('fading');

    /* 2. Spin rotor — expo-out: plates feel like they're being physically pushed */
    rotor.style.transition = `transform ${WHL_DURATION}ms ${WHL_EASE}`;
    rotor.style.transform  = `translateX(-50%) rotate(${animDeg}deg)`;

    /* 3. Counter-rotate every face so images stay upright while the rotor spins */
    for (let i = 0; i < SLOTS; i++) {
      const face = document.getElementById(`${uid}_face${i}`);
      const lbl  = document.getElementById(`${uid}_lbl${i}`);
      if (face) {
        face.style.transition = `transform ${WHL_DURATION}ms ${WHL_EASE}`;
        face.style.transform  = `rotate(${-animDeg}deg)`;
      }
      if (lbl) lbl.style.transform = `translateX(-50%) rotate(${-animDeg}deg)`;
    }

    /* 4. Mid-spin swap: card is fully invisible now — update content silently */
    setTimeout(() => {
      setCardData(dishes[nextDish]);
      if (card) card.classList.remove('empty');
    }, WHL_FADE_MS);

    /* 5. End of spin: reset rotor position silently, reassign node images, reveal card */
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

      /* Single rAF: let browser paint the reset frame, then start fade-in */
      requestAnimationFrame(() => {
        if (ci) ci.classList.remove('fading');
        spinning = false;
      });
    }, WHL_DURATION + 16); /* +16ms ensures CSS transition is guaranteed finished */
  }

  window[`${uid}_rotate`] = (dir) => doRotate(dir);

  /* ── Add active dish to cart ─────────────────────────────────────
     KEY FIX: only navigate to menuPg if currently on the home page.
     If already browsing the menu, just add silently — no rebuild, no flicker.
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

    /* Only navigate from home page — on menu page, adding is enough */
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
