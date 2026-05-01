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
   - Card always shows dishes[activeDish], updated after spin completes
═══════════════════════════════════════ */

function wheelSizes() {
  const W = window.innerWidth;
  if (W < 480) return { R:190, ns:92,  SLOTS:5 };
  if (W < 768) return { R:255, ns:114, SLOTS:7 };
  return              { R:335, ns:138, SLOTS:7 };
}

function buildWheel(host, dishes, catLabel, accentColor, uid) {
  const N = dishes.length;
  if (!N) return;

  const { R, ns, SLOTS: rawSlots } = wheelSizes();
  const SLOTS     = Math.min(rawSlots, N);
  const nr        = ns / 2;
  const activeIdx = Math.floor(SLOTS / 2); // middle index = spotlight position

  /* Arc geometry: spread SLOTS nodes evenly, middle one lands at 270° */
  const arcStep  = SLOTS > 1 ? 180 / (SLOTS - 1) : 0;
  const arcStart = 270 - activeIdx * arcStep; // ensures middle = 270°

  /* Wrap clips bottom half. Rotor center = (50%, wrapH).
     Active node center = rotor_center + (R·cos270°, R·sin270°)
                        = (50%, wrapH) + (0, -R)
                        = (50%, wrapH - R)
     Active node top    = wrapH - R - nr
     We want a small topPad above that → wrapH - R - nr = topPad
     → wrapH = topPad + R + nr                                         */
  const topPad = 58;
  const wrapH  = topPad + R + nr;

  /* Spotlight: same center as active node → left:50%, top: topPad */
  const spotSize = ns;       // exactly match the dish circle size
  const spotTop  = topPad;   // center aligned with node center

  /* State */
  let activeDish = 0; // index of dish currently under the spotlight
  let spinning   = false;

  /* ── DOM ──────────────────────────────────────────────────────── */
  host.innerHTML = `
    <div class="whl-wrap" id="${uid}_wrap" style="height:${wrapH}px;overflow:hidden;position:relative;">
      <div class="whl-table" style="
        width:${(R+nr)*2+80}px;height:${(R+nr)*2+80}px;
        position:absolute;left:50%;bottom:0;transform:translateX(-50%);
      "></div>
      <!-- Spotlight: fixed at 12 o'clock, center = (50%, topPad+nr) -->
      <div class="whl-spotlight" style="
        width:${spotSize}px;height:${spotSize}px;
        position:absolute;
        left:50%;top:${spotTop}px;
        transform:translateX(-50%);
        z-index:15;pointer-events:none;
      "></div>
      <!-- Rotor: center at (50%, wrapH) -->
      <div class="whl-rotor" id="${uid}_rotor" style="
        width:${R*2}px;height:${R*2}px;
        position:absolute;
        left:50%;top:${wrapH-R}px;
        transform:translateX(-50%);
      "></div>
    </div>
    <div class="whl-bottom">
      <button class="whl-arr whl-arr-left" onclick="${uid}_rotate(-1)">
        <svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="whl-card-wrap">
        <div class="whl-card empty" id="${uid}_card" onclick="${uid}_doAdd()">
          <div class="whl-card-inner" id="${uid}_ci">
            <div class="whl-card-thumb"><img id="${uid}_cimg" src="" alt="" loading="lazy"></div>
            <div class="whl-card-cat"  id="${uid}_ccat"></div>
            <div class="whl-card-name" id="${uid}_cname"></div>
            <div class="whl-card-price" id="${uid}_cprice"></div>
            <button class="whl-add-btn" onclick="event.stopPropagation();${uid}_doAdd()">
              <svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add to Cart
            </button>
          </div>
        </div>
      </div>
      <button class="whl-arr whl-arr-right" onclick="${uid}_rotate(1)">
        <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
      </button>
      <!-- Mobile-only arrows row -->
      <div class="whl-arrows-mobile">
        <button class="whl-arr" onclick="${uid}_rotate(-1)"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>
        <button class="whl-arr" onclick="${uid}_rotate(1)"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></button>
      </div>
    </div>`;

  const rotor = document.getElementById(`${uid}_rotor`);

  /* ── Build nodes ──────────────────────────────────────────────── */
  for (let i = 0; i < SLOTS; i++) {
    const deg = arcStart + i * arcStep;
    const rad = deg * Math.PI / 180;
    /* Position within rotor div (rotor top-left = 0,0; center = R,R) */
    const x = R + R * Math.cos(rad) - nr;
    const y = R + R * Math.sin(rad) - nr;

    const isActive  = (i === activeIdx);
    const isPartial = (i === 0 || i === SLOTS - 1);

    const node = document.createElement('div');
    node.className = 'whl-node' + (isActive ? ' active' : '') + (isPartial ? ' partial' : '');
    node.id = `${uid}_node${i}`;
    node.style.cssText = `width:${ns}px;height:${ns}px;left:${x}px;top:${y}px;position:absolute;${isPartial ? 'pointer-events:none;' : ''}`;
    node.innerHTML = `
      <div class="whl-node-face" id="${uid}_face${i}">
        <img id="${uid}_img${i}" src="" alt="" loading="lazy">
      </div>
      <div class="whl-node-label" id="${uid}_lbl${i}"></div>`;

    if (!isPartial && !isActive) {
      /* steps = activeIdx - i:
         node to the RIGHT (i > activeIdx) → steps < 0 → rotorDeg decreases
         → rotor spins counter-clockwise → that right node travels LEFT to 270° ✓
         node to the LEFT  (i < activeIdx) → steps > 0 → rotorDeg increases
         → rotor spins clockwise → that left node travels RIGHT to 270° ✓        */
      const steps = activeIdx - i;
      node.addEventListener('click', () => doRotate(steps));
    }
    if (isActive) {
      node.addEventListener('click', () => window[`${uid}_doAdd`]());
    }
    rotor.appendChild(node);
  }

  /* ── Assign images to slots based on current activeDish ─────── */
  function renderImages() {
    for (let i = 0; i < SLOTS; i++) {
      /* activeDish sits at slot activeIdx (always at 270° when rotorDeg=0).
         Slots to the left (lower i) show next dishes; right shows previous. */
      const di   = ((activeDish + (activeIdx - i)) % N + N) % N;
      const dish = dishes[di];
      const img  = document.getElementById(`${uid}_img${i}`);
      const lbl  = document.getElementById(`${uid}_lbl${i}`);
      if (img) { img.src = getImg(dish.name); img.alt = dish.name; }
      if (lbl)   lbl.textContent = dish.name.split(' ').slice(0, 3).join(' ');
    }
  }

  /* ── Initial render (no animation, rotor always at 0°) ───────── */
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

  /* ── Card update: always shows the current spotlight dish ────── */
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
    if (cp)   cp.textContent = '₹' + dish.price;
  }

  /* ── Rotate ───────────────────────────────────────────────────── */
  /*
     GEOMETRY (rotor always resets to 0° after each spin):
     - Slot activeIdx is always at 270° when rotorDeg=0.
     - CW spin by steps*arcStep brings slot (activeIdx - steps) to 270°.
     - Before rotation that slot showed dishes[(activeDish + steps) % N].
     - So after CW spin, activeDish += steps.
     
     Pattern: animate → wait → reset rotor to 0° → reassign images → show card.
     This guarantees the card always matches the spotlight dish.
  */
  function doRotate(steps) {
    if (spinning) return;
    spinning = true;

    /* Fade out card text instantly — card stays visible, no layout jump */
    const card = document.getElementById(`${uid}_card`);
    const ci   = document.getElementById(`${uid}_ci`);
    if (ci) ci.classList.add('fading');

    const animDeg = steps * arcStep;

    /* Spin the rotor */
    rotor.style.transition = 'transform .52s cubic-bezier(0.22,0.61,0.36,1)';
    rotor.style.transform  = `translateX(-50%) rotate(${animDeg}deg)`;

    /* Counter-rotate faces & labels so images stay upright during spin */
    for (let i = 0; i < SLOTS; i++) {
      const face = document.getElementById(`${uid}_face${i}`);
      const lbl  = document.getElementById(`${uid}_lbl${i}`);
      if (face) {
        face.style.transition = 'transform .52s cubic-bezier(0.22,0.61,0.36,1)';
        face.style.transform  = `rotate(${-animDeg}deg)`;
      }
      if (lbl) lbl.style.transform = `translateX(-50%) rotate(${-animDeg}deg)`;
    }

    /* At animation end: reset silently, update content, fade back in */
    setTimeout(() => {
      activeDish = ((activeDish + steps) % N + N) % N;

      rotor.style.transition = 'none';
      rotor.style.transform  = `translateX(-50%) rotate(0deg)`;
      for (let i = 0; i < SLOTS; i++) {
        const face = document.getElementById(`${uid}_face${i}`);
        const lbl  = document.getElementById(`${uid}_lbl${i}`);
        if (face) { face.style.transition = 'none'; face.style.transform = 'rotate(0deg)'; }
        if (lbl)    lbl.style.transform = 'translateX(-50%) rotate(0deg)';
      }

      renderImages();
      setCardData(dishes[((activeDish % N) + N) % N]);
      if (card) card.classList.remove('empty');

      /* Double rAF: let DOM paint new content before fading it in */
      requestAnimationFrame(() => requestAnimationFrame(() => {
        if (ci) ci.classList.remove('fading');
        spinning = false;
      }));
    }, 520);
  }
  window[`${uid}_rotate`] = (dir) => doRotate(dir);

  /* ── Add active dish to cart ──────────────────────────────────── */
  window[`${uid}_doAdd`] = function() {
    const dish = dishes[((activeDish % N) + N) % N];
    const ex   = cart.find(c => c.id === dish.id);
    if (ex) ex.qty++;
    else cart.push({ id: dish.id, name: dish.name, price: dish.price, cat: catLabel, qty: 1 });
    save(); refreshCart();
    toast('\u2713 Added \u2014 ' + dish.name.split(' ').slice(0, 2).join(' '));

    /* Navigate to menu page, switch to the dish's category, scroll to it */
    showPage('menuPg');
    buildMenuUI();
    switchCat(dish.cat || catLabel);
    /* After the category renders, scroll the sidebar button into view */
    requestAnimationFrame(() => {
      const targetCat = dish.cat || catLabel;
      const sbBtn = [...document.querySelectorAll('.sb-btn')]
        .find(b => b.textContent.trim().startsWith(targetCat.split(' ')[0]));
      if (sbBtn) sbBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  /* ── Touch swipe with momentum (free-wheel feel) ──────────────── */
  let tx0 = 0, tt0 = 0, mSteps = 0, mDir = 0, mTimer = null;

  function fireMomentum() {
    if (mSteps <= 0) return;
    doRotate(mDir);
    mSteps--;
    /* Each extra step fires after the current animation completes */
    if (mSteps > 0) mTimer = setTimeout(fireMomentum, 540 + (3 - mSteps) * 60);
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
      const vel = Math.abs(dx) / dt; // px per ms
      if (Math.abs(dx) < 28) return;

      /* BUG 1 FIX: swipe left → next dish (dir -1), swipe right → prev dish (dir +1) */
      mDir = dx < 0 ? -1 : 1;
      /* Map velocity to number of momentum steps (1–4) */
      if      (vel > 2.2) mSteps = 4;
      else if (vel > 1.4) mSteps = 3;
      else if (vel > 0.7) mSteps = 2;
      else                mSteps = 1;

      fireMomentum();
    }, { passive: true });
  }

  render();
}