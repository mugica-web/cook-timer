/**
 * House Stylist — App Controller
 *
 * Screen flow:
 *   home  ──▶  player-select ──▶ (1 Player)    ──▶ game
 *                             ──▶ (2 Players)   ──▶ 2p-options
 *                                                     ├─▶ (Same Device)  ──▶ game
 *                                                     └─▶ (Two Devices)  ──▶ room-code ──▶ game
 */

'use strict';

/* global Peer */ // loaded from PeerJS CDN in index.html

/* ================================================================
   GAME STATE
   ================================================================ */
const GameState = {
  mode: null,            // '1player' | '2p-same' | '2p-two-devices'
  multiplayerConn: null  // PeerJS DataConnection (two-devices only)
};

/* ================================================================
   SCREEN MANAGER
   ================================================================ */
const ScreenManager = (() => {
  const registry = {};

  function register(...ids) {
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) registry[id] = el;
      else console.warn(`[ScreenManager] Element #${id} not found.`);
    });
  }

  function show(id) {
    Object.values(registry).forEach(el => el.classList.remove('active'));
    if (registry[id]) {
      registry[id].classList.add('active');
    } else {
      console.warn(`[ScreenManager] Screen "${id}" is not registered.`);
    }
  }

  return { register, show };
})();

/* ================================================================
   MULTIPLAYER  (PeerJS — Two Devices mode)
   ================================================================ */
const Multiplayer = (() => {
  let peer = null;
  let conn = null;

  /**
   * Join a room using a shared code.
   *
   * Strategy:
   *  1. First player to call joinRoom() creates a named Peer (becomes HOST).
   *  2. Second player gets "unavailable-id" error, creates a random Peer,
   *     then connects to the host (becomes CONNECTOR).
   *  3. Once the DataConnection opens on either side → onConnected() fires.
   *
   * @param {string}   code        — shared room code (≥2 chars, will be uppercased)
   * @param {Function} onConnected — called on both sides when the connection is live
   * @param {Function} onStatus    — called with (state, message)
   *                                  state: 'waiting' | 'connecting' | 'connected' | 'error'
   */
  function joinRoom(code, onConnected, onStatus) {
    cleanup(); // clear any previous session

    const hostId = `hs-room-${code.toUpperCase()}`;

    // ── Attempt to become the HOST ──────────────────────────────────
    peer = new Peer(hostId);

    peer.on('open', () => {
      onStatus('waiting', `Waiting for friend… code: ${code.toUpperCase()}`);
    });

    // HOST: remote player connected to us
    peer.on('connection', incoming => {
      conn = incoming;
      GameState.multiplayerConn = conn;
      conn.on('open', () => {
        conn.send({ type: 'ready' });
        onStatus('connected', 'Connected! Starting game…');
        setTimeout(onConnected, 800);
      });
      conn.on('error', err => {
        console.error('[Multiplayer] host conn error', err);
        onStatus('error', 'Connection lost. Please try again.');
      });
    });

    peer.on('error', err => {
      if (err.type === 'unavailable-id') {
        // ── Become the CONNECTOR ──────────────────────────────────
        peer.destroy();
        peer = new Peer(); // let PeerJS assign a random ID

        peer.on('open', () => {
          onStatus('connecting', 'Found your friend! Connecting…');
          conn = peer.connect(hostId);
          GameState.multiplayerConn = conn;

          conn.on('open', () => {
            onStatus('connected', 'Connected! Starting game…');
            setTimeout(onConnected, 800);
          });
          conn.on('error', connErr => {
            console.error('[Multiplayer] connector conn error', connErr);
            onStatus('error', 'Connection failed. Check the code and try again.');
          });
        });

        peer.on('error', peerErr => {
          console.error('[Multiplayer] connector peer error', peerErr);
          onStatus('error', 'Could not connect. Please try again.');
        });

      } else {
        console.error('[Multiplayer] peer error', err);
        onStatus('error', 'Something went wrong. Please try again.');
      }
    });
  }

  /** Tear down any existing peer / connection cleanly. */
  function cleanup() {
    if (conn) {
      try { conn.close(); } catch (_) {}
      conn = null;
    }
    if (peer) {
      try { peer.destroy(); } catch (_) {}
      peer = null;
    }
    GameState.multiplayerConn = null;
  }

  return { joinRoom, cleanup };
})();

