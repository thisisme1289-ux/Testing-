/* ═══════════════════════════════════════
   NAV SCROLL
═══════════════════════════════════════ */
window.addEventListener('scroll', () =>
  document.getElementById('nav').classList.toggle('raised', scrollY > 20), { passive: true });

/* ═══════════════════════════════════════
   ROUTING
═══════════════════════════════════════ */
/* ═══════════════════════════════════════
   ORDER STATUS MANAGEMENT
═══════════════════════════════════════ */
function applyOrderStatus() {
  /* ── Cart footer checkout button ── */
  const cBtn = document.getElementById('checkoutBtn');
  if (cBtn) {
    if (ordersOpen) {
      cBtn.className = 'cart-cta';
      cBtn.onclick = showCo;
      cBtn.innerHTML = 'Proceed to Checkout';
    } else {
      cBtn.className = 'btn-closed';
      cBtn.onclick = null;
      cBtn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Restaurant is Closed';
    }
  }

  /* ── Checkout form closed banner + place order btn ── */
  const banner = document.getElementById('coBanner');
  const poBtn  = document.getElementById('placeOrderBtn');
  if (banner) banner.classList.toggle('show', !ordersOpen);
  if (poBtn) {
    if (ordersOpen) {
      poBtn.className = 'co-btn';
      poBtn.onclick = placeOrder;
      poBtn.disabled = false;
      poBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" style="margin-right:6px"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg> Place Order via WhatsApp';
    } else {
      poBtn.className = 'btn-closed';
      poBtn.onclick = null;
      poBtn.disabled = true;
      poBtn.innerHTML = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg> Orders Currently Closed';
    }
  }

  /* ── Floating cart bar closed badge ── */
  const fb = document.getElementById('fbar');
  if (fb) {
    let badge = document.getElementById('fbar-closed');
    if (!ordersOpen) {
      if (!badge) {
        badge = document.createElement('div');
        badge.id = 'fbar-closed';
        badge.className = 'fbar-closed-badge';
        badge.textContent = 'Closed';
        fb.appendChild(badge);
      }
    } else {
      if (badge) badge.remove();
    }
  }

  /* ── Kitchen toggle sync ── */
  const tog = document.getElementById('orderToggle');
  const sts = document.getElementById('kToggleStatus');
  if (tog) tog.checked = ordersOpen;
  if (sts) {
    sts.textContent = ordersOpen ? 'Open' : 'Closed';
    sts.className = 'k-toggle-status ' + (ordersOpen ? 'open' : 'closed');
  }
}

function toggleOrders(isOpen) {
  ordersOpen = isOpen;
  localStorage.setItem('annamay_orders_open', isOpen ? 'true' : 'false');
  applyOrderStatus();
  toast(isOpen ? '✅ Orders are now OPEN' : '🔴 Orders are now CLOSED');
}

function initRoute() {
  const p = new URLSearchParams(location.search);
  if (p.get('view') === 'kitchen') {
    document.querySelectorAll('.page').forEach(x => x.classList.remove('on'));
    document.getElementById('kitchenPg').classList.add('on');
    renderKitchen();
  }
  applyOrderStatus();
}


/* ═══════════════════════════════════════
   PAGE NAV
═══════════════════════════════════════ */
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.getElementById(id).classList.add('on');
  scrollTo(0, 0);
}
function goHome() { showPage('home'); }
function goMenu() { showPage('menuPg'); buildMenuUI(); }
function scrollGal() { document.getElementById('galSec').scrollIntoView({ behavior: 'smooth' }); }

/* ═══════════════════════════════════════
   CAROUSEL
═══════════════════════════════════════ */
function buildDots() {
  const w = document.getElementById('cDots'); w.innerHTML = '';
  for (let i = 0; i < SLIDES; i++) {
    const d = document.createElement('div');
    d.className = 'c-dot' + (i === 0 ? ' on' : '');
    d.onclick = () => goSlide(i); w.appendChild(d);
  }
}
function goSlide(n) {
  document.querySelectorAll('.c-slide').forEach((s,i) => s.classList.toggle('on', i===n));
  document.querySelectorAll('.c-dot').forEach((d,i) => d.classList.toggle('on', i===n));
  slideIdx = n;
}
function shiftSlide(d) { slideIdx = (slideIdx + d + SLIDES) % SLIDES; goSlide(slideIdx); resetTimer(); }
function resetTimer() { clearInterval(slideTimer); slideTimer = setInterval(() => shiftSlide(1), 5200); }

