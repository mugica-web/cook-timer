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

  /*
   * Cabinet-oblique furniture SVGs.
   * Light source: upper-left.  Top face = lightest, front face = mid, right side = darkest.
   * Depth offset direction: right +DX, up -DY  (matches floor/left-wall projection).
   * viewBox always equals item w × h; front face starts at y=DY.
   */
  const SVG = {

    /* ── COUCH (200×82)  DX=20 DY=10 ── */
    couch: svg('0 0 200 82', `
      <polygon points="0,10 180,10 200,0 20,0" fill="#8FA8B6"/>
      <polygon points="180,10 200,0 200,72 180,82" fill="#3D5662"/>
      <rect x="0" y="10" width="18" height="72" fill="#506878"/>
      <rect x="18" y="10" width="144" height="30" fill="#607D8B"/>
      <rect x="22" y="14" width="66" height="22" rx="4" fill="#7896A6"/>
      <rect x="94" y="14" width="64" height="22" rx="4" fill="#7896A6"/>
      <line x1="90" y1="10" x2="90" y2="40" stroke="#3D5662" stroke-width="1.5"/>
      <rect x="162" y="10" width="18" height="72" fill="#506878"/>
      <rect x="18" y="40" width="144" height="32" fill="#607D8B"/>
      <rect x="22" y="43" width="66" height="26" rx="3" fill="#7896A6"/>
      <rect x="94" y="43" width="64" height="26" rx="3" fill="#7896A6"/>
      <line x1="90" y1="40" x2="90" y2="72" stroke="#3D5662" stroke-width="1.5"/>
      <rect x="23" y="72" width="7" height="10" rx="1" fill="#2C1A0A"/>
      <rect x="150" y="72" width="7" height="10" rx="1" fill="#2C1A0A"/>
    `),

    /* ── FLOOR LAMP (38×115)  DX=5 DY=8 ── */
    lamp: svg('0 0 38 115', `
      <polygon points="4,8 28,8 33,0 9,0" fill="#FDD835"/>
      <polygon points="28,8 33,0 33,28 28,33" fill="#E0A800"/>
      <polygon points="4,8 28,8 28,33 4,33" fill="#FFF176"/>
      <ellipse cx="16" cy="32" rx="10" ry="3" fill="rgba(255,255,160,0.5)"/>
      <rect x="14" y="33" width="5" height="4" fill="#9E9E9E"/>
      <rect x="15" y="37" width="3" height="54" fill="#757575"/>
      <polygon points="4,95 29,95 33,91 8,91" fill="#BDBDBD"/>
      <polygon points="29,95 33,91 33,107 29,111" fill="#616161"/>
      <rect x="4" y="95" width="25" height="16" rx="2" fill="#9E9E9E"/>
      <rect x="7" y="111" width="19" height="4" fill="#616161"/>
    `),

    /* ── COFFEE TABLE (135×52)  DX=14 DY=8 ── */
    coffeeTable: svg('0 0 135 52', `
      <polygon points="0,8 121,8 135,0 14,0" fill="#D4A96A"/>
      <polygon points="121,8 135,0 135,20 121,28" fill="#6D4C41"/>
      <rect x="0" y="8" width="121" height="20" fill="#BF7F45"/>
      <rect x="2" y="10" width="117" height="7" fill="#C89450" opacity="0.55"/>
      <rect x="10" y="34" width="101" height="6" fill="#A06838"/>
      <polygon points="10,34 111,34 121,27 20,27" fill="#C08040"/>
      <rect x="10" y="28" width="8" height="24" rx="2" fill="#7A5230"/>
      <rect x="103" y="28" width="8" height="24" rx="2" fill="#7A5230"/>
      <rect x="18" y="22" width="5" height="7" fill="#5C3820"/>
      <rect x="107" y="22" width="5" height="7" fill="#5C3820"/>
    `),

    /* ── ARMCHAIR (78×88)  DX=10 DY=10 ── */
    chair: svg('0 0 78 88', `
      <polygon points="8,10 68,10 78,0 18,0" fill="#B09AB5"/>
      <polygon points="68,10 78,0 78,44 68,54" fill="#4A3050"/>
      <rect x="8" y="10" width="60" height="44" fill="#7B5F86"/>
      <rect x="12" y="14" width="52" height="36" rx="5" fill="#8D6F96"/>
      <line x1="38" y1="10" x2="38" y2="54" stroke="#4A3050" stroke-width="1.5"/>
      <polygon points="4,52 64,52 68,48 8,48" fill="#B09AB5"/>
      <polygon points="64,52 68,48 68,66 64,70" fill="#4A3050"/>
      <rect x="0" y="10" width="14" height="58" rx="3" fill="#6A4F74"/>
      <rect x="64" y="10" width="14" height="58" rx="3" fill="#6A4F74"/>
      <rect x="4" y="52" width="60" height="18" fill="#7B5F86"/>
      <rect x="8" y="55" width="52" height="12" rx="3" fill="#8D6F96"/>
      <rect x="8" y="70" width="7" height="18" rx="2" fill="#2E1A08"/>
      <rect x="55" y="70" width="7" height="18" rx="2" fill="#2E1A08"/>
      <rect x="14" y="66" width="5" height="14" rx="1" fill="#1E1006"/>
      <rect x="59" y="64" width="5" height="14" rx="1" fill="#1E1006"/>
    `),

    /* ── WALL SHELF (120×30)  DX=10 DY=6 — wall-mounted ── */
    shelf: svg('0 0 120 30', `
      <polygon points="0,6 110,6 120,0 10,0" fill="#D4A96A"/>
      <polygon points="110,6 120,0 120,16 110,22" fill="#6D4C41"/>
      <rect x="0" y="6" width="110" height="16" fill="#BF7F45"/>
      <rect x="5" y="2" width="6" height="4" fill="#C62828"/>
      <rect x="12" y="1" width="5" height="5" fill="#1565C0"/>
      <rect x="18" y="2" width="7" height="4" fill="#2E7D32"/>
      <rect x="70" y="1" width="6" height="5" fill="#E65100"/>
      <rect x="77" y="2" width="5" height="4" fill="#6A1B9A"/>
      <rect x="83" y="1" width="8" height="5" fill="#558B2F"/>
      <polygon points="0,22 7,22 7,30 2,30" fill="#A06838"/>
      <polygon points="103,22 110,22 108,30 101,30" fill="#A06838"/>
    `),

    /* ── BED (180×100)  DX=18 DY=12 ── */
    bed: svg('0 0 180 100', `
      <polygon points="4,12 162,12 180,0 22,0" fill="#5B8BC0"/>
      <polygon points="162,12 180,0 180,88 162,100" fill="#0D47A1"/>
      <rect x="4" y="12" width="158" height="36" fill="#1565C0"/>
      <rect x="4" y="12" width="158" height="7" fill="#0D47A1"/>
      <rect x="10" y="19" width="66" height="25" rx="5" fill="#1976D2" opacity="0.65"/>
      <rect x="82" y="19" width="76" height="25" rx="5" fill="#1976D2" opacity="0.65"/>
      <polygon points="4,44 162,44 180,32 22,32" fill="#B3D9F5"/>
      <rect x="4" y="44" width="158" height="56" fill="#90CAF9"/>
      <rect x="8" y="48" width="150" height="42" rx="5" fill="#BBDEFB"/>
      <rect x="12" y="50" width="56" height="22" rx="6" fill="white" opacity="0.88"/>
      <rect x="90" y="50" width="64" height="22" rx="6" fill="white" opacity="0.88"/>
      <rect x="4" y="90" width="158" height="8" rx="2" fill="#1565C0"/>
      <rect x="8" y="94" width="9" height="6" fill="#0D3A7A"/>
      <rect x="149" y="94" width="9" height="6" fill="#0D3A7A"/>
    `),

    /* ── WARDROBE (100×130)  DX=12 DY=14 ── */
    wardrobe: svg('0 0 100 130', `
      <polygon points="0,14 88,14 100,0 12,0" fill="#CE93D8"/>
      <polygon points="88,14 100,0 100,116 88,130" fill="#4A0072"/>
      <rect x="0" y="14" width="88" height="116" fill="#7B1FA2"/>
      <rect x="0" y="14" width="88" height="8" fill="#6A1B9A"/>
      <line x1="44" y1="22" x2="44" y2="130" stroke="#6A1B9A" stroke-width="2"/>
      <rect x="3" y="26" width="38" height="72" rx="3" fill="#6A1B9A" opacity="0.45"/>
      <rect x="47" y="26" width="38" height="72" rx="3" fill="#6A1B9A" opacity="0.45"/>
      <circle cx="39" cy="64" r="4" fill="#CE93D8"/>
      <circle cx="53" cy="64" r="4" fill="#CE93D8"/>
      <rect x="0" y="120" width="88" height="10" fill="#6A1B9A"/>
    `),

    /* ── DRESSER (90×80)  DX=10 DY=10 ── */
    dresser: svg('0 0 90 80', `
      <polygon points="0,10 80,10 90,0 10,0" fill="#F48FB1"/>
      <polygon points="80,10 90,0 90,70 80,80" fill="#880E4F"/>
      <rect x="0" y="10" width="80" height="70" fill="#E91E8C"/>
      <rect x="0" y="10" width="80" height="7" fill="#D81B7A"/>
      <rect x="4" y="20" width="72" height="15" rx="2" fill="#C2185B"/>
      <circle cx="40" cy="27" r="4" fill="#F48FB1"/>
      <rect x="4" y="38" width="72" height="15" rx="2" fill="#C2185B"/>
      <circle cx="40" cy="45" r="4" fill="#F48FB1"/>
      <rect x="4" y="56" width="72" height="15" rx="2" fill="#C2185B"/>
      <circle cx="40" cy="63" r="4" fill="#F48FB1"/>
      <rect x="5" y="74" width="7" height="6" rx="1" fill="#880E4F"/>
      <rect x="68" y="74" width="7" height="6" rx="1" fill="#880E4F"/>
    `),

    /* ── NIGHTSTAND (55×70)  DX=7 DY=8 ── */
    nightstand: svg('0 0 55 70', `
      <polygon points="0,8 48,8 55,0 7,0" fill="#D4A96A"/>
      <polygon points="48,8 55,0 55,62 48,70" fill="#6D4C41"/>
      <rect x="0" y="8" width="48" height="62" fill="#BF7F45"/>
      <rect x="0" y="8" width="48" height="5" fill="#C8904E"/>
      <rect x="3" y="16" width="42" height="20" rx="2" fill="#A06838"/>
      <circle cx="24" cy="26" r="3" fill="#D4A96A"/>
      <rect x="3" y="40" width="42" height="2" fill="#8B6040"/>
      <rect x="5" y="42" width="12" height="18" rx="1" fill="#D32F2F"/>
      <rect x="19" y="44" width="8" height="16" rx="1" fill="#1565C0"/>
      <rect x="4" y="62" width="7" height="8" rx="1" fill="#4A2C0A"/>
      <rect x="37" y="62" width="7" height="8" rx="1" fill="#4A2C0A"/>
    `),

    /* ── TOILET (60×85)  DX=8 DY=10 ── */
    toilet: svg('0 0 60 85', `
      <polygon points="8,10 44,10 52,0 16,0" fill="#E8F6FF"/>
      <polygon points="44,10 52,0 52,30 44,40" fill="#90CAF9"/>
      <rect x="8" y="10" width="36" height="30" rx="3" fill="#E3F2FD"/>
      <rect x="8" y="10" width="36" height="5" rx="2" fill="#BBDEFB"/>
      <circle cx="26" cy="16" r="3" fill="#64B5F6"/>
      <polygon points="2,38 50,38 56,32 8,32" fill="#E8F6FF"/>
      <polygon points="50,38 56,32 56,66 50,72" fill="#90CAF9"/>
      <ellipse cx="26" cy="46" rx="22" ry="8" fill="#DDEEFF" stroke="#90CAF9" stroke-width="1"/>
      <ellipse cx="26" cy="56" rx="20" ry="14" fill="#E3F2FD"/>
      <ellipse cx="25" cy="54" rx="16" ry="11" fill="#BBDEFB"/>
      <rect x="10" y="68" width="38" height="10" rx="3" fill="#B3D9F0"/>
    `),

    /* ── BATHTUB (150×70)  DX=14 DY=8 ── */
    bathtub: svg('0 0 150 70', `
      <polygon points="4,8 132,8 146,0 18,0" fill="#E8F6FF"/>
      <polygon points="132,8 146,0 146,54 132,62" fill="#90CAF9"/>
      <rect x="4" y="8" width="128" height="54" rx="10" fill="#E3F2FD"/>
      <rect x="12" y="16" width="112" height="40" rx="7" fill="#BBDEFB"/>
      <rect x="16" y="18" width="104" height="12" rx="5" fill="#90CAF9" opacity="0.35"/>
      <rect x="116" y="4" width="6" height="12" rx="2" fill="#90A4AE"/>
      <circle cx="119" cy="4" r="4" fill="#42A5F5"/>
      <circle cx="64" cy="52" r="4" fill="#90A4AE"/>
      <rect x="6" y="58" width="10" height="12" rx="3" fill="#BBDEFB"/>
      <rect x="120" y="58" width="10" height="12" rx="3" fill="#BBDEFB"/>
    `),

    /* ── SINK (65×70)  DX=8 DY=8 ── */
    bathroomSink: svg('0 0 65 70', `
      <polygon points="0,8 57,8 65,0 8,0" fill="#E8F6FF"/>
      <polygon points="57,8 65,0 65,22 57,30" fill="#90CAF9"/>
      <rect x="0" y="8" width="57" height="22" fill="#E3F2FD"/>
      <polygon points="6,28 52,28 58,22 12,22" fill="#BBDEFB"/>
      <polygon points="52,28 58,22 58,54 52,60" fill="#64B5F6"/>
      <rect x="6" y="28" width="46" height="32" rx="4" fill="#E3F2FD"/>
      <ellipse cx="29" cy="46" rx="18" ry="12" fill="#BBDEFB"/>
      <rect x="24" y="22" width="8" height="8" rx="2" fill="#90A4AE"/>
      <path d="M28,22 Q28,14 33,14" fill="none" stroke="#90A4AE" stroke-width="3" stroke-linecap="round"/>
      <circle cx="29" cy="52" r="3" fill="#90A4AE"/>
      <rect x="0" y="60" width="57" height="10" fill="#BBDEFB"/>
    `),

    /* ── BATHROOM MIRROR (80×60)  DX=8 DY=6 — wall-mounted ── */
    bathroomMirror: svg('0 0 80 60', `
      <polygon points="0,6 72,6 80,0 8,0" fill="#B0C4D4"/>
      <polygon points="72,6 80,0 80,54 72,60" fill="#455A64"/>
      <rect x="0" y="6" width="72" height="54" rx="5" fill="#78909C"/>
      <rect x="4" y="10" width="64" height="46" rx="3" fill="#D9EBFF"/>
      <rect x="8" y="14" width="22" height="38" rx="2" fill="rgba(255,255,255,0.34)"/>
      <line x1="36" y1="14" x2="32" y2="52" stroke="rgba(255,255,255,0.22)" stroke-width="3"/>
    `),

    /* ── FRIDGE (70×130)  DX=9 DY=12 ── */
    fridge: svg('0 0 70 130', `
      <polygon points="0,12 61,12 70,0 9,0" fill="#B0BEC5"/>
      <polygon points="61,12 70,0 70,118 61,130" fill="#37474F"/>
      <rect x="0" y="12" width="61" height="118" rx="3" fill="#546E7A"/>
      <rect x="0" y="50" width="61" height="4" fill="#37474F"/>
      <rect x="3" y="16" width="55" height="30" rx="2" fill="#607D8B"/>
      <rect x="3" y="58" width="55" height="62" rx="2" fill="#607D8B"/>
      <rect x="45" y="22" width="4" height="18" rx="2" fill="#90A4AE"/>
      <rect x="45" y="66" width="4" height="46" rx="2" fill="#90A4AE"/>
      <rect x="3" y="122" width="55" height="5" fill="#37474F"/>
    `),

    /* ── STOVE (90×95)  DX=10 DY=10 ── */
    stove: svg('0 0 90 95', `
      <polygon points="0,10 80,10 90,0 10,0" fill="#607D8B"/>
      <polygon points="80,10 90,0 90,85 80,95" fill="#263238"/>
      <rect x="0" y="10" width="80" height="85" fill="#455A64"/>
      <polygon points="2,12 78,12 88,2 12,2" fill="#37474F"/>
      <circle cx="20" cy="21" r="8" fill="#37474F"/>
      <circle cx="20" cy="21" r="4" fill="#546E7A"/>
      <circle cx="54" cy="21" r="8" fill="#37474F"/>
      <circle cx="54" cy="21" r="4" fill="#546E7A"/>
      <circle cx="11" cy="40" r="5" fill="#546E7A"/>
      <circle cx="26" cy="40" r="5" fill="#546E7A"/>
      <circle cx="41" cy="40" r="5" fill="#546E7A"/>
      <circle cx="56" cy="40" r="5" fill="#546E7A"/>
      <rect x="4" y="50" width="72" height="36" rx="3" fill="#37474F"/>
      <rect x="10" y="55" width="60" height="22" rx="3" fill="#263238"/>
      <rect x="16" y="51" width="48" height="4" rx="2" fill="#546E7A"/>
    `),

    /* ── COUNTER (130×70)  DX=14 DY=8 ── */
    counter: svg('0 0 130 70', `
      <polygon points="0,8 116,8 130,0 14,0" fill="#90A4AE"/>
      <polygon points="116,8 130,0 130,62 116,70" fill="#37474F"/>
      <rect x="0" y="8" width="116" height="22" fill="#78909C"/>
      <rect x="0" y="8" width="116" height="5" fill="#9DB0BA"/>
      <ellipse cx="38" cy="19" rx="20" ry="8" fill="#607D8B"/>
      <ellipse cx="38" cy="19" rx="16" ry="6" fill="#455A64"/>
      <rect x="36" y="9" width="4" height="8" rx="1" fill="#B0BEC5"/>
      <rect x="0" y="30" width="116" height="40" fill="#546E7A"/>
      <rect x="3" y="33" width="52" height="34" rx="2" fill="#607D8B"/>
      <rect x="58" y="33" width="55" height="34" rx="2" fill="#607D8B"/>
      <circle cx="52" cy="50" r="3" fill="#90A4AE"/>
      <circle cx="61" cy="50" r="3" fill="#90A4AE"/>
    `),

    /* ── KITCHEN CABINET (90×60)  DX=10 DY=7 — wall-mounted ── */
    kitchenCabinet: svg('0 0 90 60', `
      <polygon points="0,7 80,7 90,0 10,0" fill="#81C784"/>
      <polygon points="80,7 90,0 90,53 80,60" fill="#1B5E20"/>
      <rect x="0" y="7" width="80" height="53" fill="#43A047"/>
      <rect x="0" y="7" width="80" height="6" fill="#388E3C"/>
      <line x1="40" y1="13" x2="40" y2="60" stroke="#388E3C" stroke-width="2"/>
      <rect x="3" y="15" width="34" height="40" rx="2" fill="#388E3C" opacity="0.55"/>
      <rect x="43" y="15" width="34" height="40" rx="2" fill="#388E3C" opacity="0.55"/>
      <circle cx="35" cy="36" r="3" fill="#A5D6A7"/>
      <circle cx="45" cy="36" r="3" fill="#A5D6A7"/>
    `),

    /* ── DINING TABLE (160×75)  DX=16 DY=10 ── */
    diningTable: svg('0 0 160 75', `
      <polygon points="0,10 144,10 160,0 16,0" fill="#D4A96A"/>
      <polygon points="144,10 160,0 160,22 144,32" fill="#6D4C41"/>
      <rect x="0" y="10" width="144" height="22" fill="#BF7F45"/>
      <rect x="2" y="12" width="140" height="6" fill="#C89450" opacity="0.55"/>
      <rect x="8" y="30" width="128" height="7" fill="#A06838"/>
      <rect x="10" y="32" width="10" height="43" rx="2" fill="#8B5E3C"/>
      <rect x="124" y="32" width="10" height="43" rx="2" fill="#8B5E3C"/>
      <rect x="18" y="26" width="7" height="8" fill="#6D4C41"/>
      <rect x="130" y="26" width="7" height="8" fill="#6D4C41"/>
    `),

    /* ── DINING CHAIR (60×80)  DX=8 DY=8 ── */
    diningChair: svg('0 0 60 80', `
      <polygon points="8,8 52,8 60,0 16,0" fill="#FF7043"/>
      <polygon points="52,8 60,0 60,38 52,46" fill="#BF360C"/>
      <rect x="8" y="8" width="44" height="38" fill="#E64A19"/>
      <rect x="10" y="14" width="40" height="5" rx="2" fill="#BF360C"/>
      <rect x="10" y="26" width="40" height="5" rx="2" fill="#BF360C"/>
      <polygon points="4,44 52,44 60,38 12,38" fill="#FF7043"/>
      <polygon points="52,44 60,38 60,58 52,64" fill="#BF360C"/>
      <rect x="4" y="44" width="48" height="20" fill="#E64A19"/>
      <rect x="6" y="46" width="44" height="16" rx="3" fill="#EF6C00" opacity="0.55"/>
      <rect x="10" y="62" width="7" height="18" rx="2" fill="#2E1A08"/>
      <rect x="43" y="62" width="7" height="18" rx="2" fill="#2E1A08"/>
      <rect x="4" y="64" width="6" height="16" rx="2" fill="#3D2510"/>
      <rect x="50" y="64" width="6" height="16" rx="2" fill="#3D2510"/>
    `),

    /* ── BUFFET (130×75)  DX=14 DY=10 ── */
    buffet: svg('0 0 130 75', `
      <polygon points="0,10 116,10 130,0 14,0" fill="#8D6E63"/>
      <polygon points="116,10 130,0 130,65 116,75" fill="#3E2723"/>
      <rect x="0" y="10" width="116" height="65" fill="#5D4037"/>
      <rect x="0" y="10" width="116" height="7" fill="#4E342E"/>
      <line x1="58" y1="17" x2="58" y2="75" stroke="#4E342E" stroke-width="2"/>
      <rect x="3" y="20" width="52" height="48" rx="2" fill="#4E342E" opacity="0.48"/>
      <rect x="61" y="20" width="52" height="48" rx="2" fill="#4E342E" opacity="0.48"/>
      <circle cx="52" cy="46" r="4" fill="#8D6E63"/>
      <circle cx="64" cy="46" r="4" fill="#8D6E63"/>
      <rect x="0" y="68" width="116" height="7" fill="#4E342E"/>
      <rect x="4" y="68" width="8" height="7" rx="1" fill="#3E2723"/>
      <rect x="104" y="68" width="8" height="7" rx="1" fill="#3E2723"/>
    `),
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
      cc.innerHTML = `<span class="gc"></span> <span id="coin-counter-val">${Storage.getCoins()}</span>`;
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

  /* ── Depth system ───────────────────────────────────────────
     Items land freely anywhere on the floor strip (no fixed snap rows).
     Z-index = ZONE_Z_BASE + item-bottom-Y so items lower on screen
     (closer to viewer) always render in front of items higher up.
     Collision detection is restricted to items in the same floor-third
     (back / mid / front), so a coffee table in mid can sit in front of
     a couch in back without any conflict.

     Zone boundaries (relative to floor strip height FLOOR_H):
       back  — top third    (0 … FLOOR_H/3)
       mid   — middle third (FLOOR_H/3 … 2*FLOOR_H/3)
       front — bottom third (2*FLOOR_H/3 … FLOOR_H)

     Wall-mounted items use zone='wall' and z-index 5 (above CSS panels
     at 3, below all floor items which start at ZONE_Z_BASE ≈ 20+Y).
  ─────────────────────────────────────────────────────────── */
  const ZONE_Z_BASE = 20;   // floor items start here, well above CSS z-index 3

  /** Which third of the floor strip does this item occupy? */
  function zoneForY(bottomY, cH) {
    const floorTop = cH - FLOOR_H;
    const rel      = bottomY - floorTop;   // 0 = top of floor strip
    if (rel < FLOOR_H / 3)           return 'back';
    if (rel < (FLOOR_H * 2) / 3)     return 'mid';
    return 'front';
  }

  /** Clamp item onto the floor strip: item bottom aligns to cursor Y. */
  function floorY(cursorY, canvasTop, cH, itemH) {
    const floorTop = cH - FLOOR_H;
    let bottom = cursorY - canvasTop;
    bottom = Math.max(floorTop, Math.min(floorTop + FLOOR_H, bottom));
    return bottom - itemH;   // item top Y
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

    let y, zone;
    if (item.wallMounted) {
      y    = Math.round(cH * 0.38);
      zone = 'wall';
    } else {
      y    = floorY(cursorPos.y, canvasRect.top, cH, item.h);
      zone = zoneForY(y + item.h, cH);
    }

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
    // Wall items sit just above CSS panels (z=5); floor items use continuous
    // z-index so visually lower items always render in front.
    el.style.zIndex = zone === 'wall' ? 5 : ZONE_Z_BASE + Math.round(y + item.h);
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
    document.getElementById('net-msg').innerHTML   = isWinner
      ? 'Amazing! You decorated the room first!'
      : `Opponent scored ${peerScore} <span class="gc"></span> — keep going!`;
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