/* ================================================================
   ROOM CODE SCREEN — helpers
   ================================================================ */

function setRoomStatus(state, message) {
  const el = document.getElementById('room-status');
  if (!el) return;
  el.textContent = message;
  el.className = `room-status ${state}`;
}

function resetRoomCodeScreen() {
  const input = document.getElementById('room-code-input');
  if (input) input.value = '';
  setRoomStatus('', '');
  Multiplayer.cleanup();
}

/* ================================================================
   DOLLHOUSE — house sequence & progress screen
   ================================================================ */

/**
 * Fixed display order for the 8 rooms in a complete house.
 * Mirrors HOUSE_REQS in game.js: LR×1, bedroom×3, bathroom×2, kitchen×1, dining×1
 */
const HOUSE_SEQUENCE = [
  { type: 'living-room', label: 'Living Room', emoji: '🛋' },
  { type: 'bedroom',     label: 'Bedroom',     emoji: '🛏' },
  { type: 'bedroom',     label: 'Bedroom',     emoji: '🛏' },
  { type: 'bedroom',     label: 'Bedroom',     emoji: '🛏' },
  { type: 'bathroom',    label: 'Bathroom',    emoji: '🛁' },
  { type: 'bathroom',    label: 'Bathroom',    emoji: '🛁' },
  { type: 'kitchen',     label: 'Kitchen',     emoji: '🍳' },
  { type: 'dining-room', label: 'Dining Room', emoji: '🍽' },
];

let _nextRoomType = 'living-room'; // determined when dollhouse is populated

/** Called by game.js's requestAdvance() hook after a room finishes. */
function onRoomAdvance() {
  openDollhouse();
}

/** Called by game.js's btn-house-continue handler when 5th house resets. */
function onFullReset() {
  _showCelebration('🏆 You built 5 houses! Amazing!');
  ScreenManager.show('screen-home');
}

function openDollhouse() {
  _populateDollhouse();
  ScreenManager.show('screen-dollhouse');
}

function _populateDollhouse() {
  // Read completed rooms for this house from game.js public API
  const done   = (typeof Game !== 'undefined') ? Game.getHouseRooms() : [];
  const counts = done.reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {});

  // Figure out which rooms the player has unlocked
  const owned = (typeof ShopStorage !== 'undefined')
    ? ShopStorage.getOwnedRooms()
    : ['living-room'];

  // Assign done/next/empty status to each sequence slot
  const typeSeen = {}; // tracks how many of each type we've counted as done
  let nextFound  = false;
  _nextRoomType  = null;

  const slots = HOUSE_SEQUENCE.map(slot => {
    typeSeen[slot.type] = (typeSeen[slot.type] || 0) + 1;
    const doneSoFar     = counts[slot.type] || 0;
    const isDone        = doneSoFar >= typeSeen[slot.type];
    const isOwned       = owned.includes(slot.type);

    if (isDone) return { ...slot, state: 'done' };

    if (!nextFound && isOwned) {
      nextFound     = true;
      _nextRoomType = slot.type;
      return { ...slot, state: 'next' };
    }

    return { ...slot, state: isOwned ? 'empty' : 'locked' };
  });

  // Render cells
  const row = document.getElementById('dh-rooms-row');
  if (!row) return;
  row.innerHTML = '';

  slots.forEach(slot => {
    const cell = document.createElement('div');
    cell.className = `dh-room dh-${slot.state}`;

    const iconContent = slot.state === 'locked'  ? '🔒'
                      : slot.state === 'empty'   ? '❓'
                      : slot.emoji;

    cell.innerHTML = `
      <div class="dh-room-icon">${iconContent}</div>
      <div class="dh-room-label">${slot.label}</div>
      ${slot.state === 'next' ? '<div class="dh-next-badge">▶ Next</div>' : ''}
      ${slot.state === 'done' ? '<div class="dh-done-mark">✓</div>'      : ''}
    `;
    row.appendChild(cell);
  });

  const doneCount = slots.filter(s => s.state === 'done').length;
  const statEl    = document.getElementById('dh-stat');
  if (statEl) statEl.textContent = `${doneCount} of ${HOUSE_SEQUENCE.length} rooms built`;

  const buildBtn = document.getElementById('dh-build-next');
  if (buildBtn) buildBtn.hidden = !_nextRoomType;
}

