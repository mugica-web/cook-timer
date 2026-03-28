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
  const FLOOR_H   = 70;  // px — floor panel height
  const SIDE_W    = 44;  // px — each side-wall panel width
  const BASEBOARD  = 9;  // px — baseboard trim height above floor
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

  const SVG = {
    couch: svg('0 0 200 82', `
      <rect x="10" y="4"  width="180" height="44" rx="10" fill="#9E9E9E"/>
      <rect x="14" y="7"  width="172" height="10" rx="4"  fill="rgba(255,255,255,0.22)"/>
      <rect x="10" y="45" width="180" height="30" rx="6"  fill="#757575"/>
      <rect x="0"   y="22" width="18" height="53" rx="9"  fill="#9E9E9E"/>
      <rect x="182" y="22" width="18" height="53" rx="9"  fill="#9E9E9E"/>
      <rect x="18"  y="47" width="50" height="24" rx="5"  fill="#EEEEEE"/>
      <rect x="74"  y="47" width="52" height="24" rx="5"  fill="#EEEEEE"/>
      <rect x="132" y="47" width="50" height="24" rx="5"  fill="#EEEEEE"/>
      <line x1="43"  y1="47" x2="43"  y2="71" stroke="#BDBDBD" stroke-width="1"/>
      <line x1="100" y1="47" x2="100" y2="71" stroke="#BDBDBD" stroke-width="1"/>
      <line x1="157" y1="47" x2="157" y2="71" stroke="#BDBDBD" stroke-width="1"/>
      <rect x="18"  y="74" width="12" height="8" rx="2" fill="#616161"/>
      <rect x="170" y="74" width="12" height="8" rx="2" fill="#616161"/>`),

    lamp: svg('0 0 38 115', `
      <polygon points="6,34 32,34 27,5 11,5" fill="#F9A825"/>
      <polygon points="6,34 32,34 27,5 11,5" fill="none" stroke="#F57F17" stroke-width="1.5"/>
      <polygon points="11,5 15,5 10,34 6,34" fill="rgba(255,255,255,0.28)"/>
      <ellipse cx="19" cy="34" rx="14" ry="5" fill="rgba(255,230,60,0.35)"/>
      <rect x="17" y="34" width="4" height="70" rx="2" fill="#795548"/>
      <ellipse cx="19" cy="104" rx="12" ry="7" fill="#5D4037"/>
      <ellipse cx="19" cy="103" rx="9"  ry="4" fill="#795548"/>`),

    coffeeTable: svg('0 0 135 52', `
      <rect x="2"  y="5"  width="131" height="18" rx="5" fill="#A1887F"/>
      <rect x="6"  y="7"  width="123" height="6"  rx="2" fill="rgba(255,255,255,0.28)"/>
      <rect x="10" y="21" width="115" height="6"  rx="2" fill="#8D6E63"/>
      <rect x="8"   y="27" width="9" height="24" rx="3" fill="#795548"/>
      <rect x="118" y="27" width="9" height="24" rx="3" fill="#795548"/>
      <rect x="17"  y="37" width="101" height="4" rx="2" fill="#6D4C41"/>`),

    chair: svg('0 0 78 88', `
      <rect x="6"  y="4"  width="66" height="36" rx="7" fill="#A1887F"/>
      <rect x="10" y="7"  width="58" height="9"  rx="3" fill="rgba(255,255,255,0.26)"/>
      <rect x="22" y="10" width="10" height="26" rx="3" fill="#8D6E63"/>
      <rect x="46" y="10" width="10" height="26" rx="3" fill="#8D6E63"/>
      <rect x="6"  y="37" width="66" height="18" rx="5" fill="#BCAAA4"/>
      <path d="M10,46 Q39,52 68,46" fill="none" stroke="#A1887F" stroke-width="1.5" opacity="0.5"/>
      <rect x="10" y="55" width="9" height="32" rx="3" fill="#795548"/>
      <rect x="59" y="55" width="9" height="32" rx="3" fill="#795548"/>
      <rect x="19" y="68" width="40" height="4"  rx="2" fill="#6D4C41"/>`),

    shelf: svg('0 0 120 30', `
      <rect x="8"   y="0" width="7" height="24" rx="2" fill="#795548"/>
      <rect x="105" y="0" width="7" height="24" rx="2" fill="#795548"/>
      <line x1="8"   y1="18" x2="18"  y2="4" stroke="#6D4C41" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="112" y1="18" x2="102" y2="4" stroke="#6D4C41" stroke-width="2.5" stroke-linecap="round"/>
      <rect x="2"  y="16" width="116" height="13" rx="3" fill="#A1887F"/>
      <rect x="4"  y="17" width="112" height="4"  rx="2" fill="rgba(255,255,255,0.32)"/>
      <line x1="25" y1="16" x2="25" y2="29" stroke="rgba(0,0,0,0.07)" stroke-width="1"/>
      <line x1="55" y1="16" x2="55" y2="29" stroke="rgba(0,0,0,0.07)" stroke-width="1"/>
      <line x1="85" y1="16" x2="85" y2="29" stroke="rgba(0,0,0,0.07)" stroke-width="1"/>`),

    /* ── Bedroom ─────────────────────────────────────────── */
    bed: svg('0 0 180 100', `
      <rect x="0"   y="0"  width="180" height="32" rx="6"  fill="#1565C0"/>
      <rect x="4"   y="3"  width="172" height="22" rx="4"  fill="#1E88E5"/>
      <circle cx="20"  cy="16" r="6" fill="#0D47A1" opacity="0.4"/>
      <circle cx="160" cy="16" r="6" fill="#0D47A1" opacity="0.4"/>
      <rect x="0"   y="30" width="180" height="60" rx="4"  fill="#90CAF9"/>
      <rect x="6"   y="34" width="74"  height="26" rx="6"  fill="white" opacity="0.88"/>
      <rect x="100" y="34" width="74"  height="26" rx="6"  fill="white" opacity="0.88"/>
      <rect x="0"   y="56" width="180" height="34" rx="4"  fill="#42A5F5"/>
      <path d="M0,56 Q90,63 180,56" fill="rgba(255,255,255,0.18)"/>
      <rect x="4"   y="88" width="14"  height="12" rx="3"  fill="#0D47A1"/>
      <rect x="162" y="88" width="14"  height="12" rx="3"  fill="#0D47A1"/>`),

    wardrobe: svg('0 0 100 130', `
      <rect x="0"  y="0"   width="100" height="130" rx="6" fill="#7B1FA2"/>
      <rect x="0"  y="0"   width="100" height="10"  rx="6" fill="#6A1B9A"/>
      <rect x="0"  y="118" width="100" height="12"  rx="4" fill="#6A1B9A"/>
      <line x1="50" y1="10" x2="50" y2="118" stroke="#6A1B9A" stroke-width="2.5"/>
      <rect x="4"  y="14"  width="42"  height="100" rx="4" fill="#8E24AA"/>
      <rect x="54" y="14"  width="42"  height="100" rx="4" fill="#8E24AA"/>
      <rect x="2"  y="62"  width="44"  height="2"   fill="#6A1B9A" opacity="0.5"/>
      <rect x="54" y="62"  width="44"  height="2"   fill="#6A1B9A" opacity="0.5"/>
      <circle cx="40" cy="62" r="4" fill="#CE93D8"/>
      <circle cx="60" cy="62" r="4" fill="#CE93D8"/>`),

    dresser: svg('0 0 90 80', `
      <rect x="0"  y="0"  width="90" height="80" rx="5" fill="#FF4DA6"/>
      <rect x="0"  y="0"  width="90" height="8"  rx="5" fill="#D81B7A"/>
      <rect x="3"  y="11" width="84" height="16" rx="3" fill="#D81B7A"/>
      <rect x="3"  y="31" width="84" height="16" rx="3" fill="#D81B7A"/>
      <rect x="3"  y="51" width="84" height="16" rx="3" fill="#D81B7A"/>
      <circle cx="45" cy="19" r="4" fill="#FFB3D9"/>
      <circle cx="45" cy="39" r="4" fill="#FFB3D9"/>
      <circle cx="45" cy="59" r="4" fill="#FFB3D9"/>
      <rect x="6"  y="69" width="12" height="11" rx="3" fill="#C2185B"/>
      <rect x="72" y="69" width="12" height="11" rx="3" fill="#C2185B"/>`),

    nightstand: svg('0 0 55 70', `
      <rect x="0"  y="0"  width="55" height="10" rx="4" fill="#D4A96A"/>
      <rect x="0"  y="8"  width="55" height="48" rx="4" fill="#BF7F45"/>
      <rect x="3"  y="14" width="49" height="20" rx="3" fill="#8B5E3C"/>
      <circle cx="27" cy="24" r="4" fill="#D4A96A"/>
      <rect x="3"  y="38" width="49" height="14" rx="3" fill="#8B5E3C"/>
      <rect x="6"  y="56" width="8"  height="14" rx="3" fill="#6D4C41"/>
      <rect x="41" y="56" width="8"  height="14" rx="3" fill="#6D4C41"/>`),

    /* ── Bathroom ────────────────────────────────────────── */
    toilet: svg('0 0 60 85', `
      <rect x="5"  y="0"  width="50" height="28" rx="5" fill="#E3F2FD"/>
      <rect x="5"  y="0"  width="50" height="8"  rx="5" fill="#BBDEFB"/>
      <rect x="5"  y="24" width="50" height="10" rx="3" fill="#90CAF9"/>
      <ellipse cx="30" cy="60" rx="24" ry="20" fill="#E3F2FD"/>
      <ellipse cx="30" cy="58" rx="20" ry="16" fill="#BBDEFB"/>
      <rect x="20" y="34" width="20" height="10" rx="3" fill="#90CAF9"/>
      <ellipse cx="30" cy="78" rx="24" ry="6"   fill="#CFD8DC"/>
      <circle cx="30" cy="10" r="4"  fill="#90CAF9"/>`),

    bathtub: svg('0 0 150 70', `
      <rect x="0"   y="14" width="150" height="46" rx="14" fill="#E3F2FD"/>
      <rect x="6"   y="18" width="138" height="38" rx="10" fill="#BBDEFB"/>
      <rect x="6"   y="18" width="138" height="14" rx="10" fill="rgba(100,181,246,0.4)"/>
      <rect x="118" y="4"  width="12"  height="18" rx="4"  fill="#90CAF9"/>
      <circle cx="124" cy="4" r="6" fill="#42A5F5"/>
      <circle cx="120" cy="3" r="2" fill="white" opacity="0.7"/>
      <rect x="0"   y="58" width="14"  height="10" rx="3" fill="#90CAF9"/>
      <rect x="136" y="58" width="14"  height="10" rx="3" fill="#90CAF9"/>`),

    bathroomSink: svg('0 0 65 70', `
      <rect x="0"  y="0"  width="65" height="14" rx="4" fill="#90CAF9"/>
      <rect x="0"  y="12" width="65" height="8"  rx="2" fill="#64B5F6"/>
      <path d="M4,20 L8,60 Q32,68 57,60 L61,20 Z" fill="#E3F2FD"/>
      <path d="M8,20 L11,56 Q32,63 54,56 L57,20 Z" fill="#BBDEFB"/>
      <circle cx="32" cy="38" r="5" fill="#64B5F6"/>
      <rect x="28" y="4"  width="9"  height="12" rx="3" fill="#64B5F6"/>
      <circle cx="32" cy="3" r="5" fill="#42A5F5"/>
      <rect x="4"  y="60" width="8"  height="10" rx="2" fill="#BBDEFB"/>
      <rect x="53" y="60" width="8"  height="10" rx="2" fill="#BBDEFB"/>`),

    bathroomMirror: svg('0 0 80 60', `
      <rect x="0"  y="0"  width="80" height="60" rx="8" fill="#42A5F5"/>
      <rect x="4"  y="4"  width="72" height="52" rx="5" fill="#E3F2FD"/>
      <rect x="8"  y="8"  width="64" height="44" rx="3" fill="#F0F8FF"/>
      <rect x="8"  y="8"  width="26" height="44" rx="3" fill="rgba(255,255,255,0.4)"/>
      <line x1="14" y1="14" x2="20" y2="20" stroke="white" stroke-width="2.5" opacity="0.7"/>
      <line x1="14" y1="22" x2="19" y2="25" stroke="white" stroke-width="1.5" opacity="0.5"/>`),

    /* ── Kitchen ─────────────────────────────────────────── */
    fridge: svg('0 0 70 130', `
      <rect x="0"  y="0"   width="70" height="130" rx="6" fill="#E0F2F1"/>
      <rect x="0"  y="0"   width="70" height="40"  rx="6" fill="#B2DFDB"/>
      <rect x="0"  y="36"  width="70" height="6"   fill="#80CBC4"/>
      <rect x="0"  y="40"  width="70" height="90"  rx="6" fill="#E0F2F1"/>
      <rect x="54" y="10"  width="6"  height="22"  rx="3" fill="#4DB6AC"/>
      <rect x="54" y="52"  width="6"  height="68"  rx="3" fill="#4DB6AC"/>
      <rect x="4"  y="12"  width="44" height="2"   rx="1" fill="rgba(255,255,255,0.5)"/>
      <rect x="4"  y="18"  width="44" height="2"   rx="1" fill="rgba(255,255,255,0.4)"/>
      <rect x="4"  y="24"  width="36" height="2"   rx="1" fill="rgba(255,255,255,0.35)"/>`),

    stove: svg('0 0 90 95', `
      <rect x="0"  y="0"  width="90" height="95" rx="5" fill="#CFD8DC"/>
      <rect x="0"  y="0"  width="90" height="38" rx="5" fill="#B0BEC5"/>
      <rect x="0"  y="34" width="90" height="6"  fill="#90A4AE"/>
      <circle cx="22" cy="16" r="10" fill="#78909C"/>
      <circle cx="22" cy="16" r="5"  fill="#546E7A"/>
      <circle cx="68" cy="16" r="10" fill="#78909C"/>
      <circle cx="68" cy="16" r="5"  fill="#546E7A"/>
      <rect x="4"  y="40" width="82" height="50" rx="4" fill="#B0BEC5"/>
      <rect x="8"  y="46" width="74" height="38" rx="3" fill="#90A4AE"/>
      <rect x="12" y="50" width="66" height="28" rx="2" fill="#78909C"/>
      <circle cx="80" cy="10" r="5" fill="#FF8F00"/>`),

    counter: svg('0 0 130 70', `
      <rect x="0"   y="0"  width="130" height="15" rx="4" fill="#78909C"/>
      <rect x="0"   y="0"  width="130" height="8"  rx="4" fill="#90A4AE"/>
      <rect x="0"   y="13" width="130" height="57" rx="4" fill="#CFD8DC"/>
      <line x1="43"  y1="15" x2="43"  y2="70" stroke="#B0BEC5" stroke-width="1.5"/>
      <line x1="87"  y1="15" x2="87"  y2="70" stroke="#B0BEC5" stroke-width="1.5"/>
      <circle cx="21"  cy="42" r="4" fill="#90A4AE"/>
      <circle cx="65"  cy="42" r="4" fill="#90A4AE"/>
      <circle cx="109" cy="42" r="4" fill="#90A4AE"/>
      <rect x="18"  y="50" width="8"  height="16" rx="2" fill="#B0BEC5"/>
      <rect x="62"  y="50" width="8"  height="16" rx="2" fill="#B0BEC5"/>
      <rect x="106" y="50" width="8"  height="16" rx="2" fill="#B0BEC5"/>`),

    kitchenCabinet: svg('0 0 90 60', `
      <rect x="0"  y="0"  width="90" height="60" rx="5" fill="#43A047"/>
      <rect x="0"  y="0"  width="90" height="8"  rx="5" fill="#2E7D32"/>
      <rect x="0"  y="52" width="90" height="8"  rx="4" fill="#2E7D32"/>
      <line x1="45" y1="8" x2="45" y2="52" stroke="#2E7D32" stroke-width="2"/>
      <rect x="3"  y="11" width="39" height="38" rx="3" fill="#388E3C"/>
      <rect x="48" y="11" width="39" height="38" rx="3" fill="#388E3C"/>
      <circle cx="37" cy="30" r="4" fill="#A5D6A7"/>
      <circle cx="53" cy="30" r="4" fill="#A5D6A7"/>`),

    /* ── Dining Room ─────────────────────────────────────── */
    diningTable: svg('0 0 160 75', `
      <rect x="0"   y="0"  width="160" height="18" rx="5" fill="#E8C48A"/>
      <rect x="0"   y="0"  width="160" height="10" rx="5" fill="#F5D9A8"/>
      <rect x="0"   y="16" width="160" height="8"  rx="2" fill="#BF7F45"/>
      <rect x="8"   y="24" width="10"  height="46" rx="4" fill="#8B5E3C"/>
      <rect x="142" y="24" width="10"  height="46" rx="4" fill="#8B5E3C"/>
      <rect x="22"  y="24" width="10"  height="40" rx="3" fill="#8B5E3C"/>
      <rect x="128" y="24" width="10"  height="40" rx="3" fill="#8B5E3C"/>
      <rect x="8"   y="62" width="144" height="4"  rx="2" fill="#6D4C41"/>`),

    diningChair: svg('0 0 60 80', `
      <rect x="6"  y="0"  width="48" height="34" rx="6" fill="#43A047"/>
      <rect x="6"  y="0"  width="48" height="10" rx="6" fill="#2E7D32"/>
      <rect x="10" y="10" width="10" height="20" rx="3" fill="#388E3C"/>
      <rect x="40" y="10" width="10" height="20" rx="3" fill="#388E3C"/>
      <rect x="6"  y="32" width="48" height="18" rx="4" fill="#66BB6A"/>
      <path d="M10,40 Q30,46 50,40" fill="none" stroke="#43A047" stroke-width="1.5" opacity="0.5"/>
      <rect x="10" y="50" width="8"  height="28" rx="3" fill="#2E7D32"/>
      <rect x="42" y="50" width="8"  height="28" rx="3" fill="#2E7D32"/>
      <rect x="18" y="64" width="24" height="4"  rx="2" fill="#1B5E20"/>`),

    buffet: svg('0 0 130 75', `
      <rect x="0"   y="0"  width="130" height="14" rx="4" fill="#F5D9A8"/>
      <rect x="0"   y="12" width="130" height="52" rx="4" fill="#BF7F45"/>
      <rect x="0"   y="12" width="130" height="8"  rx="4" fill="#D4A96A"/>
      <line x1="65" y1="20" x2="65"  y2="64" stroke="#8B5E3C" stroke-width="2"/>
      <rect x="4"   y="22" width="57" height="38" rx="3" fill="#8B5E3C"/>
      <rect x="69"  y="22" width="57" height="38" rx="3" fill="#8B5E3C"/>
      <circle cx="54" cy="41" r="4" fill="#D4A96A"/>
      <circle cx="76" cy="41" r="4" fill="#D4A96A"/>
      <rect x="4"   y="62" width="10" height="12" rx="3" fill="#6D4C41"/>
      <rect x="116" y="62" width="10" height="12" rx="3" fill="#6D4C41"/>`),
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
      document.querySelector('.game-header')?.appendChild(cc);
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
      state = { item, ghost, fromTray: false, prevX: placed.x, prevY: placed.y, canvasEl, itemsArr, touchId };
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

    const { item, ghost, fromTray, trayEl, prevX, prevY, canvasEl, itemsArr } = state;

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
      placeItem(item, prevX, prevY, itemsArr, canvasEl);
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

  function attemptPlace(item, cursorPos, canvasRect, itemsArr, canvasEl) {
    itemsArr = itemsArr || placedItems;
    canvasEl = canvasEl || elCanvas;

    const cW = canvasRect.width;
    const cH = canvasRect.height;

    const floorTop = cH - FLOOR_H;
    const minX     = SIDE_W;
    const maxX     = cW - SIDE_W - item.w;

    let x = (cursorPos.x - canvasRect.left) - item.w / 2;
    let y;

    if (item.wallMounted) {
      y = Math.round(cH * 0.38);  // fixed wall-mount height
    } else {
      y = floorTop - BASEBOARD - item.h;  // sit on floor above baseboard
    }

    x = Math.max(minX, Math.min(x, maxX));

    const newRect = { x, y, w: item.w, h: item.h };
    if (itemsArr.some(p => rectsOverlap(newRect, { x: p.x, y: p.y, w: p.w, h: p.h }))) {
      return null;
    }

    return placeItem(item, x, y, itemsArr, canvasEl);
  }

  function placeItem(item, x, y, itemsArr, canvasEl) {
    itemsArr = itemsArr || placedItems;
    canvasEl = canvasEl || elCanvas;

    const el = document.createElement('div');
    el.className    = 'placed-item';
    el.style.left   = x + 'px';
    el.style.top    = y + 'px';
    el.style.width  = item.w + 'px';
    el.style.height = item.h + 'px';
    el.innerHTML    = item.svg;
    const s = el.querySelector('svg');
    if (s) { s.style.width = item.w + 'px'; s.style.height = item.h + 'px'; s.style.display = 'block'; }
    canvasEl.appendChild(el);

    const placed = { item, x, y, w: item.w, h: item.h, el };
    itemsArr.push(placed);

    el.addEventListener('mousedown',  ev => startDrag(ev, item, { fromTray: false, placed, canvasEl, itemsArr }));
    el.addEventListener('touchstart', ev => startDrag(ev, item, { fromTray: false, placed, canvasEl, itemsArr }),
      { passive: false });

    return placed;
  }

  function rectsOverlap(a, b) {
    return !(a.x + a.w <= b.x || b.x + b.w <= a.x ||
             a.y + a.h <= b.y || b.y + b.h <= a.y);
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
