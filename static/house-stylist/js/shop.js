'use strict';

/* ================================================================
   SHOP CATALOG
   ================================================================ */

function _svg(inner) {
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
}

const SHOP_CATALOG = {
  items: [
    /* ── Living Room ─────────────────────────────────────── */
    {
      id: 'couch', name: 'Couch', room: 'living-room', price: 8,
      svg: _svg(`
        <rect x="4" y="30" width="56" height="22" rx="7" fill="#FF4DA6"/>
        <rect x="4" y="22" width="56" height="12" rx="5" fill="#D81B7A"/>
        <rect x="4"  y="26" width="10" height="26" rx="4" fill="#D81B7A"/>
        <rect x="50" y="26" width="10" height="26" rx="4" fill="#D81B7A"/>
        <rect x="12" y="35" width="16" height="14" rx="4" fill="#FFB3D9"/>
        <rect x="36" y="35" width="16" height="14" rx="4" fill="#FFB3D9"/>
      `)
    },
    {
      id: 'lamp', name: 'Floor Lamp', room: 'living-room', price: 4,
      svg: _svg(`
        <polygon points="22,6 42,6 38,28 26,28" fill="#FFD700"/>
        <rect x="30" y="28" width="4" height="26" rx="2" fill="#888"/>
        <ellipse cx="32" cy="56" rx="12" ry="4" fill="#555"/>
        <circle cx="32" cy="20" r="5" fill="rgba(255,255,200,0.7)"/>
      `)
    },
    {
      id: 'coffee-table', name: 'Coffee Table', room: 'living-room', price: 5,
      svg: _svg(`
        <rect x="6" y="26" width="52" height="12" rx="5" fill="#BF7F45"/>
        <rect x="6" y="26" width="52" height="5" rx="5" fill="#D4A96A"/>
        <rect x="10" y="38" width="5" height="16" rx="2" fill="#8B5E3C"/>
        <rect x="49" y="38" width="5" height="16" rx="2" fill="#8B5E3C"/>
      `)
    },
    {
      id: 'chair', name: 'Armchair', room: 'living-room', price: 6,
      svg: _svg(`
        <rect x="12" y="30" width="40" height="18" rx="6" fill="#AB47BC"/>
        <rect x="12" y="22" width="40" height="11" rx="5" fill="#7B1FA2"/>
        <rect x="12" y="26" width="8" height="22" rx="3" fill="#7B1FA2"/>
        <rect x="44" y="26" width="8" height="22" rx="3" fill="#7B1FA2"/>
        <rect x="20" y="36" width="24" height="10" rx="3" fill="#CE93D8"/>
      `)
    },
    {
      id: 'shelf', name: 'Wall Shelf', room: 'living-room', price: 5,
      svg: _svg(`
        <rect x="4"  y="28" width="56" height="8" rx="3" fill="#BF7F45"/>
        <rect x="4"  y="28" width="56" height="4" rx="3" fill="#D4A96A"/>
        <rect x="4"  y="36" width="3"  height="18" rx="2" fill="#8B5E3C"/>
        <rect x="57" y="36" width="3"  height="18" rx="2" fill="#8B5E3C"/>
        <rect x="12" y="18" width="10" height="10" rx="2" fill="#66BB6A"/>
        <rect x="27" y="20" width="6"  height="8"  rx="1" fill="#FF4DA6"/>
        <rect x="38" y="16" width="8"  height="12" rx="2" fill="#1E88E5"/>
      `)
    },
    /* ── Bedroom ─────────────────────────────────────────── */
    {
      id: 'bed', name: 'Bed', room: 'bedroom', price: 12,
      svg: _svg(`
        <rect x="4"  y="24" width="56" height="32" rx="6" fill="#1E88E5"/>
        <rect x="4"  y="24" width="56" height="10" rx="6" fill="#1565C0"/>
        <rect x="8"  y="28" width="20" height="10" rx="4" fill="white" opacity="0.85"/>
        <rect x="36" y="28" width="20" height="10" rx="4" fill="white" opacity="0.85"/>
        <rect x="8"  y="34" width="48" height="20" rx="4" fill="#90CAF9"/>
        <rect x="4"  y="52" width="8"  height="8"  rx="2" fill="#0D47A1"/>
        <rect x="52" y="52" width="8"  height="8"  rx="2" fill="#0D47A1"/>
      `)
    },
    {
      id: 'wardrobe', name: 'Wardrobe', room: 'bedroom', price: 10,
      svg: _svg(`
        <rect x="6" y="6" width="52" height="52" rx="5" fill="#8E24AA"/>
        <rect x="6" y="6" width="52" height="6"  rx="5" fill="#6A1B9A"/>
        <line x1="32" y1="12" x2="32" y2="58" stroke="#6A1B9A" stroke-width="2"/>
        <circle cx="28" cy="34" r="3" fill="#CE93D8"/>
        <circle cx="36" cy="34" r="3" fill="#CE93D8"/>
        <rect x="10" y="50" width="44" height="4" rx="2" fill="#6A1B9A"/>
      `)
    },
    {
      id: 'dresser', name: 'Dresser', room: 'bedroom', price: 8,
      svg: _svg(`
        <rect x="8" y="10" width="48" height="48" rx="5" fill="#FF4DA6"/>
        <rect x="8" y="10" width="48" height="6"  rx="5" fill="#D81B7A"/>
        <rect x="11" y="19" width="42" height="10" rx="3" fill="#D81B7A"/>
        <rect x="11" y="32" width="42" height="10" rx="3" fill="#D81B7A"/>
        <rect x="11" y="45" width="42" height="10" rx="3" fill="#D81B7A"/>
        <circle cx="32" cy="24" r="3" fill="#FFB3D9"/>
        <circle cx="32" cy="37" r="3" fill="#FFB3D9"/>
        <circle cx="32" cy="50" r="3" fill="#FFB3D9"/>
      `)
    },
    {
      id: 'nightstand', name: 'Nightstand', room: 'bedroom', price: 5,
      svg: _svg(`
        <rect x="12" y="18" width="40" height="36" rx="5" fill="#BF7F45"/>
        <rect x="12" y="18" width="40" height="6"  rx="5" fill="#D4A96A"/>
        <rect x="15" y="27" width="34" height="12" rx="3" fill="#8B5E3C"/>
        <circle cx="32" cy="33" r="3" fill="#D4A96A"/>
        <rect x="14" y="54" width="8" height="6" rx="2" fill="#6D4C41"/>
        <rect x="42" y="54" width="8" height="6" rx="2" fill="#6D4C41"/>
        <circle cx="32" cy="14" r="5" fill="#FFD700" opacity="0.8"/>
      `)
    },
    /* ── Bathroom ────────────────────────────────────────── */
    {
      id: 'toilet', name: 'Toilet', room: 'bathroom', price: 8,
      svg: _svg(`
        <rect x="14" y="8"  width="36" height="20" rx="5" fill="#E3F2FD"/>
        <rect x="14" y="8"  width="36" height="6"  rx="5" fill="#BBDEFB"/>
        <ellipse cx="32" cy="44" rx="22" ry="16" fill="#E3F2FD"/>
        <ellipse cx="32" cy="42" rx="18" ry="12" fill="#BBDEFB"/>
        <rect x="14" y="28" width="36" height="8" rx="3" fill="#90CAF9"/>
        <rect x="28" y="10" width="8"  height="4" rx="2" fill="#90CAF9"/>
      `)
    },
    {
      id: 'bathtub', name: 'Bathtub', room: 'bathroom', price: 12,
      svg: _svg(`
        <rect x="4"  y="22" width="56" height="30" rx="14" fill="#E3F2FD"/>
        <rect x="8"  y="26" width="48" height="22" rx="10" fill="#BBDEFB"/>
        <rect x="8"  y="26" width="48" height="10" rx="10" fill="#64B5F6" opacity="0.5"/>
        <rect x="48" y="14" width="8"  height="12" rx="3"  fill="#90CAF9"/>
        <circle cx="52" cy="14" r="4" fill="#42A5F5"/>
        <rect x="4"  y="48" width="8"  height="10" rx="3" fill="#BBDEFB"/>
        <rect x="52" y="48" width="8"  height="10" rx="3" fill="#BBDEFB"/>
      `)
    },
    {
      id: 'sink', name: 'Sink', room: 'bathroom', price: 7,
      svg: _svg(`
        <rect x="8"  y="14" width="48" height="8"  rx="3" fill="#90CAF9"/>
        <path d="M10,22 Q10,46 32,46 Q54,46 54,22 Z" fill="#E3F2FD"/>
        <path d="M14,22 Q14,42 32,42 Q50,42 50,22 Z" fill="#BBDEFB"/>
        <circle cx="32" cy="30" r="4" fill="#64B5F6"/>
        <rect x="28" y="4"  width="8" height="12" rx="3" fill="#90CAF9"/>
        <circle cx="32" cy="4" r="4" fill="#42A5F5"/>
        <rect x="8"  y="46" width="8" height="10" rx="2" fill="#BBDEFB"/>
        <rect x="48" y="46" width="8" height="10" rx="2" fill="#BBDEFB"/>
      `)
    },
    {
      id: 'bathroom-mirror', name: 'Mirror', room: 'bathroom', price: 5,
      svg: _svg(`
        <rect x="10" y="6" width="44" height="52" rx="8" fill="#90CAF9"/>
        <rect x="14" y="10" width="36" height="44" rx="5" fill="#E3F2FD"/>
        <ellipse cx="32" cy="32" rx="14" ry="18" fill="rgba(255,255,255,0.55)"/>
        <line x1="20" y1="22" x2="24" y2="26" stroke="white" stroke-width="2" opacity="0.7"/>
        <line x1="20" y1="28" x2="23" y2="30" stroke="white" stroke-width="2" opacity="0.5"/>
      `)
    },
    /* ── Kitchen ─────────────────────────────────────────── */
    {
      id: 'fridge', name: 'Fridge', room: 'kitchen', price: 12,
      svg: _svg(`
        <rect x="10" y="6"  width="44" height="52" rx="6" fill="#E0F2F1"/>
        <rect x="10" y="6"  width="44" height="22" rx="6" fill="#B2DFDB"/>
        <rect x="10" y="28" width="44" height="30" rx="6" fill="#E0F2F1"/>
        <rect x="10" y="26" width="44" height="4"  fill="#80CBC4"/>
        <rect x="46" y="12" width="4"  height="14" rx="2" fill="#4DB6AC"/>
        <rect x="46" y="30" width="4"  height="22" rx="2" fill="#4DB6AC"/>
      `)
    },
    {
      id: 'stove', name: 'Stove', room: 'kitchen', price: 10,
      svg: _svg(`
        <rect x="6" y="14" width="52" height="44" rx="5" fill="#CFD8DC"/>
        <rect x="6" y="14" width="52" height="8"  rx="5" fill="#B0BEC5"/>
        <circle cx="20" cy="26" r="7" fill="#90A4AE"/>
        <circle cx="44" cy="26" r="7" fill="#90A4AE"/>
        <circle cx="20" cy="26" r="3" fill="#546E7A"/>
        <circle cx="44" cy="26" r="3" fill="#546E7A"/>
        <rect x="10" y="36" width="44" height="18" rx="4" fill="#B0BEC5"/>
        <rect x="14" y="40" width="36" height="10" rx="3" fill="#90A4AE"/>
        <circle cx="54" cy="18" r="3" fill="#FF8F00"/>
      `)
    },
    {
      id: 'counter', name: 'Counter', room: 'kitchen', price: 7,
      svg: _svg(`
        <rect x="4"  y="20" width="56" height="10" rx="4" fill="#78909C"/>
        <rect x="4"  y="20" width="56" height="5"  rx="4" fill="#90A4AE"/>
        <rect x="4"  y="30" width="56" height="28" rx="4" fill="#CFD8DC"/>
        <line x1="22" y1="30" x2="22" y2="58" stroke="#B0BEC5" stroke-width="2"/>
        <line x1="42" y1="30" x2="42" y2="58" stroke="#B0BEC5" stroke-width="2"/>
        <circle cx="13" cy="44" r="3" fill="#90A4AE"/>
        <circle cx="32" cy="44" r="3" fill="#90A4AE"/>
        <circle cx="51" cy="44" r="3" fill="#90A4AE"/>
      `)
    },
    {
      id: 'kitchen-cabinet', name: 'Cabinet', room: 'kitchen', price: 6,
      svg: _svg(`
        <rect x="8" y="4"  width="48" height="56" rx="5" fill="#43A047"/>
        <rect x="8" y="4"  width="48" height="6"  rx="5" fill="#2E7D32"/>
        <rect x="8" y="32" width="48" height="3"  fill="#2E7D32"/>
        <rect x="11" y="10" width="42" height="20" rx="3" fill="#2E7D32"/>
        <rect x="11" y="35" width="42" height="22" rx="3" fill="#2E7D32"/>
        <circle cx="32" cy="22" r="3" fill="#A5D6A7"/>
        <circle cx="32" cy="47" r="3" fill="#A5D6A7"/>
      `)
    },
    /* ── Dining Room ─────────────────────────────────────── */
    {
      id: 'dining-table', name: 'Dining Table', room: 'dining-room', price: 10,
      svg: _svg(`
        <rect x="4"  y="22" width="56" height="10" rx="4" fill="#BF7F45"/>
        <rect x="4"  y="22" width="56" height="5"  rx="4" fill="#D4A96A"/>
        <rect x="8"  y="32" width="5"  height="24" rx="2" fill="#8B5E3C"/>
        <rect x="51" y="32" width="5"  height="24" rx="2" fill="#8B5E3C"/>
        <rect x="16" y="32" width="5"  height="20" rx="2" fill="#8B5E3C"/>
        <rect x="43" y="32" width="5"  height="20" rx="2" fill="#8B5E3C"/>
      `)
    },
    {
      id: 'dining-chair', name: 'Dining Chair', room: 'dining-room', price: 5,
      svg: _svg(`
        <rect x="14" y="8"  width="36" height="24" rx="5" fill="#43A047"/>
        <rect x="14" y="8"  width="36" height="8"  rx="5" fill="#2E7D32"/>
        <rect x="14" y="30" width="36" height="14" rx="4" fill="#66BB6A"/>
        <rect x="16" y="44" width="5"  height="16" rx="2" fill="#2E7D32"/>
        <rect x="43" y="44" width="5"  height="16" rx="2" fill="#2E7D32"/>
      `)
    },
    {
      id: 'buffet', name: 'Buffet', room: 'dining-room', price: 9,
      svg: _svg(`
        <rect x="4"  y="20" width="56" height="36" rx="5" fill="#BF7F45"/>
        <rect x="4"  y="20" width="56" height="8"  rx="5" fill="#D4A96A"/>
        <line x1="32" y1="28" x2="32" y2="56" stroke="#8B5E3C" stroke-width="2"/>
        <rect x="7"  y="30" width="22" height="14" rx="3" fill="#8B5E3C"/>
        <rect x="35" y="30" width="22" height="14" rx="3" fill="#8B5E3C"/>
        <circle cx="21" cy="37" r="3" fill="#D4A96A"/>
        <circle cx="43" cy="37" r="3" fill="#D4A96A"/>
        <rect x="4"  y="52" width="8"  height="6" rx="2" fill="#6D4C41"/>
        <rect x="52" y="52" width="8"  height="6" rx="2" fill="#6D4C41"/>
      `)
    },
  ],

  rooms: [
    { id: 'bedroom',     name: 'Bedroom',     emoji: '🛏',  price: 15 },
    { id: 'bathroom',    name: 'Bathroom',    emoji: '🛁',  price: 24 },
    { id: 'dining-room', name: 'Dining Room', emoji: '🍽',  price: 27 },
    { id: 'kitchen',     name: 'Kitchen',     emoji: '🍳',  price: 32 },
  ],

  paints: [
    { id: 'red',    name: 'Red',    color: '#E53935', price: 7 },
    { id: 'blue',   name: 'Blue',   color: '#1E88E5', price: 7 },
    { id: 'yellow', name: 'Yellow', color: '#FDD835', price: 7 },
    { id: 'green',  name: 'Green',  color: '#43A047', price: 7 },
    { id: 'purple', name: 'Purple', color: '#8E24AA', price: 7 },
    { id: 'orange', name: 'Orange', color: '#FB8C00', price: 7 },
    { id: 'pink',   name: 'Pink',   color: '#E91E8C', price: 7 },
    { id: 'white',  name: 'White',  color: '#F0F0F0', price: 7 },
  ],
};