/* ═══════════════════════════════════════
   FEATURED WHEEL (Specialities)
═══════════════════════════════════════ */
function initFeatWheel() {
  const host = document.getElementById('feat-whl-host');
  if (!host) return;
  buildWheel(host, FEATURED, "Chef's Pick", 'var(--p)', 'fw');
}

/* ═══════════════════════════════════════
   MENU UI
═══════════════════════════════════════ */
function buildMenuUI() { buildSidebar(); buildTabs(); renderCat(); }

function buildSidebar() {
  document.getElementById('mSide').innerHTML =
    `<div class="sb-head">Categories</div>` +
    Object.keys(MENU).map(c => `
      <button class="sb-btn${c===activeCat?' on':''}" onclick="switchCat('${c}')">
        <span>${c}</span><span class="sb-ct">${MENU[c].length}</span>
      </button>`).join('');
}

function buildTabs() {
  const wrap = document.getElementById('mTabs');
  wrap.querySelectorAll('.tab-btn').forEach(b => b.remove());
  Object.keys(MENU).forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (c === activeCat ? ' on' : '');
    btn.textContent = c;
    btn.onclick = () => switchCat(c);
    wrap.appendChild(btn);
  });
  requestAnimationFrame(slidePill);
}

function slidePill() {
  const a = document.querySelector('.tab-btn.on');
  const s = document.getElementById('tPill');
  if (a && s) { s.style.left = a.offsetLeft + 'px'; s.style.width = a.offsetWidth + 'px'; }
}

function switchCat(c) {
  activeCat = c; searchMode = false;
  document.getElementById('sInput').value = '';
  buildSidebar(); buildTabs(); renderCat();
  const a = document.querySelector('.tab-btn.on');
  if (a) a.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  scrollTo({ top: 280, behavior: 'smooth' });
}

let menuWheelCounter = 0;
function renderCat() {
  const items = MENU[activeCat];
  const col = CAT_COLORS[activeCat] || 'var(--p)';
  const content = document.getElementById('mContent');
  const uid = 'mw' + (++menuWheelCounter);

  content.innerHTML = `
    <div class="mcat-wrap">
      <div class="mcat-hdr">
        <div class="mcat-title" style="color:${col}">${activeCat}</div>
        <div class="mcat-line"></div>
        <div class="mcat-count">${items.length} dishes</div>
      </div>
      <div id="${uid}_host"></div>
    </div>`;

  const whlHost = document.getElementById(`${uid}_host`);
  buildWheel(whlHost, items, activeCat, col, uid);
}

/* ─── SEARCH ─────────────────────── */
function doSearch(q) {
  const query = q.trim().toLowerCase();
  if (!query) { searchMode = false; renderCat(); return; }
  searchMode = true;
  const res = [];
  Object.entries(MENU).forEach(([cat, items]) =>
    items.forEach(item => { if (item.name.toLowerCase().includes(query)) res.push({...item, cat}); })
  );
  const content = document.getElementById('mContent');
  if (!res.length) {
    content.innerHTML = `<div class="no-res">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <p>No results for "${q}"</p></div>`;
    return;
  }
  const uid = 'sw' + (++menuWheelCounter);
  content.innerHTML = `
    <div class="mcat-wrap">
      <div class="mcat-hdr">
        <div class="mcat-title">Search: <em>${q}</em></div>
        <div class="mcat-line"></div>
        <div class="mcat-count">${res.length} found</div>
      </div>
      <div id="${uid}_host"></div>
    </div>`;
  buildWheel(document.getElementById(`${uid}_host`), res, 'Search Result', 'var(--p)', uid);
}

