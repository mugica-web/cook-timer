'use strict';

/**
 * House Stylist — Game Module
 *
 * Responsibilities:
 *   • Room canvas rendering (dollhouse cross-section)
 *   • Countdown timer
 *   • Item drag-and-drop, floor/wall snapping, collision detection
 *   • Coin scoring (time bonus, walkability, extra items)
 *   • localStorage persistence (coins, house progress)
 *   • House-completion tracking and bonus award
 */
const Game = (() => {

  /* ================================================================
     ROOM GEOMETRY
     ================================================================ */
  const FLOOR_H   = 90;  // px — floor panel height
  const SIDE_W    = 44;  // px — each side-wall panel width
  const CEILING_H = 18;  // px — ceiling strip height (used for paint target detection)

  /* ================================================================
     HOUSE REQUIREMENTS
     isHouseComplete() checks completedRooms array against these.
     ================================================================ */
  const HOUSE_REQS = {
    'living-room': 1,
    'bedroom':     3,
    'bathroom':    2,
    'kitchen':     1,
    'dining-room': 1,
  };

  function isHouseComplete(rooms) {
    const counts = rooms.reduce((acc, r) => {
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(HOUSE_REQS).every(([type, need]) => (counts[type] || 0) >= need);
  }

  /* ================================================================
     STORAGE  (localStorage wrapper)
     ================================================================ */
  const Storage = (() => {
    const K_COINS  = 'hs_coins';
    const K_ROOMS  = 'hs_current_house';   // JSON array of room-type strings
    const K_HOUSES = 'hs_houses_done';

    function load(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch { return fallback; }
    }
    function save(key, val) {
      try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage unavailable */ }
    }

    return {
      getCoins:       ()  => load(K_COINS, 0),
      setCoins:       (n) => save(K_COINS, n),
      addCoins:       (n) => {
        const t = load(K_COINS, 0) + n;
        save(K_COINS, t);
        return t;
      },
      getHouseRooms:  ()      => load(K_ROOMS, []),
      pushRoom:       (type)  => {
        const rooms = load(K_ROOMS, []);
        rooms.push(type);
        save(K_ROOMS, rooms);
        return rooms;
      },
      clearHouseRooms: ()     => save(K_ROOMS, []),
      getHousesDone:  ()      => load(K_HOUSES, 0),
      incHousesDone:  ()      => {
        const n = load(K_HOUSES, 0) + 1;
        save(K_HOUSES, n);
        return n;
      },
      fullReset: () => {
        [K_COINS, K_ROOMS, K_HOUSES].forEach(k => {
          try { localStorage.removeItem(k); } catch { /* ignore */ }
        });
        // Also wipe shop purchases (items, rooms, paints)
        if (typeof ShopStorage !== 'undefined') ShopStorage.fullReset();
      },
    };
  })();

  /* ================================================================
     SCORING ENGINE
     ================================================================ */

  /**
   * Calculate the fraction of usable floor width that is clear of items.
   * All floor-snapped items prevent overlap by design, so their widths
   * add directly without double-counting.
   */
  function calcFloorClear(canvasW, items) {
    const usable = canvasW - 2 * SIDE_W;
    if (usable <= 0) return 1;
    const occupied = items
      .filter(p => !p.item.wallMounted)
      .reduce((sum, p) => sum + p.w, 0);
    return Math.max(0, (usable - occupied) / usable);
  }

  /**
   * Calculate the room score and a breakdown for display.
   * Returns { total, timeBonus, extraBonus, walkBonus, pass }
   *
   * Rules:
   *  • < 5 items placed → 10 coins (minimum), pass = false
   *  • < 30% floor clear → 10 coins (minimum), pass = false
   *  • Base 40 coins for meeting requirements
   *  • Up to +30 for speed   (0 left = 0, full time left = 30)
   *  • Up to +15 for extras  (+5 per item beyond 5, capped at 3 extras)
   *  • Up to +15 for space   (scales from 30% to 60%+ clear)
   *  • Final clamped [10, 100]
   */
  function calcScore(floorClearPct, items) {
    const count    = items.length;
    const minItems = (ROOM_DEFINITIONS[currentRoomType] || {}).minItems || 5;

    if (count < minItems || floorClearPct < 0.30) {
      return { total: 10, timeBonus: 0, extraBonus: 0, walkBonus: 0, pass: false, minItems };
    }

    const timeBonus  = Math.round((timeLeft / 120) * 30);
    const extraBonus = Math.min(15, Math.max(0, count - minItems) * 5);
    const walkBonus  = Math.round(
      Math.min(15, Math.max(0, (floorClearPct - 0.30) / 0.30 * 15))
    );
    const total = Math.max(10, Math.min(100, 40 + timeBonus + extraBonus + walkBonus));

    return { total, timeBonus, extraBonus, walkBonus, pass: true, minItems };
  }

  /* ================================================================
     ITEM DEFINITIONS  —  Living Room
     ================================================================ */

  function svg(viewBox, inner) {
    return `<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg>`;
  }

  /* 3-D box: top face (lighter), right side face (darker), front face (base color) + emoji label */
  function box3d(w, h, color, emoji) {
    const DX = Math.round(Math.min(w * 0.20, 30));
    const DY = Math.round(Math.min(h * 0.22, 26));
    const fw = w - DX; const fh = h - DY;
    const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
    const clamp = v => Math.max(0, Math.min(255, v));
    const top  = `rgb(${clamp(r+65)},${clamp(g+65)},${clamp(b+65)})`;
    const side = `rgb(${clamp(r-50)},${clamp(g-50)},${clamp(b-50)})`;
    const fs = Math.max(10, Math.min(fh * 0.45, 24));
    return svg(`0 0 ${w} ${h}`, `
      <polygon points="0,${DY} ${fw},${DY} ${w},0 ${DX},0" fill="${top}"/>
      <polygon points="${fw},${DY} ${w},0 ${w},${h-DY} ${fw},${h}" fill="${side}"/>
      <rect x="0" y="${DY}" width="${fw}" height="${fh}" fill="${color}"/>
      <text x="${fw/2}" y="${DY + fh*0.52}" text-anchor="middle" dominant-baseline="central"
            font-size="${fs}" font-family="system-ui,sans-serif">${emoji}</text>
    `);
  }

  const SVG = {
    couch:          box3d(200, 82,  '#8D6E63', '🛋'),
    lamp:           box3d( 38, 115, '#F9A825', '💡'),
    coffeeTable:    box3d(135, 52,  '#6D4C41', '☕'),
    chair:          box3d( 78, 88,  '#A1887F', '🪑'),
    shelf:          box3d(120, 30,  '#795548', '📚'),
    bed:            box3d(180, 100, '#1565C0', '🛏'),
    wardrobe:       box3d(100, 130, '#7B1FA2', '👗'),
    dresser:        box3d( 90, 80,  '#E91E8C', '💄'),
    nightstand:     box3d( 55, 70,  '#BF7F45', '🕯'),
    toilet:         box3d( 60, 85,  '#64B5F6', '🚽'),
    bathtub:        box3d(150, 70,  '#29B6F6', '🛁'),
    bathroomSink:   box3d( 65, 70,  '#0288D1', '🚿'),
    bathroomMirror: box3d( 80, 60,  '#78909C', '🪞'),
    fridge:         box3d( 70, 130, '#546E7A', '❄️'),
    stove:          box3d( 90, 95,  '#37474F', '🍳'),
    counter:        box3d(130, 70,  '#607D8B', '🔪'),
    kitchenCabinet: box3d( 90, 60,  '#2E7D32', '🍽'),
    diningTable:    box3d(160, 75,  '#8B5E3C', '🍽'),
    diningChair:    box3d( 60, 80,  '#D84315', '🪑'),
    buffet:         box3d(130, 75,  '#5D4037', '🍾'),
  };

  /* ── Paint bucket SVG (per-color) ──────────────────────── */
  function paintBucketSVG(color) {
    return svg('0 0 40 55', `
      <path d="M12,10 Q20,5 28,10" fill="none" stroke="#888" stroke-width="3" stroke-linecap="round"/>
      <path d="M6,16 Q4,50 20,52 Q36,50 34,16 Z" fill="${color}"/>
      <ellipse cx="20" cy="16" rx="14" ry="4" fill="${color}"/>
      <ellipse cx="20" cy="16" rx="14" ry="4" fill="rgba(0,0,0,0.15)"/>
      <ellipse cx="14" cy="24" rx="5"  ry="7" fill="rgba(255,255,255,0.28)"/>
      <rect x="4" y="50" width="32" height="4" rx="2" fill="#555" opacity="0.3"/>`);
  }

  const LIVING_ROOM_ITEMS = [
    { id: 'couch',        name: 'Couch',        w: 200, h: 82,  tw: 134, th: 55, wallMounted: false, svg: SVG.couch },
    { id: 'lamp',         name: 'Floor Lamp',   w:  38, h: 115, tw:  25, th: 77, wallMounted: false, svg: SVG.lamp  },
    { id: 'coffee-table', name: 'Coffee Table', w: 135, h: 52,  tw:  90, th: 35, wallMounted: false, svg: SVG.coffeeTable },
    { id: 'chair-1',      name: 'Chair',        w:  78, h: 88,  tw:  52, th: 59, wallMounted: false, svg: SVG.chair },
    { id: 'chair-2',      name: 'Chair',        w:  78, h: 88,  tw:  52, th: 59, wallMounted: false, svg: SVG.chair },
    { id: 'shelf',        name: 'Wall Shelf',   w: 120, h: 30,  tw:  80, th: 20, wallMounted: true,  svg: SVG.shelf },
  ];

  const BEDROOM_ITEMS = [
    { id: 'bed',        name: 'Bed',        w: 180, h: 100, tw: 120, th: 67, wallMounted: false, svg: SVG.bed },
    { id: 'wardrobe',   name: 'Wardrobe',   w: 100, h: 130, tw:  67, th: 87, wallMounted: false, svg: SVG.wardrobe },
    { id: 'dresser',    name: 'Dresser',    w:  90, h:  80, tw:  60, th: 53, wallMounted: false, svg: SVG.dresser },
    { id: 'nightstand', name: 'Nightstand', w:  55, h:  70, tw:  37, th: 47, wallMounted: false, svg: SVG.nightstand },
  ];

  const BATHROOM_ITEMS = [
    { id: 'toilet',          name: 'Toilet',  w:  60, h:  85, tw:  40, th: 57, wallMounted: false, svg: SVG.toilet },
    { id: 'bathtub',         name: 'Bathtub', w: 150, h:  70, tw: 100, th: 47, wallMounted: false, svg: SVG.bathtub },
    { id: 'sink',            name: 'Sink',    w:  65, h:  70, tw:  43, th: 47, wallMounted: false, svg: SVG.bathroomSink },
    { id: 'bathroom-mirror', name: 'Mirror',  w:  80, h:  60, tw:  53, th: 40, wallMounted: true,  svg: SVG.bathroomMirror },
  ];

  const KITCHEN_ITEMS = [
    { id: 'fridge',          name: 'Fridge',   w:  70, h: 130, tw:  47, th: 87, wallMounted: false, svg: SVG.fridge },
    { id: 'stove',           name: 'Stove',    w:  90, h:  95, tw:  60, th: 63, wallMounted: false, svg: SVG.stove },
    { id: 'counter',         name: 'Counter',  w: 130, h:  70, tw:  87, th: 47, wallMounted: false, svg: SVG.counter },
    { id: 'kitchen-cabinet', name: 'Cabinet',  w:  90, h:  60, tw:  60, th: 40, wallMounted: true,  svg: SVG.kitchenCabinet },
  ];

  const DINING_ROOM_ITEMS = [
    { id: 'dining-table',   name: 'Dining Table', w: 160, h: 75, tw: 107, th: 50, wallMounted: false, svg: SVG.diningTable },
    { id: 'dining-chair-1', name: 'Chair',        w:  60, h: 80, tw:  40, th: 53, wallMounted: false, svg: SVG.diningChair },
    { id: 'dining-chair-2', name: 'Chair',        w:  60, h: 80, tw:  40, th: 53, wallMounted: false, svg: SVG.diningChair },
    { id: 'buffet',         name: 'Buffet',       w: 130, h: 75, tw:  87, th: 50, wallMounted: false, svg: SVG.buffet },
  ];

  /* ── Paint color definitions ────────────────────────────── */
  const PAINT_COLORS = {
    red:    { name: 'Red',    color: '#E53935' },
    blue:   { name: 'Blue',   color: '#1E88E5' },
    yellow: { name: 'Yellow', color: '#FDD835' },
    green:  { name: 'Green',  color: '#43A047' },
    purple: { name: 'Purple', color: '#8E24AA' },
    orange: { name: 'Orange', color: '#FB8C00' },
    pink:   { name: 'Pink',   color: '#E91E8C' },
    white:  { name: 'White',  color: '#F0F0F0' },
  };

  function makePaintItem(colorId, def) {
    return {
      id:          `paint-${colorId}`,
      name:        `${def.name} Paint`,
      w: 40, h: 55, tw: 30, th: 40,
      wallMounted: false,
      isPaint:     true,
      paintColor:  def.color,
      svg:         paintBucketSVG(def.color),
    };
  }

  /* ── Room definitions ───────────────────────────────────── */
  const ROOM_DEFINITIONS = {
    'living-room': { name: 'Living Room', emoji: '🛋', minItems: 5, items: LIVING_ROOM_ITEMS },
    'bedroom':     { name: 'Bedroom',     emoji: '🛏', minItems: 4, items: BEDROOM_ITEMS     },
    'bathroom':    { name: 'Bathroom',    emoji: '🛁', minItems: 4, items: BATHROOM_ITEMS    },
    'kitchen':     { name: 'Kitchen',     emoji: '🍳', minItems: 4, items: KITCHEN_ITEMS     },
    'dining-room': { name: 'Dining Room', emoji: '🍽', minItems: 4, items: DINING_ROOM_ITEMS },
  };

  /**
   * Build the tray item list for a given room type.
   * Living Room items are always included (starter-owned).
   * Other rooms only include items the player has purchased.
   * Owned paint buckets are appended at the end.
   */
  function getItemsForRoom(roomType) {
    const roomDef = ROOM_DEFINITIONS[roomType];
    if (!roomDef) return [];

    let items;
    if (roomType === 'living-room') {
      items = roomDef.items; // always available
    } else {
      const owned = (typeof ShopStorage !== 'undefined')
        ? ShopStorage.getOwnedItems()
        : [];
      // dining-chair-1 and dining-chair-2 both count if 'dining-chair' is owned
      items = roomDef.items.filter(it => {
        const shopId = it.id.replace(/-[12]$/, ''); // strip -1/-2 suffix
        return owned.includes(shopId);
      });
    }

    // Append owned paint buckets
    if (typeof ShopStorage !== 'undefined') {
      const paints = ShopStorage.getOwnedPaints();
      const paintItems = paints
        .map(cid => PAINT_COLORS[cid] ? makePaintItem(cid, PAINT_COLORS[cid]) : null)
        .filter(Boolean);
      items = items.concat(paintItems);
    }

    return items;
  }

  /* ================================================================
     STATE
     ================================================================ */
  let timeLeft          = 120;
  let timerInterval     = null;
  let placedItems       = [];     // P1 placed items
  let placedItems2      = [];     // P2 placed items (2p-same mode)
  let dragState         = null;   // P1 active drag
  let dragState2        = null;   // P2 active drag (2p-same mode)
  let currentRoomType   = 'living-room';
  let initialized       = false;  // buttons & drag listeners attached once
  let _pendingGameReset = false;  // true after 5th house — reset fires on Continue click
  let _2pWinnerShown    = false;  // prevent duplicate winner overlay (same-device)
  let _localFinished    = false;  // true once local player wins (two-devices)
  let _netEventsWired   = false;  // two-devices network listener attached

  /* ================================================================
     DOM REFS  (re-resolved every init call)
     ================================================================ */
  let elCanvas, elTray, elTimerDisplay, elRoomName, elCoinCounter;
  let elCanvas2, elTray2;
  let elOverlayTimeup, elOverlayComplete, elOverlayHouse;
  let elOverlay2pWinner, elOverlay2pNet;

  /* ================================================================
     PUBLIC: init  — called by App each time the game screen opens
     ================================================================ */
  function init() {
    elCanvas          = document.getElementById('room-canvas');
    elTray            = document.getElementById('items-tray');
    elTimerDisplay    = document.getElementById('timer-display');
    elRoomName        = document.getElementById('room-name');
    elOverlayTimeup   = document.getElementById('overlay-timesup');
    elOverlayComplete = document.getElementById('overlay-complete');
    elOverlayHouse    = document.getElementById('overlay-house-complete');
    elOverlay2pWinner = document.getElementById('overlay-2p-winner');
    elOverlay2pNet    = document.getElementById('overlay-2p-net');
    elCanvas2         = document.getElementById('room-canvas-p2');
    elTray2           = document.getElementById('items-tray-p2');

    if (!elCanvas) return;

    // Show/hide panels based on game mode
    const is2pSame = typeof GameState !== 'undefined' && GameState.mode === '2p-same';
    const panel2   = document.getElementById('panel-p2');
    const p1Label  = document.getElementById('p1-label');
    if (panel2)  panel2.hidden  = !is2pSame;
    if (p1Label) p1Label.hidden = !is2pSame;

    // Inject persistent coin counter into the header (once)
    if (!document.getElementById('coin-counter')) {
      const cc = document.createElement('div');
      cc.id        = 'coin-counter';
      cc.className = 'coin-counter';
      cc.innerHTML = `🪙 <span id="coin-counter-val">${Storage.getCoins()}</span>`;
      document.querySelector('.game-header-right')?.appendChild(cc);
      elCoinCounter = document.getElementById('coin-counter-val');
    } else {
      elCoinCounter = document.getElementById('coin-counter-val');
      elCoinCounter.textContent = Storage.getCoins();
    }

    if (!initialized) {
      initialized = true;
      wireButtons();
      setupGlobalDragListeners();
    }

    // Wire network events for two-devices mode (once per session)
    const is2pNet = typeof GameState !== 'undefined' && GameState.mode === '2p-two-devices';
    if (is2pNet && GameState.multiplayerConn && !_netEventsWired) {
      _netEventsWired = true;
      GameState.multiplayerConn.on('data', handleNetMessage);
    }

    resetGame();
  }

  /* ================================================================
     BUTTON WIRING  (called once)
     ================================================================ */
  function wireButtons() {
    document.getElementById('btn-restart')
      ?.addEventListener('click', resetGame);

    document.getElementById('btn-finish')
      ?.addEventListener('click', finishRoom);

    document.getElementById('btn-restart-timesup')
      ?.addEventListener('click', resetGame);

    // Score overlay buttons
    document.getElementById('btn-go-to-shop')?.addEventListener('click', () => {
      elOverlayComplete.hidden = true;
      if (typeof openShop === 'function') openShop('screen-game');
      else if (typeof ScreenManager !== 'undefined') ScreenManager.show('screen-home');
    });

    document.getElementById('btn-next-room')?.addEventListener('click', () => {
      elOverlayComplete.hidden = true;
      requestAdvance();
    });

    // 2P same-device winner overlay
    document.getElementById('btn-2p-next')?.addEventListener('click', () => {
      if (elOverlay2pWinner) elOverlay2pWinner.hidden = true;
      requestAdvance();
    });

    // 2P network result overlay
    document.getElementById('btn-net-next')?.addEventListener('click', () => {
      if (elOverlay2pNet) elOverlay2pNet.hidden = true;
      requestAdvance();
    });

    // House-complete overlay button
    document.getElementById('btn-house-continue')?.addEventListener('click', () => {
      elOverlayHouse.hidden = true;
      if (_pendingGameReset) {
        _pendingGameReset = false;
        Storage.fullReset();                                         // clears coins + shop data
        if (elCoinCounter) elCoinCounter.textContent = '0';
        if (typeof onFullReset === 'function') onFullReset();
        else if (typeof ScreenManager !== 'undefined') ScreenManager.show('screen-home');
      } else {
        requestAdvance();
      }
    });
  }

  /* ================================================================
     GAME FLOW
     ================================================================ */

  function resetGame() {
    stopTimer();
    _2pWinnerShown = false;
    _localFinished = false;

    placedItems.forEach(p => p.el.remove());
    placedItems = [];
    dragState = null;

    // Reset P2 state if in split-screen mode
    if (typeof GameState !== 'undefined' && GameState.mode === '2p-same') {
      placedItems2.forEach(p => p.el.remove());
      placedItems2 = [];
      dragState2 = null;
    }

    elOverlayTimeup.hidden   = true;
    elOverlayComplete.hidden = true;
    if (elOverlayHouse)       elOverlayHouse.hidden       = true;
    if (elOverlay2pWinner)    elOverlay2pWinner.hidden    = true;
    if (elOverlay2pNet)       elOverlay2pNet.hidden       = true;

    // In 2p-same mode, hide Finish button (win is auto-detected)
    const finishBtn = document.getElementById('btn-finish');
    if (finishBtn) finishBtn.hidden = (typeof GameState !== 'undefined' && GameState.mode === '2p-same');

    const roomDef = ROOM_DEFINITIONS[currentRoomType] || ROOM_DEFINITIONS['living-room'];
    elRoomName.textContent = roomDef.name;

    resetWallColors();
    const items = getItemsForRoom(currentRoomType);
    renderTray(items, elTray, elCanvas, placedItems);
    if (typeof GameState !== 'undefined' && GameState.mode === '2p-same' && elTray2) {
      renderTray(items, elTray2, elCanvas2, placedItems2);
    }

    timeLeft = 120;
    updateTimerDisplay();
    startTimer();
  }

  function resetWallColors() {
    [elCanvas, elCanvas2].filter(Boolean).forEach(canvas => {
      ['.room-left-panel', '.room-right-panel', '.room-ceiling', '.room-floor'].forEach(sel => {
        const el = canvas.querySelector(sel);
        if (el) el.style.background = '';
      });
      canvas.style.background = '';
    });
  }

  /** Called when player presses ✓ Finish */
  function finishRoom() {
    stopTimer();

    const canvasW       = elCanvas.getBoundingClientRect().width;
    const floorClearPct = calcFloorClear(canvasW, placedItems);
    const score         = calcScore(floorClearPct, placedItems);

    // Persist coins and room progress
    const newTotal       = Storage.addCoins(score.total);
    const completedRooms = Storage.pushRoom(currentRoomType);

    // Update live coin counter
    if (elCoinCounter) elCoinCounter.textContent = newTotal;

    // Two-devices 2P: if player passes, they win; notify peer
    if (typeof GameState !== 'undefined' && GameState.mode === '2p-two-devices'
        && GameState.multiplayerConn && score.pass && !_localFinished) {
      _localFinished = true;
      try { GameState.multiplayerConn.send({ type: 'finish', score: score.total }); } catch (_) {}
      show2pNetResult(true, score.total);
      return;
    }

    if (isHouseComplete(completedRooms)) {
      const housesNow  = Storage.incHousesDone();
      Storage.clearHouseRooms();
      const afterBonus = Storage.addCoins(500);
      if (elCoinCounter) elCoinCounter.textContent = afterBonus;

      if (housesNow >= 5) {
        // 5th house — flag the reset; it fires when the player clicks Continue
        _pendingGameReset = true;
        showHouseCompleteOverlay(score.total, afterBonus, true);
      } else {
        showHouseCompleteOverlay(score.total, afterBonus, false);
      }
    } else {
      showRoomCompleteOverlay(score, newTotal, floorClearPct);
    }
  }

  function showTimeUp() {
    stopTimer();
    elOverlayTimeup.hidden = false;
  }

  /**
   * Advance to the next room in the house sequence.
   * Currently always re-starts Living Room; will route to other
   * room types as they are built in later prompts.
   */
  function advanceRoom() {
    const done   = Storage.getHouseRooms();
    const counts = done.reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});
    const owned  = (typeof ShopStorage !== 'undefined')
      ? ShopStorage.getOwnedRooms()
      : ['living-room'];

    const ROOM_ORDER = ['living-room', 'bedroom', 'bathroom', 'kitchen', 'dining-room'];
    for (const type of ROOM_ORDER) {
      const need = HOUSE_REQS[type] || 0;
      if ((counts[type] || 0) < need && owned.includes(type)) {
        currentRoomType = type;
        resetGame();
        return;
      }
    }
    // All owned rooms satisfied — loop back to living room
    currentRoomType = 'living-room';
    resetGame();
  }

  /** Call onRoomAdvance hook (set by app.js) or fall back to advanceRoom(). */
  function requestAdvance() {
    if (typeof onRoomAdvance === 'function') onRoomAdvance();
    else advanceRoom();
  }

  /* ================================================================
     OVERLAY POPULATION
     ================================================================ */

  function showRoomCompleteOverlay(score, total, floorClearPct) {
    const count = placedItems.length;

    // Items check
    const minItems = score.minItems || 5;
    const itemsEl  = document.getElementById('score-items-val');
    itemsEl.textContent = count >= minItems ? `${count} ✓` : `${count} ✗  (need ${minItems})`;
    itemsEl.className   = `score-row-val ${count >= minItems ? 'pass' : 'fail'}`;

    // Floor check
    const floorPct  = Math.round(floorClearPct * 100);
    const floorEl   = document.getElementById('score-floor-val');
    floorEl.textContent = `${floorPct}% ${floorClearPct >= 0.30 ? '✓' : '✗'}`;
    floorEl.className   = `score-row-val ${floorClearPct >= 0.30 ? 'pass' : 'fail'}`;

    // Bonuses (shown even when 0)
    document.getElementById('score-time-val').textContent  = `+${score.timeBonus}`;
    document.getElementById('score-extra-val').textContent = `+${score.extraBonus}`;

    // Big coin display
    document.getElementById('score-coins-earned').textContent = score.total;
    document.getElementById('score-total-coins').textContent  = total;

    // Emoji based on score tier
    const emoji = score.total >= 80 ? '🌟' : score.total >= 60 ? '🎉' : score.total >= 40 ? '😊' : '😅';
    document.getElementById('score-emoji').textContent = emoji;

    elOverlayComplete.hidden = false;
  }

  function showHouseCompleteOverlay(roomCoins, totalAfterBonus, isReset) {
    const titleEl = document.getElementById('house-complete-title');
    const subEl   = document.getElementById('house-complete-sub');

    if (isReset) {
      titleEl.textContent = '5 Houses Done!';
      subEl.textContent   = 'Amazing! The game resets — try to beat your best score!';
    } else {
      titleEl.textContent = 'House Complete!';
      subEl.textContent   = 'Every room is perfectly decorated!';
    }

    document.getElementById('hc-room-coins').textContent  = roomCoins;
    document.getElementById('hc-total-coins').textContent = totalAfterBonus;

    elOverlayHouse.hidden = false;
  }

  /* ================================================================
     TIMER
     ================================================================ */

  function startTimer() {
    timerInterval = setInterval(() => {
      timeLeft = Math.max(0, timeLeft - 1);
      updateTimerDisplay();
      if (timeLeft === 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        showTimeUp();
      }
    }, 1000);
  }

  function stopTimer() {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
  }

  function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60);
    const s = timeLeft % 60;
    elTimerDisplay.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    elTimerDisplay.classList.toggle('timer-urgent',  timeLeft <= 30);
    elTimerDisplay.classList.toggle('timer-warning', timeLeft > 30 && timeLeft <= 60);
  }

  /* ================================================================
     TRAY RENDERING
     ================================================================ */

  function renderTray(items, trayEl, canvasEl, itemsArr) {
    trayEl   = trayEl   || elTray;
    canvasEl = canvasEl || elCanvas;
    itemsArr = itemsArr || placedItems;
    trayEl.innerHTML = '';
    items.forEach(item => trayEl.appendChild(makeTrayEl(item, canvasEl, itemsArr)));
  }

  function makeTrayEl(item, canvasEl, itemsArr) {
    canvasEl = canvasEl || elCanvas;
    itemsArr = itemsArr || placedItems;

    const wrap = document.createElement('div');
    wrap.className       = 'tray-item';
    wrap.dataset.itemId  = item.id;

    const svgWrap = document.createElement('div');
    svgWrap.innerHTML = item.svg;
    const s = svgWrap.querySelector('svg');
    if (s) { s.style.width = item.tw + 'px'; s.style.height = item.th + 'px'; s.style.display = 'block'; }

    const label = document.createElement('div');
    label.className   = 'tray-item-label';
    label.textContent = item.name;

    wrap.appendChild(svgWrap);
    wrap.appendChild(label);

    wrap.addEventListener('mousedown', e => startDrag(e, item, { fromTray: true, trayEl: wrap, canvasEl, itemsArr }));
    wrap.addEventListener('touchstart', e => startDrag(e, item, { fromTray: true, trayEl: wrap, canvasEl, itemsArr }),
      { passive: false });

    return wrap;
  }

  /* ================================================================
     DRAG AND DROP
     ================================================================ */

  function getPos(e) {
    const src = (e.changedTouches && e.changedTouches[0])
             || (e.touches         && e.touches[0])
             || e;
    return { x: src.clientX, y: src.clientY };
  }

  function makeGhostEl(item) {
    const div = document.createElement('div');
    div.className = 'drag-ghost';
    div.style.width  = item.w + 'px';
    div.style.height = item.h + 'px';
    div.innerHTML = item.svg;
    const s = div.querySelector('svg');
    if (s) { s.style.width = item.w + 'px'; s.style.height = item.h + 'px'; s.style.display = 'block'; }
    return div;
  }

  /** Return the drag state that owns this touch identifier (or null). */
  function _dragStateForTouch(touchId) {
    if (dragState  && dragState.touchId  === touchId) return dragState;
    if (dragState2 && dragState2.touchId === touchId) return dragState2;
    return null;
  }

  function startDrag(e, item, opts) {
    if (e.type === 'touchstart') e.preventDefault();

    const touchId = (e.changedTouches && e.changedTouches[0])
      ? e.changedTouches[0].identifier : 'mouse';

    const canvasEl = opts.canvasEl || elCanvas;
    const itemsArr = opts.itemsArr || placedItems;
    const isP2     = canvasEl === elCanvas2;

    // Don't start a duplicate drag for the same player
    if (isP2  && dragState2) return;
    if (!isP2 && dragState)  return;

    const pos   = getPos(e);
    const ghost = makeGhostEl(item);
    ghost.style.left = (pos.x - item.w / 2) + 'px';
    ghost.style.top  = (pos.y - item.h / 2) + 'px';
    document.body.appendChild(ghost);

    let state;
    if (opts.fromTray) {
      opts.trayEl.style.opacity = '0.38';
      state = { item, ghost, fromTray: true, trayEl: opts.trayEl, canvasEl, itemsArr, touchId };
    } else {
      const placed = opts.placed;
      const idx = itemsArr.indexOf(placed);
      if (idx !== -1) itemsArr.splice(idx, 1);
      placed.el.remove();
      state = { item, ghost, fromTray: false, prevX: placed.x, prevY: placed.y, prevZone: placed.zone, canvasEl, itemsArr, touchId };
    }

    if (isP2) dragState2 = state;
    else dragState = state;
  }

  function onDragMove(e) {
    if (e.type === 'touchmove') e.preventDefault();
    if (e.changedTouches) {
      for (const t of e.changedTouches) {
        const state = _dragStateForTouch(t.identifier);
        if (state) {
          state.ghost.style.left = (t.clientX - state.item.w / 2) + 'px';
          state.ghost.style.top  = (t.clientY - state.item.h / 2) + 'px';
        }
      }
    } else if (dragState) {
      const pos = getPos(e);
      dragState.ghost.style.left = (pos.x - dragState.item.w / 2) + 'px';
      dragState.ghost.style.top  = (pos.y - dragState.item.h / 2) + 'px';
    }
  }

  function onDragEnd(e) {
    if (e.changedTouches) {
      for (const t of e.changedTouches) {
        const isDS2 = dragState2 && dragState2.touchId === t.identifier;
        const isDS1 = dragState  && dragState.touchId  === t.identifier;
        if (isDS2) _handleDrop({ x: t.clientX, y: t.clientY }, true);
        else if (isDS1) _handleDrop({ x: t.clientX, y: t.clientY }, false);
      }
    } else if (dragState) {
      _handleDrop({ x: e.clientX, y: e.clientY }, false);
    }
  }

  function _handleDrop(pos, isP2) {
    const state = isP2 ? dragState2 : dragState;
    if (!state) return;

    if (isP2) dragState2 = null;
    else dragState = null;

    const { item, ghost, fromTray, trayEl, prevX, prevY, prevZone, canvasEl, itemsArr } = state;

    const canvasRect = canvasEl.getBoundingClientRect();
    const overCanvas = pos.x >= canvasRect.left && pos.x <= canvasRect.right
                    && pos.y >= canvasRect.top  && pos.y <= canvasRect.bottom;

    if (overCanvas) {
      // ── Paint bucket — colour a surface, stay in tray ───
      if (item.isPaint) {
        const relX = pos.x - canvasRect.left;
        const relY = pos.y - canvasRect.top;
        const cW   = canvasRect.width;
        const cH   = canvasRect.height;
        let target = null;
        if      (relX < SIDE_W)       target = canvasEl.querySelector('.room-left-panel');
        else if (relX > cW - SIDE_W)  target = canvasEl.querySelector('.room-right-panel');
        else if (relY < CEILING_H)    target = canvasEl.querySelector('.room-ceiling');
        else if (relY > cH - FLOOR_H) target = canvasEl.querySelector('.room-floor');
        else                           target = canvasEl;
        if (target) target.style.background = item.paintColor;
        ghost.remove();
        if (fromTray && trayEl) trayEl.style.opacity = '1'; // keep bucket in tray
        return;
      }

      const placed = attemptPlace(item, pos, canvasRect, itemsArr, canvasEl);
      if (placed) {
        ghost.remove();
        if (fromTray) trayEl.remove();
        // In 2p-same mode, check whether this placement wins the round
        if (typeof GameState !== 'undefined' && GameState.mode === '2p-same') {
          check2pWin(isP2 ? 2 : 1, itemsArr, canvasEl);
        }
        return;
      }
    }

    // Invalid drop → shake and restore
    ghost.classList.add('invalid');
    setTimeout(() => ghost.remove(), 320);

    if (fromTray) {
      if (trayEl) trayEl.style.opacity = '1';
    } else {
      placeItem(item, prevX, prevY, prevZone, itemsArr, canvasEl);
    }
  }

  function setupGlobalDragListeners() {
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup',   onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend',  onDragEnd);
  }

  /* ================================================================
     PLACEMENT & COLLISION
     ================================================================ */

  /* ── Depth zones ────────────────────────────────────────────
     The floor is split into 3 depth zones.  Items in a back zone
     render behind items in a closer zone (z-index).  Collision is
     only checked within the same zone so items in different zones
     can visually overlap freely.

     Zone snap Y values (item bottom edge lands here):
       back  → 10% into floor strip
       mid   → 45% into floor strip
       front → 80% into floor strip
  ─────────────────────────────────────────────────────────── */
  const DEPTH_ZONES = {
    wall:  { z: 1 },
    back:  { z: 2, floorFrac: 0.10 },
    mid:   { z: 3, floorFrac: 0.45 },
    front: { z: 4, floorFrac: 0.80 },
  };

  function depthZoneForCursorY(cursorY, canvasTop, cH) {
    const floorTop = cH - FLOOR_H;
    const relY = cursorY - canvasTop - floorTop;   // px below floor top (can be negative)
    if (relY < FLOOR_H / 3)       return 'back';
    if (relY < FLOOR_H * 2 / 3)   return 'mid';
    return 'front';
  }

  function snapYForZone(zone, cH, itemH) {
    const floorTop = cH - FLOOR_H;
    if (zone === 'wall') return Math.round(cH * 0.38);
    return floorTop + Math.round(FLOOR_H * DEPTH_ZONES[zone].floorFrac) - itemH;
  }

  function attemptPlace(item, cursorPos, canvasRect, itemsArr, canvasEl) {
    itemsArr = itemsArr || placedItems;
    canvasEl = canvasEl || elCanvas;

    const cW = canvasRect.width;
    const cH = canvasRect.height;

    const minX = SIDE_W;
    const maxX = cW - SIDE_W - item.w;

    let x = (cursorPos.x - canvasRect.left) - item.w / 2;
    x = Math.max(minX, Math.min(x, maxX));

    const zone = item.wallMounted ? 'wall' : depthZoneForCursorY(cursorPos.y, canvasRect.top, cH);
    const y    = snapYForZone(zone, cH, item.h);

    const newRect  = { x, y, w: item.w, h: item.h };
    const sameZone = itemsArr.filter(p => p.zone === zone);
    if (sameZone.some(p => rectsOverlap(newRect, { x: p.x, y: p.y, w: p.w, h: p.h }, 10))) {
      return null;
    }

    return placeItem(item, x, y, zone, itemsArr, canvasEl);
  }

  function placeItem(item, x, y, zone, itemsArr, canvasEl) {
    itemsArr = itemsArr || placedItems;
    canvasEl = canvasEl || elCanvas;
    zone     = zone || 'mid';

    const el = document.createElement('div');
    el.className    = 'placed-item';
    el.style.left   = x + 'px';
    el.style.top    = y + 'px';
    el.style.width  = item.w + 'px';
    el.style.height = item.h + 'px';
    el.style.zIndex = (DEPTH_ZONES[zone] || DEPTH_ZONES.mid).z;
    el.innerHTML    = item.svg;
    const s = el.querySelector('svg');
    if (s) { s.style.width = item.w + 'px'; s.style.height = item.h + 'px'; s.style.display = 'block'; }
    canvasEl.appendChild(el);

    const placed = { item, x, y, zone, w: item.w, h: item.h, el };
    itemsArr.push(placed);

    el.addEventListener('mousedown',  ev => startDrag(ev, item, { fromTray: false, placed, canvasEl, itemsArr }));
    el.addEventListener('touchstart', ev => startDrag(ev, item, { fromTray: false, placed, canvasEl, itemsArr }),
      { passive: false });

    return placed;
  }

  // tol: how many px of overlap are acceptable (default 0 = no overlap allowed)
  function rectsOverlap(a, b, tol) {
    tol = tol || 0;
    return !(a.x + a.w <= b.x + tol || b.x + b.w <= a.x + tol ||
             a.y + a.h <= b.y + tol || b.y + b.h <= a.y + tol);
  }

  /* ================================================================
     2-PLAYER HELPERS
     ================================================================ */

  /**
   * Called after every item placement in 2p-same mode.
   * Checks if the placing player meets the win conditions.
   */
  function check2pWin(playerNum, itemsArr, canvasEl) {
    if (_2pWinnerShown) return;
    const canvasRect    = canvasEl.getBoundingClientRect();
    const floorClearPct = calcFloorClear(canvasRect.width, itemsArr);
    const minItems      = (ROOM_DEFINITIONS[currentRoomType] || {}).minItems || 5;

    if (itemsArr.length >= minItems && floorClearPct >= 0.30) {
      _2pWinnerShown = true;
      stopTimer();

      const score    = calcScore(floorClearPct, itemsArr);
      // Winner earns their score; loser earns minimum (shared coin pot)
      const p1Coins  = playerNum === 1 ? score.total : 10;
      const p2Coins  = playerNum === 2 ? score.total : 10;
      const newTotal = Storage.addCoins(p1Coins + p2Coins);
      Storage.pushRoom(currentRoomType);
      if (elCoinCounter) elCoinCounter.textContent = newTotal;

      show2pSameWinner(playerNum, p1Coins, p2Coins, newTotal);
    }
  }

  function show2pSameWinner(playerNum, p1Coins, p2Coins, totalCoins) {
    if (!elOverlay2pWinner) return;
    document.getElementById('winner-emoji').textContent = '🏆';
    document.getElementById('winner-title').textContent = `Player ${playerNum} Wins!`;
    document.getElementById('ws-p1-coins').textContent  = p1Coins;
    document.getElementById('ws-p2-coins').textContent  = p2Coins;
    document.getElementById('ws-total').textContent     = totalCoins;
    elOverlay2pWinner.hidden = false;
  }

  /**
   * Handles incoming PeerJS data messages in two-devices mode.
   */
  function handleNetMessage(data) {
    if (data.type === 'finish' && !_localFinished) {
      // Peer finished first — local player loses
      stopTimer();
      const loserScore = 10;
      const newTotal   = Storage.addCoins(loserScore);
      Storage.pushRoom(currentRoomType);
      if (elCoinCounter) elCoinCounter.textContent = newTotal;
      show2pNetResult(false, loserScore, data.score);
    }
  }

  function show2pNetResult(isWinner, localScore, peerScore) {
    if (!elOverlay2pNet) return;
    document.getElementById('net-emoji').textContent = isWinner ? '🏆' : '😢';
    document.getElementById('net-title').textContent = isWinner ? 'You Win!' : 'Opponent Won!';
    document.getElementById('net-msg').textContent   = isWinner
      ? 'Amazing! You decorated the room first!'
      : `Opponent scored ${peerScore} 🪙 — keep going!`;
    document.getElementById('net-coins').textContent = localScore;
    elOverlay2pNet.hidden = false;
  }

  /* ================================================================
     PUBLIC API
     ================================================================ */

  function setRoomType(type) {
    if (ROOM_DEFINITIONS[type]) currentRoomType = type;
  }

  return { init, setRoomType, getHouseRooms: () => Storage.getHouseRooms() };

})();