/* ================================================================
   SHOP STORAGE
   ================================================================ */

// Living Room items are part of the starter set — owned by default
const _DEFAULT_ITEMS  = ['couch', 'lamp', 'coffee-table', 'chair', 'shelf'];
const _DEFAULT_ROOMS  = ['living-room'];

const ShopStorage = (() => {
  const K_COINS  = 'hs_coins';
  const K_ITEMS  = 'hs_owned_items';
  const K_ROOMS  = 'hs_owned_rooms';
  const K_PAINTS = 'hs_owned_paints';

  function load(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (_) {} // eslint-disable-line no-empty
  }

  // Coins — shared key with game.js ('hs_coins')
  function getCoins() {
    try {
      const raw = localStorage.getItem(K_COINS);
      const n   = Number(JSON.parse(raw));
      return (Number.isFinite(n) && n >= 0) ? Math.floor(n) : 0;
    } catch (_) { return 0; }
  }
  function spendCoins(n) {
    const cur = getCoins();
    if (cur < n) return false;
    save(K_COINS, cur - n);
    return true;
  }

  // Items
  function getOwnedItems() { return load(K_ITEMS, [..._DEFAULT_ITEMS]); }
  function hasItem(id)     { return getOwnedItems().includes(id); }
  function addItem(id) {
    const owned = getOwnedItems();
    if (!owned.includes(id)) { owned.push(id); save(K_ITEMS, owned); }
  }

  // Rooms
  function getOwnedRooms() { return load(K_ROOMS, [..._DEFAULT_ROOMS]); }
  function hasRoom(type)   { return getOwnedRooms().includes(type); }
  function addRoom(type) {
    const owned = getOwnedRooms();
    if (!owned.includes(type)) { owned.push(type); save(K_ROOMS, owned); }
  }

  // Paints
  function getOwnedPaints() { return load(K_PAINTS, []); }
  function hasPaint(id)     { return getOwnedPaints().includes(id); }
  function addPaint(id) {
    const owned = getOwnedPaints();
    if (!owned.includes(id)) { owned.push(id); save(K_PAINTS, owned); }
  }

  function fullReset() {
    [K_ITEMS, K_ROOMS, K_PAINTS].forEach(k => {
      try { localStorage.removeItem(k); } catch (_) {} // eslint-disable-line no-empty
    });
  }

  return {
    getCoins, spendCoins,
    getOwnedItems, hasItem, addItem,
    getOwnedRooms,  hasRoom,  addRoom,
    getOwnedPaints, hasPaint, addPaint,
    fullReset,
  };
})();