/* ═══════════════════════════════════════
   MODAL
═══════════════════════════════════════ */
function openModal(id, name, price, cat) {
  selItem = {id, name, price, cat}; selQty = 1;
  document.getElementById('mImg').src = getImg(name);
  document.getElementById('mCat').textContent = cat || activeCat;
  document.getElementById('mName').textContent = name;
  document.getElementById('mPrice').textContent = '₹' + price;
  document.getElementById('qVal').textContent = '1';
  const sbW = window.innerWidth - document.documentElement.clientWidth;
  const navBase = window.innerWidth <= 640 ? 16 : 32;
  document.body.style.paddingRight = sbW + 'px';
  document.getElementById('nav').style.paddingRight = (navBase + sbW) + 'px';
  document.body.classList.add('scroll-locked');
  document.getElementById('itemOv').classList.add('on');
}
function closeModal(e) {
  if (e.target.id === 'itemOv') {
    document.getElementById('itemOv').classList.remove('on');
    document.body.style.paddingRight = '';
    document.getElementById('nav').style.paddingRight = '';
    document.body.classList.remove('scroll-locked');
  }
}
function adjQty(d) { selQty = Math.max(1, selQty + d); document.getElementById('qVal').textContent = selQty; }
function addToCart() {
  const ex = cart.find(c => c.id === selItem.id);
  if (ex) ex.qty += selQty; else cart.push({...selItem, qty: selQty});
  save(); refreshCart();
  document.getElementById('itemOv').classList.remove('on');
  document.body.style.paddingRight = '';
  document.getElementById('nav').style.paddingRight = '';
  document.body.classList.remove('scroll-locked');
  toast('Added to cart');
}

/* ═══════════════════════════════════════
   CART
═══════════════════════════════════════ */
function save() { localStorage.setItem('annamay5', JSON.stringify(cart)); }

function refreshCart() {
  const subtotal = cart.reduce((s,c) => s+c.price*c.qty, 0);
  const cgst = Math.round(subtotal * 0.025);
  const sgst = Math.round(subtotal * 0.025);
  const total = subtotal + cgst + sgst;
  const count = cart.reduce((s,c) => s+c.qty, 0);

  /* Float bar */
  const fb = document.getElementById('fbar');
  if (count) {
    fb.classList.add('up');
    document.getElementById('fbCount').textContent = count + ' item' + (count>1?'s':'');
    document.getElementById('fbPrice').textContent = '₹' + total;
  } else fb.classList.remove('up');

  /* Nav chip */
  const chip = document.getElementById('nav-chip');
  if (count) {
    chip.textContent = count; chip.style.display = 'inline-block';
    chip.classList.add('pop'); setTimeout(() => chip.classList.remove('pop'), 400);
    document.getElementById('nav-lbl').textContent = '₹' + total;
  } else {
    chip.style.display = 'none';
    document.getElementById('nav-lbl').textContent = 'Cart';
  }

  /* Tax rows */
  const sub = document.getElementById('cSubtotal');
  const cgstEl = document.getElementById('cCgst');
  const sgstEl = document.getElementById('cSgst');
  if (sub)   sub.textContent = '₹' + subtotal;
  if (cgstEl) cgstEl.textContent = '₹' + cgst;
  if (sgstEl) sgstEl.textContent = '₹' + sgst;

  /* Total */
  const tv = document.getElementById('cTotal');
  tv.textContent = '₹' + total;
  tv.classList.add('bump'); setTimeout(() => tv.classList.remove('bump'), 400);

  /* Body */
  const body = document.getElementById('cBody');
  if (!cart.length) {
    body.innerHTML = `<div class="cart-empty">
      <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
      <p>Your cart is empty</p><small>Add something delicious</small></div>`;
  } else {
    body.innerHTML = cart.map(c => `
      <div class="c-row">
        <img class="c-row-img" src="${getImg(c.name)}" alt="${c.name}">
        <div class="c-row-info">
          <div class="c-row-nm">${c.name}</div>
          <div class="c-row-pr">₹${c.price} × ${c.qty} = ₹${c.price*c.qty}</div>
        </div>
        <div class="c-ctrl">
          <button class="cc-b" onclick="chgQty('${c.id}',-1)">−</button>
          <span class="cc-n">${c.qty}</span>
          <button class="cc-b" onclick="chgQty('${c.id}',1)">+</button>
        </div>
      </div>`).join('');
  }
}

function chgQty(id, d) {
  const c = cart.find(x => x.id===id); if (!c) return;
  c.qty += d; if (c.qty <= 0) cart = cart.filter(x => x.id!==id);
  save(); refreshCart();
}