/** Briefly shows a floating toast message on screen. */
function _showCelebration(message) {
  const el = document.createElement('div');
  el.className   = 'celebration-toast';
  el.textContent = message;
  document.body.appendChild(el);
  // Trigger animation on next frame
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 500);
  }, 3500);
}

/* ================================================================
   ROOM METADATA  (name + emoji for all 5 room types)
   ================================================================ */
const ROOM_INFO = {
  'living-room': { name: 'Living Room', emoji: '🛋' },
  'bedroom':     { name: 'Bedroom',     emoji: '🛏' },
  'bathroom':    { name: 'Bathroom',    emoji: '🛁' },
  'kitchen':     { name: 'Kitchen',     emoji: '🍳' },
  'dining-room': { name: 'Dining Room', emoji: '🍽' },
};

/* ================================================================
   GAME SCREEN — enter
   ================================================================ */

function enterGame() {
  ScreenManager.show('screen-game');
  // Initialise (or re-initialise) the game module each time we enter
  if (typeof Game !== 'undefined') Game.init();
}

/* ================================================================
   SHOP SCREEN — enter
   ================================================================ */

let _shopBackTarget = 'screen-home';

function openShop(backTarget) {
  _shopBackTarget = backTarget || 'screen-home';
  if (typeof Shop !== 'undefined') Shop.open();
  ScreenManager.show('screen-shop');
}

/* ================================================================
   ROOM DETAIL SCREEN — enter
   ================================================================ */

let _roomDetailId = 'living-room';

function openRoomDetail(roomId) {
  _roomDetailId = roomId;
  _populateRoomDetail(roomId);
  ScreenManager.show('screen-room-detail');
}

function _populateRoomDetail(roomId) {
  const info = ROOM_INFO[roomId] || { name: roomId, emoji: '🏠' };
  document.getElementById('rd-room-icon').textContent = info.emoji;
  document.getElementById('rd-room-name').textContent = info.name;

  const listEl = document.getElementById('rd-items-list');
  if (!listEl) return;
  listEl.innerHTML = '';

  // Item rows — living-room items are always owned (starter set)
  const catalogItems = (typeof SHOP_CATALOG !== 'undefined')
    ? SHOP_CATALOG.items.filter(it => it.room === roomId)
    : [];

  catalogItems.forEach(item => {
    const owned = roomId === 'living-room' ||
      (typeof ShopStorage !== 'undefined' && ShopStorage.hasItem(item.id));
    const row = document.createElement('div');
    row.className = 'rd-item-row';
    row.innerHTML = `
      <span class="rd-item-check ${owned ? 'owned' : 'missing'}">${owned ? '✓' : '✗'}</span>
      <span class="rd-item-name">${item.name}</span>
      ${!owned ? `<span class="rd-item-price"><span class="gc"></span> ${item.price}</span>` : ''}
    `;
    listEl.appendChild(row);
  });

  // Paint buckets the player already owns
  if (typeof ShopStorage !== 'undefined') {
    const paints = ShopStorage.getOwnedPaints();
    if (paints.length > 0) {
      const hdr = document.createElement('div');
      hdr.className   = 'rd-paint-header';
      hdr.textContent = '🎨 Paint Buckets';
      listEl.appendChild(hdr);
      paints.forEach(colorId => {
        const name = colorId.charAt(0).toUpperCase() + colorId.slice(1);
        const row  = document.createElement('div');
        row.className = 'rd-item-row';
        row.innerHTML = `
          <span class="rd-item-check owned">✓</span>
          <span class="rd-item-name">${name} Paint</span>
        `;
        listEl.appendChild(row);
      });
    }
  }
}

/* ================================================================
   INIT — wire everything up
   ================================================================ */