/* ================================================================
   SHOP MODULE
   ================================================================ */

const Shop = (() => {
  let _tab    = 'items'; // 'items' | 'rooms' | 'paints'
  let _filter = 'all';   // room filter for items tab

  /* ── Helpers ───────────────────────────────────────────── */

  function _coins() {
    return ShopStorage.getCoins();
  }

  function _roomLabel(roomId) {
    return ({ 'living-room': 'Living Room', bedroom: 'Bedroom',
              bathroom: 'Bathroom', kitchen: 'Kitchen',
              'dining-room': 'Dining Room' })[roomId] ?? roomId;
  }

  /* ── Card builder ──────────────────────────────────────── */
  //  Every card is always created and appended — no conditional skips.
  //
  //  states:  owned   → green ✓ overlay, no cost badge
  //           buyable → clickable, cost badge shown
  //           locked  → 🔒 overlay, cost badge shown (coins < price)

  function _card({ type, id, price, owned, mediaHtml, name, tag, extra }) {
    const coins  = _coins();
    const locked = !owned && (coins < Number(price));
    const state  = owned ? 'owned' : locked ? 'locked' : 'buyable';

    const overlay = owned
      ? '<div class="shop-overlay shop-overlay--owned">✓</div>'
      : locked
        ? '<div class="shop-overlay shop-overlay--locked">🔒</div>'
        : '';

    const badge = owned
      ? ''
      : `<div class="shop-cost-badge"><span class="gc"></span> ${price}</div>`;

    const el = document.createElement('div');
    el.className = `shop-card shop-card--${state}`;
    el.dataset.type  = type;
    el.dataset.id    = id;
    el.dataset.price = price;

    el.innerHTML =
      `<div class="shop-card-media">${mediaHtml}${overlay}${badge}</div>` +
      `<div class="shop-card-name">${name}</div>` +
      (tag   ? `<div class="shop-card-tag">${tag}</div>` : '') +
      (extra ? extra : '');

    return el;
  }

  /* ── Per-tab render functions ──────────────────────────── */

  function _renderItems(grid) {
    const list = _filter === 'all'
      ? SHOP_CATALOG.items
      : SHOP_CATALOG.items.filter(it => it.room === _filter);

    if (list.length === 0) {
      const p = document.createElement('p');
      p.className   = 'shop-empty';
      p.textContent = 'No items in this category yet!';
      grid.appendChild(p);
      return;
    }

    list.forEach(item => {
      grid.appendChild(_card({
        type:      'item',
        id:        item.id,
        price:     item.price,
        owned:     ShopStorage.hasItem(item.id),
        mediaHtml: item.svg,
        name:      item.name,
        tag:       _roomLabel(item.room),
      }));
    });
  }

  function _renderRooms(grid) {
    // Living Room — always owned (starter)
    grid.appendChild(_card({
      type:      'room',
      id:        'living-room',
      price:     0,
      owned:     true,
      mediaHtml: '<span class="shop-card-emoji">🛋</span>',
      name:      'Living Room',
      extra:     `<button class="btn shop-play-room-btn" data-room-id="living-room">▶ Play</button>`,
    }));

    SHOP_CATALOG.rooms.forEach(room => {
      const owned = ShopStorage.hasRoom(room.id);
      grid.appendChild(_card({
        type:      'room',
        id:        room.id,
        price:     room.price,
        owned,
        mediaHtml: `<span class="shop-card-emoji">${room.emoji}</span>`,
        name:      room.name,
        extra:     owned
          ? `<button class="btn shop-play-room-btn" data-room-id="${room.id}">▶ Play</button>`
          : '',
      }));
    });
  }

  function _renderPaints(grid) {
    SHOP_CATALOG.paints.forEach(paint => {
      grid.appendChild(_card({
        type:      'paint',
        id:        paint.id,
        price:     paint.price,
        owned:     ShopStorage.hasPaint(paint.id),
        mediaHtml: `<div class="shop-swatch-circle" style="background:${paint.color}"></div>`,
        name:      paint.name,
      }));
    });
  }

  /* ── Core render ───────────────────────────────────────── */

  function _render() {
    const grid = document.getElementById('shop-grid');
    if (!grid) {
      console.error('[Shop] #shop-grid element not found in DOM');
      return;
    }

    grid.innerHTML = '';

    if (_tab === 'items')  _renderItems(grid);
    if (_tab === 'rooms')  _renderRooms(grid);
    if (_tab === 'paints') _renderPaints(grid);

    // Guard: log if nothing rendered
    if (grid.children.length === 0) {
      console.error('[Shop] _render() completed but grid is empty — tab:', _tab, 'filter:', _filter);
    }

    // Sync coin display
    const coinEl = document.getElementById('shop-coin-count');
    if (coinEl) coinEl.textContent = _coins();
  }

  /* ── Tab & filter UI sync ──────────────────────────────── */

  function _syncTabUI() {
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === _tab);
    });
    const bar = document.getElementById('shop-filter-bar');
    if (bar) bar.hidden = (_tab !== 'items');
  }

  function _syncFilterUI() {
    document.querySelectorAll('.shop-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === _filter);
    });
  }

  /* ── Public API ────────────────────────────────────────── */

  function open() {
    const raw = localStorage.getItem('hs_coins');
    console.log('[Shop] open — hs_coins raw:', raw, '→ parsed:', _coins());
    _tab    = 'items';
    _filter = 'all';
    _syncTabUI();
    _syncFilterUI();
    _render();
  }

  function refresh() {
    _syncTabUI();
    _syncFilterUI();
    _render();
  }

  /* ── Buy handler ───────────────────────────────────────── */

  function _handleBuy(card) {
    const { type, id, price: priceStr } = card.dataset;
    const price = parseInt(priceStr, 10);

    if (isNaN(price) || price < 0) return;
    if (!ShopStorage.spendCoins(price)) return; // not enough coins

    if (type === 'item')  ShopStorage.addItem(id);
    if (type === 'room')  ShopStorage.addRoom(id);
    if (type === 'paint') ShopStorage.addPaint(id);

    // Sync game coin counter if visible
    const gameCoin = document.getElementById('game-coin-count');
    if (gameCoin) gameCoin.textContent = _coins();

    _render();
  }

  /* ── Event wiring (once, on DOMContentLoaded) ──────────── */

  function wireEvents() {
    // Tab buttons
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _tab = btn.dataset.tab;
        _syncTabUI();
        _render();
      });
    });

    // Filter pills
    document.querySelectorAll('.shop-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _filter = btn.dataset.filter;
        _syncFilterUI();
        _render();
      });
    });

    // Delegated grid clicks (survives innerHTML resets)
    const grid = document.getElementById('shop-grid');
    if (!grid) { console.error('[Shop] wireEvents: #shop-grid not found'); return; }

    grid.addEventListener('click', e => {
      // Play Room button
      const playBtn = e.target.closest('.shop-play-room-btn');
      if (playBtn) {
        if (typeof openRoomDetail === 'function') openRoomDetail(playBtn.dataset.roomId);
        return;
      }
      // Buy card
      const card = e.target.closest('.shop-card--buyable');
      if (card) _handleBuy(card);
    });
  }

  return { open, refresh, wireEvents };
})();

document.addEventListener('DOMContentLoaded', () => Shop.wireEvents());