function openCart() {
  /* Measure scrollbar width BEFORE locking so we can compensate */
  const sbW = window.innerWidth - document.documentElement.clientWidth;
  const navBase = window.innerWidth <= 640 ? 16 : 32;
  document.body.style.paddingRight = sbW + 'px';
  document.getElementById('nav').style.paddingRight = (navBase + sbW) + 'px';
  document.body.classList.add('scroll-locked');

  document.getElementById('cDr').classList.add('open');
  document.getElementById('cBd').classList.add('on');
  document.getElementById('cItemsV').style.display = 'flex';
  document.getElementById('coView').classList.remove('on');
  applyOrderStatus();
}
function closeCart() {
  const dr = document.getElementById('cDr');
  dr.classList.add('closing');
  dr.classList.remove('open');
  document.getElementById('cBd').classList.remove('on');

  /* Wait for close animation before restoring scroll */
  setTimeout(() => {
    dr.classList.remove('closing');
    document.body.style.paddingRight = '';
    document.getElementById('nav').style.paddingRight = '';
    document.body.classList.remove('scroll-locked');
  }, 300);
}
function showCo() {
  document.getElementById('cItemsV').style.display = 'none';
  document.getElementById('coView').classList.add('on');
}
function backCart() {
  document.getElementById('cItemsV').style.display = 'flex';
  document.getElementById('coView').classList.remove('on');
}

/* ═══════════════════════════════════════
   PHONE VALIDATION
═══════════════════════════════════════ */
function validatePhone(input) {
  const val = input.value.replace(/\D/g,'');
  input.value = val;
  const err = document.getElementById('phoneErr');
  if (val.length === 10 && /^[6-9]/.test(val)) {
    err.style.display = 'none';
    input.style.borderColor = 'var(--p)';
  } else if (val.length > 0) {
    err.style.display = 'block';
    input.style.borderColor = '#e53e3e';
  } else {
    err.style.display = 'none';
    input.style.borderColor = '';
  }
}

