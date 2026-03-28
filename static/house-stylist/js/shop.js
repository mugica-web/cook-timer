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

  // Coins — shared key with game.js
  function getCoins()    { return load(K_COINS, 0); }
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
  let _backTarget = 'screen-home';
  let _activeTab  = 'items';
  let _itemFilter = 'all';

  /* ── Public: open the shop ─────────────────────────────── */
  function open(backTarget) {
    _backTarget = backTarget || 'screen-home';
    _activeTab  = 'items';
    _itemFilter = 'all';
    _updateCoinDisplay();
    _activateTab('items');
    _setFilter('all');
  }

  /* ── Coin display ──────────────────────────────────────── */
  function _updateCoinDisplay() {
    const el = document.getElementById('shop-coin-count');
    if (el) el.textContent = ShopStorage.getCoins();
  }

  /* ── Tab switching ─────────────────────────────────────── */
  function _activateTab(tab) {
    _activeTab = tab;
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    const filterBar = document.getElementById('shop-filter-bar');
    if (filterBar) filterBar.hidden = (tab !== 'items');
    _renderGrid();
  }

  /* ── Filter ────────────────────────────────────────────── */
  function _setFilter(filter) {
    _itemFilter = filter;
    document.querySelectorAll('.shop-filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    _renderGrid();
  }

  /* ── Grid rendering ────────────────────────────────────── */
  function _renderGrid() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return;
    grid.innerHTML = '';

    if (_activeTab === 'items')  _renderItems(grid);
    if (_activeTab === 'rooms')  _renderRooms(grid);
    if (_activeTab === 'paints') _renderPaints(grid);
  }

  function _card(children) {
    const el = document.createElement('div');
    el.className = 'shop-card';
    el.innerHTML = children;
    return el;
  }

  function _buyBtn(type, id, price, coins) {
    const canAfford = coins >= price;
    return `<span class="shop-price">🪙 ${price}</span>
            <button class="btn shop-buy-btn${canAfford ? '' : ' cant-afford'}"
                    data-type="${type}" data-id="${id}" data-price="${price}">
              Buy
            </button>`;
  }

  function _ownedBadge() {
    return '<span class="shop-badge-owned">Owned ✓</span>';
  }

  function _renderItems(grid) {
    const coins = ShopStorage.getCoins();
    const list  = _itemFilter === 'all'
      ? SHOP_CATALOG.items
      : SHOP_CATALOG.items.filter(it => it.room === _itemFilter);

    list.forEach(item => {
      const owned = ShopStorage.hasItem(item.id);
      const card  = _card(`
        <div class="shop-card-thumb">${item.svg}</div>
        <div class="shop-card-name">${item.name}</div>
        <div class="shop-card-tag">${_roomLabel(item.room)}</div>
        <div class="shop-card-bottom">
          ${owned ? _ownedBadge() : _buyBtn('item', item.id, item.price, coins)}
        </div>
      `);
      grid.appendChild(card);
    });

    if (list.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'shop-empty';
      msg.textContent = 'No items in this category yet!';
      grid.appendChild(msg);
    }
  }

  function _playRoomBtn(roomId) {
    return `<button class="btn shop-play-room-btn" data-room-id="${roomId}">▶ Play</button>`;
  }

  function _renderRooms(grid) {
    const coins = ShopStorage.getCoins();

    // Living Room — always owned (starter)
    grid.appendChild(_card(`
      <div class="shop-card-room-icon">🛋</div>
      <div class="shop-card-name">Living Room</div>
      <div class="shop-card-bottom">
        ${_ownedBadge()}
        ${_playRoomBtn('living-room')}
      </div>
    `));

    SHOP_CATALOG.rooms.forEach(room => {
      const owned = ShopStorage.hasRoom(room.id);
      grid.appendChild(_card(`
        <div class="shop-card-room-icon">${room.emoji}</div>
        <div class="shop-card-name">${room.name}</div>
        <div class="shop-card-bottom">
          ${owned
            ? `${_ownedBadge()} ${_playRoomBtn(room.id)}`
            : _buyBtn('room', room.id, room.price, coins)
          }
        </div>
      `));
    });
  }

  function _renderPaints(grid) {
    const coins = ShopStorage.getCoins();
    SHOP_CATALOG.paints.forEach(paint => {
      const owned = ShopStorage.hasPaint(paint.id);
      grid.appendChild(_card(`
        <div class="shop-card-swatch" style="background:${paint.color}"></div>
        <div class="shop-card-name">${paint.name}</div>
        <div class="shop-card-bottom">
          ${owned ? _ownedBadge() : _buyBtn('paint', paint.id, paint.price, coins)}
        </div>
      `));
    });
  }

  function _roomLabel(roomId) {
    return ({
      'living-room': 'Living Room',
      'bedroom':     'Bedroom',
      'bathroom':    'Bathroom',
      'kitchen':     'Kitchen',
      'dining-room': 'Dining Room',
    })[roomId] ?? roomId;
  }

  /* ── Buy handler ───────────────────────────────────────── */
  function _handleBuy(btn) {
    const type  = btn.dataset.type;
    const id    = btn.dataset.id;
    const price = parseInt(btn.dataset.price, 10);

    if (!ShopStorage.spendCoins(price)) return; // race-condition guard

    if (type === 'item')  ShopStorage.addItem(id);
    if (type === 'room')  ShopStorage.addRoom(id);
    if (type === 'paint') ShopStorage.addPaint(id);

    _updateCoinDisplay();
    // Also sync game coin counter if the game screen is open
    const gameCoin = document.getElementById('game-coin-count');
    if (gameCoin) gameCoin.textContent = ShopStorage.getCoins();

    _renderGrid(); // re-render so bought cards show "Owned"
  }

  /* ── Wire DOM events (called once on DOMContentLoaded) ─── */
  function wireEvents() {
    // Tab buttons
    document.querySelectorAll('.shop-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => _activateTab(btn.dataset.tab));
    });

    // Filter pills
    document.querySelectorAll('.shop-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => _setFilter(btn.dataset.filter));
    });

    // Grid clicks — delegated so it works after re-renders
    document.getElementById('shop-grid')?.addEventListener('click', e => {
      // Play Room button → open room detail
      const playBtn = e.target.closest('.shop-play-room-btn');
      if (playBtn) {
        if (typeof openRoomDetail === 'function') openRoomDetail(playBtn.dataset.roomId);
        return;
      }
      // Buy button
      const buyBtn = e.target.closest('.shop-buy-btn');
      if (buyBtn && !buyBtn.disabled) _handleBuy(buyBtn);
    });
  }

  return { open, wireEvents };
})();

document.addEventListener('DOMContentLoaded', () => Shop.wireEvents());