function init() {
  ScreenManager.register(
    'screen-home',
    'screen-player-select',
    'screen-2p-options',
    'screen-room-code',
    'screen-game',
    'screen-shop',
    'screen-room-detail',
    'screen-dollhouse'
  );

  // ── Home screen ─────────────────────────────────────────────────
  document.getElementById('btn-play')?.addEventListener('click', () => {
    ScreenManager.show('screen-player-select');
  });

  document.getElementById('btn-shop')?.addEventListener('click', () => {
    openShop('screen-home');
  });

  // ── Player Select screen ─────────────────────────────────────────
  document.getElementById('psel-home')?.addEventListener('click', () => {
    ScreenManager.show('screen-home');
  });

  document.getElementById('btn-1player')?.addEventListener('click', () => {
    GameState.mode = '1player';
    enterGame();
  });

  document.getElementById('btn-2players')?.addEventListener('click', () => {
    ScreenManager.show('screen-2p-options');
  });

  // ── 2-Player Options screen ──────────────────────────────────────
  document.getElementById('2popt-home')?.addEventListener('click', () => {
    ScreenManager.show('screen-home');
  });

  document.getElementById('2popt-back')?.addEventListener('click', () => {
    ScreenManager.show('screen-player-select');
  });

  document.getElementById('btn-same-device')?.addEventListener('click', () => {
    GameState.mode = '2p-same';
    enterGame();
  });

  document.getElementById('btn-two-devices')?.addEventListener('click', () => {
    resetRoomCodeScreen();
    ScreenManager.show('screen-room-code');
  });

  // ── Room Code screen ─────────────────────────────────────────────
  document.getElementById('rc-home')?.addEventListener('click', () => {
    Multiplayer.cleanup();
    ScreenManager.show('screen-home');
  });

  document.getElementById('rc-back')?.addEventListener('click', () => {
    Multiplayer.cleanup();
    ScreenManager.show('screen-2p-options');
  });

  // Strip non-alphanumeric and force uppercase as the user types
  document.getElementById('room-code-input')?.addEventListener('input', e => {
    const clean = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (e.target.value !== clean) e.target.value = clean;
  });

  // Enter key submits
  document.getElementById('room-code-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-join-room')?.click();
  });

  document.getElementById('btn-join-room')?.addEventListener('click', () => {
    const code = document.getElementById('room-code-input')?.value.trim() ?? '';

    if (code.length < 2) {
      setRoomStatus('error', 'Please enter at least 2 characters!');
      return;
    }

    const joinBtn = document.getElementById('btn-join-room');
    joinBtn.disabled = true;
    joinBtn.style.opacity = '0.6';

    Multiplayer.joinRoom(
      code,
      /* onConnected */ () => {
        GameState.mode = '2p-two-devices';
        enterGame();
        joinBtn.disabled = false;
        joinBtn.style.opacity = '';
      },
      /* onStatus */ (state, message) => {
        setRoomStatus(state, message);
        if (state === 'error') {
          joinBtn.disabled = false;
          joinBtn.style.opacity = '';
        }
      }
    );
  });

  // ── Game screen nav ──────────────────────────────────────────────
  document.getElementById('game-home')?.addEventListener('click', () => {
    Multiplayer.cleanup();
    ScreenManager.show('screen-home');
  });

  // ── Shop screen nav ──────────────────────────────────────────────
  document.getElementById('shop-home')?.addEventListener('click', () => {
    ScreenManager.show('screen-home');
  });

  document.getElementById('shop-back')?.addEventListener('click', () => {
    ScreenManager.show(_shopBackTarget);
  });

  // ── Dollhouse progress screen ────────────────────────────────────
  document.getElementById('dh-home')?.addEventListener('click', () => {
    ScreenManager.show('screen-home');
  });

  document.getElementById('dh-build-next')?.addEventListener('click', () => {
    if (_nextRoomType) {
      if (typeof Game !== 'undefined') Game.setRoomType(_nextRoomType);
      GameState.mode = GameState.mode || '1player';
      enterGame();
    }
  });

  // ── Room Detail screen ───────────────────────────────────────────
  document.getElementById('rd-home')?.addEventListener('click', () => {
    ScreenManager.show('screen-home');
  });

  document.getElementById('rd-back')?.addEventListener('click', () => {
    if (typeof Shop !== 'undefined') Shop.refresh();
    ScreenManager.show('screen-shop');
  });

  document.getElementById('rd-play')?.addEventListener('click', () => {
    GameState.mode = GameState.mode || '1player';
    if (typeof Game !== 'undefined') Game.setRoomType(_roomDetailId);
    enterGame();
  });
}

document.addEventListener('DOMContentLoaded', init);