/* ═══════════════════════════════════════
   LOCATION SHARING
═══════════════════════════════════════ */
let sharedLocationUrl = '';
function shareLocation() {
  const btn = document.getElementById('locBtn');
  const txt = document.getElementById('locBtnTxt');
  const status = document.getElementById('locStatus');
  if (!navigator.geolocation) {
    btn.classList.add('err');
    txt.textContent = 'Location not supported';
    return;
  }
  txt.textContent = 'Getting location...';
  btn.classList.remove('got','err');
  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      sharedLocationUrl = 'https://maps.google.com/?q=' + lat + ',' + lng;
      txt.textContent = 'Location captured!';
      btn.classList.add('got');
      status.style.display = 'block';
      status.textContent = 'Lat: ' + lat.toFixed(5) + ', Lng: ' + lng.toFixed(5);
      toast('Location captured!');
    },
    () => {
      btn.classList.add('err');
      txt.textContent = 'Could not get location';
      status.style.display = 'block';
      status.textContent = 'You can still place the order without location.';
      sharedLocationUrl = '';
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* ═══════════════════════════════════════
   ORDER
═══════════════════════════════════════ */
function placeOrder() {
  if (!ordersOpen) { toast('Sorry, we are currently closed'); return; }
  const name  = document.getElementById('oName').value.trim();
  const phone = document.getElementById('oPhone').value.trim();
  const addr  = document.getElementById('oAddr').value.trim();
  if (!name)  { toast('Please enter your name'); return; }
  if (!phone || !/^[6-9]\d{9}$/.test(phone)) { toast('Enter a valid Indian mobile number (starts with 6-9)'); return; }
  if (!addr)  { toast('Please enter your delivery address'); return; }

  const subtotal = cart.reduce((s,c) => s+c.price*c.qty, 0);
  const cgst = Math.round(subtotal * 0.025);
  const sgst = Math.round(subtotal * 0.025);
  const total = subtotal + cgst + sgst;
  const id  = 'ORD-' + Date.now().toString(36).toUpperCase();
  const now = new Date();
  const order = { id, customer:{name,phone,address:addr}, items:cart.map(c=>({...c})), subtotal, cgst, sgst, total, status:'new', placedAt:now.toISOString(), time:now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'}) };
  orders.push(order);
  localStorage.setItem('annamay_orders', JSON.stringify(orders));

  /* Save to device order history */
  if (typeof window.saveOrderToHistory === 'function') window.saveOrderToHistory(order);

  const nl = '%0A';
  const itemLines = cart.map(c => '  ' + c.name + ' x' + c.qty + '  =  Rs.' + (c.price*c.qty)).join(nl);
  const locLine = sharedLocationUrl ? (nl + '%F0%9F%93%8D *Location:* ' + encodeURIComponent(sharedLocationUrl)) : '';
  const msg =
    '%F0%9F%8D%BD%EF%B8%8F *New Order -- ' + id + '*' + nl +
    '%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80' + nl +
    '*Items:*' + nl + itemLines + nl +
    '%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80' + nl +
    'Subtotal  :  Rs.' + subtotal + nl +
    'CGST 2.5% :  Rs.' + cgst + nl +
    'SGST 2.5% :  Rs.' + sgst + nl +
    '%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80' + nl +
    '*Grand Total  :  Rs.' + total + '*' + nl +
    '%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80%E2%94%80' + nl +
    '%F0%9F%91%A4 *Customer:* ' + name + nl +
    '%F0%9F%93%9E *Phone:* +91 ' + phone + nl +
    '%F0%9F%8F%A0 *Address:* ' + encodeURIComponent(addr) +
    locLine;

  /* Snapshot before clearing cart */
  const cartSnapshot = [...cart];
  cart = []; sharedLocationUrl = '';
  save(); refreshCart();
  ['oName','oPhone','oAddr'].forEach(i => document.getElementById(i).value = '');
  const btn = document.getElementById('locBtn');
  const txt = document.getElementById('locBtnTxt');
  const locStatus = document.getElementById('locStatus');
  if (btn) btn.classList.remove('got','err');
  if (txt) txt.textContent = 'Share My Location';
  if (locStatus) locStatus.style.display = 'none';
  closeCart();
  toast('Order sent via WhatsApp!');

  /* Fire install prompt THEN open WhatsApp */
  const openWA = () => window.open('https://wa.me/917523992202?text=' + msg, '_blank');
  if (typeof window.triggerInstallPrompt === 'function') {
    window.triggerInstallPrompt(openWA);
  } else {
    openWA();
  }
}



/* ═══════════════════════════════════════
   KITCHEN
═══════════════════════════════════════ */
function renderKitchen() {
  const act = orders.filter(o => o.status==='new');
  const done = orders.filter(o => o.status==='done');
  const ag = document.getElementById('kActive');
  const dg = document.getElementById('kDone');
  ag.innerHTML = !act.length
    ? `<div class="k-empty"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><p>No active orders</p></div>`
    : act.map(o => kCard(o,'new')).join('');
  dg.innerHTML = !done.length
    ? `<p style="color:rgba(255,255,255,.18);font-size:13px;padding:4px">No completed orders yet.</p>`
    : done.map(o => kCard(o,'done')).join('');
}

function kCard(o, status) {
  const init = o.customer.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  return `<div class="k-card" onclick="viewOrder('${o.id}')">
    <div class="k-card-h">
      <div><div class="k-oid">${o.id}</div><div class="k-time">${o.time}</div></div>
      <div class="k-status ${status}">${status==='new'?'New':'Done'}</div>
    </div>
    <div class="k-cust">
      <div class="k-av">${init}</div>
      <div><div class="k-cname">${o.customer.name}</div><div class="k-cph">${o.customer.phone}</div></div>
    </div>
    <div class="k-items">${o.items.map(i=>`<div class="k-item"><span class="k-item-n">${i.name}</span><span class="k-item-q">×${i.qty}</span><span class="k-item-p">₹${i.price*i.qty}</span></div>`).join('')}</div>
    <div class="k-total"><span>Total</span><span class="k-total-a">₹${o.total}</span></div>
    <div class="k-acts">
      ${status==='new'
        ? `<button class="k-btn-done" onclick="event.stopPropagation();completeOrder('${o.id}')">Mark Complete</button>`
        : `<button class="k-btn-done" disabled>Completed</button>`}
      <button class="k-btn-view" onclick="event.stopPropagation();viewOrder('${o.id}')">Details</button>
    </div>
  </div>`;
}

function completeOrder(id) {
  const o = orders.find(x => x.id===id);
  if (o) { o.status = 'done'; localStorage.setItem('annamay_orders', JSON.stringify(orders)); renderKitchen(); }
  toast('Marked complete');
}

function viewOrder(id) {
  const o = orders.find(x => x.id===id); if (!o) return;
  document.getElementById('kDetPanel').innerHTML = `
    <div class="k-det-h"><div class="k-det-title">${o.id}</div>
      <button class="k-det-x" onclick="closeKDet()">×</button></div>
    <div class="k-det-s"><div class="k-det-l">Customer</div>
      <div class="k-det-v">${o.customer.name}<br>${o.customer.phone}<br>${o.customer.address}</div></div>
    <div class="k-det-s"><div class="k-det-l">Order Items</div>
      <div class="k-det-v">
        ${o.items.map(i=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.06)">
          <span>${i.name} ×${i.qty}</span><span style="color:var(--a);font-family:'DM Mono',monospace">₹${i.price*i.qty}</span></div>`).join('')}
        <div style="display:flex;justify-content:space-between;padding:12px 0 0;font-weight:700;font-size:15px;color:#fff">
          <span>Total</span><span>₹${o.total}</span></div>
      </div></div>
    <div class="k-det-s"><div class="k-det-l">Placed At</div><div class="k-det-v">${o.time}</div></div>
    ${o.status==='new' ? `<button class="k-btn-done" style="width:100%;margin-top:8px" onclick="completeOrder('${o.id}');closeKDet()">Mark as Complete</button>` : ''}`;
  document.getElementById('kDetOv').classList.add('on');
}
function closeKDet(e) {
  if (!e || e.target.id==='kDetOv') document.getElementById('kDetOv').classList.remove('on');
}

/* ═══════════════════════════════════════
   TOAST
═══════════════════════════════════════ */
let tTimer;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(tTimer); tTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

function call() { location.href = 'tel:+917523992202'; }

/* ═══════════════════════════════════════
   INIT
═══════════════════════════════════════ */
buildDots();
resetTimer();
initFeatWheel();
refreshCart();
initRoute();

/* ═══════════════════════════════════════
   AUTO OPEN/CLOSED STATUS + COPYRIGHT
═══════════════════════════════════════ */
function updateFooterStatus() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun,1=Mon...6=Sat
  const h = now.getHours();
  const m = now.getMinutes();
  const mins = h * 60 + m;

  // Hours: Mon-Fri 8AM-10PM, Sat 8AM-11PM, Sun 9AM-10PM
  let openMin, closeMin;
  if (day === 0) { openMin = 9*60;  closeMin = 22*60; }       // Sunday
  else if (day === 6) { openMin = 8*60; closeMin = 23*60; }   // Saturday
  else { openMin = 8*60; closeMin = 22*60; }                  // Mon–Fri

  const isOpen = mins >= openMin && mins < closeMin;

  const openHTML = isOpen
    ? `<span style="font-size:11px;color:var(--a);font-weight:700;">&#9679; We're Open Now!</span>
       <p style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px;">Dine-in &amp; Delivery available</p>`
    : `<span style="font-size:11px;color:#f87171;font-weight:700;">&#9679; Currently Closed</span>
       <p style="font-size:11px;color:rgba(255,255,255,.4);margin-top:4px;">We'll be back soon — see hours above</p>`;

  const closedStyle = isOpen
    ? 'background:rgba(43,191,155,.1);border:1px solid rgba(43,191,155,.2);'
    : 'background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);';

  ['openStatusBadge1','openStatusBadge2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.cssText += closedStyle; el.innerHTML = openHTML; }
  });

  // Copyright auto-year
  const yr = now.getFullYear();
  const copy = '\u00A9 ' + yr + ' Annamay Restaurant &amp; Bakery. All rights reserved.';
  ['copyrightLine1','copyrightLine2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = copy;
  });
}

updateFooterStatus();
// Refresh every minute so the badge flips exactly at open/close time
setInterval(updateFooterStatus, 60000);

/* ═══════════════════════════════════════
   GLOBAL EXPORTS — used by pwa.js
═══════════════════════════════════════ */
window.cart        = cart;
window.save        = save;
window.refreshCart = refreshCart;
window.toast       = toast;
window.openCart    = openCart;
