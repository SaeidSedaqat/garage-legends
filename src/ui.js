// DOM interface layered over the Phaser canvas: HUD, menus, race HUD and dialogs.
// HTML keeps text crisp and lets menus scroll naturally on phones.
import {
  state, changed, carDef, tunedSpec, carPR, stockPR, previewSpec, upgradeLevel, upgradeCost, upgradeLock, buyUpgrade,
  carLock, buyCar, selectCar, totalStars, clickValue, autoRate, autoUnlocked, garageCost, buyGarage,
  envUnlocked, eventUnlocked, latestEvent, eventDef, legendUnlocked, legendEvent, resetSave, achievementProgress,
} from './state.js';
import {
  CARS, EVENTS, ENVS, OPPONENTS, DIST, CAR_UPGRADES, MAX_LEVEL, CLICK_BASE, AUTO_CPS, AUTO_UNLOCK, MILESTONES, MEDALS, STAR_BONUS, LEGEND,
  ACHIEVEMENTS,
} from './data.js';
import { pr, zones, launchBand } from './physics.js';
import { bus } from './events.js';
import { sfx, setMuted } from './audio.js';
import { carPreview } from './art.js';

const $ = id => document.getElementById(id);

// $950 · $12.4K · $3.50M · $1.2B (GDD §9.1)
export function fmt(n) {
  n = Math.floor(n);
  if (n < 10000) return '$' + n.toLocaleString('en-US');
  if (n < 1e6) return `$${(n / 1e3).toFixed(n < 1e5 ? 1 : 0)}K`;
  if (n < 1e9) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${(n / 1e9).toFixed(1)}B`;
}

const svg = body => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const ICONS = {
  engine: svg('<path d="M3 10h2V8h4V6h6v2h2l2 2h2v6h-2l-2 2H9l-2-2H5v-2H3z"/>'),
  turbo: svg('<circle cx="10" cy="13" r="6"/><path d="M10 13l3-3M16 13h5M19 10l2 3-2 3"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
  tire: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5"/>'),
  coin: svg('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>'),
  crew: svg('<rect x="6" y="8" width="12" height="10" rx="3"/><path d="M12 4v4M9 13h.01M15 13h.01M4 13H2M22 13h-2"/>'),
  car: svg('<path d="M3 16v-3l2-5h14l2 5v3"/><path d="M3 16h18v2h-3M6 18H3"/><circle cx="7" cy="16" r="2"/><circle cx="17" cy="16" r="2"/>'),
  flag: svg('<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>'),
  wrench: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  soundOn: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>'),
  soundOff: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>'),
  pause: svg('<path d="M9 5v14M15 5v14"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  check: svg('<path d="m5 12 5 5 9-10"/>'),
  warn: svg('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
  cross: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  star: '<svg viewBox="0 0 24 24"><path d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  trophy: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
};

let game = null;
let panel = null;
let tab = 'car';
let envTab = 'countryside';
let hud = null;
let taps = 0;

export function init(g) {
  game = g;
  $('nav-upgrades').innerHTML = `${ICONS.wrench}<span>Upgrades</span><i class="badge"></i>`;
  $('nav-cars').innerHTML = `${ICONS.car}<span>Cars</span><i class="badge"></i>`;
  $('nav-races').innerHTML = `${ICONS.flag}<span>Race</span>`;
  $('sheet-close').innerHTML = ICONS.close;
  $('btn-pause').innerHTML = ICONS.pause;

  document.querySelectorAll('[data-panel]').forEach(b => b.addEventListener('click', () => {
    sfx.click();
    if (panel === b.dataset.panel) closePanel();
    else openPanel(b.dataset.panel);
  }));
  $('sheet-close').addEventListener('click', () => { sfx.click(); closePanel(); });
  $('sheet-body').addEventListener('click', onSheetClick);
  $('sheet-tabs').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    sfx.click();
    if (panel === 'races') envTab = b.dataset.tab; else tab = b.dataset.tab;
    renderPanel();
  });
  $('goal-chip').addEventListener('click', () => {
    const g = goal();
    sfx.click();
    if (g.envTab) envTab = g.envTab;
    if (g.tab) tab = g.tab;
    if (g.panel) openPanel(g.panel, true);
  });
  $('btn-trophies').insertAdjacentHTML('afterbegin', ICONS.trophy);
  $('btn-trophies').addEventListener('click', () => { sfx.click(); showAchievements(); });
  $('btn-settings').innerHTML = ICONS.settings;
  $('btn-settings').addEventListener('click', () => { sfx.click(); showSettings(); });
  setMuted(state.muted);
  applyMotion();
  bus.on('achievement', list => list.forEach(a => toast(`🏆 ${a.name}${a.reward ? ` · +${fmt(a.reward)}` : ''}`, 'trophy')));

  // keyboard: Enter presses a dialog's main button; in the garage 1/2/3 open
  // Race/Upgrades/Cars and Escape closes the top panel (GDD §10.10)
  window.addEventListener('keydown', e => {
    if (e.code === 'Enter' && !$('modal').hidden && !e.repeat) {
      $('modal-card').querySelector('.actions .btn.go')?.click();
      return;
    }
    if ($('garage-ui').hidden || e.repeat) return;
    if (e.code === 'Escape') { if (!$('modal').hidden) { hideModal(); coachUpdate(); } else closePanel(); }
    if (!$('modal').hidden) return;
    const map = { Digit1: 'races', Digit2: 'upgrades', Digit3: 'cars' };
    if (map[e.code]) openPanel(map[e.code]);
  });

  bus.on('change', what => {
    renderWallet();
    if (!panel) return;
    if (what === 'money') refreshAfford();
    else renderPanel();
  });
  taps = Math.min(8, state.stats.clicks);
  if (taps >= 8) $('tap-hint').classList.add('gone');
  bus.on('tap', () => { if (++taps === 8) $('tap-hint').classList.add('gone'); });
  window.addEventListener('resize', () => { bus.emit('focus'); coachUpdate(); });
  $('sheet-body').addEventListener('scroll', coachUpdate, { passive: true });
  $('sheet').addEventListener('transitionend', coachUpdate);
  renderWallet();
}

function toggleSound() {
  state.muted = !state.muted;
  setMuted(state.muted);
  changed('settings');
}

function applyMotion() {
  document.body.classList.toggle('reduced', state.reducedMotion);
}

// ---------------------------------------------------------------- garage

let lastChip = '';
function renderWallet() {
  $('money').textContent = fmt(state.cash);
  $('rate-click').textContent = `+${fmt(clickValue())} / tap`;
  const auto = autoRate();
  $('rate-auto').textContent = auto ? `+${fmt(auto)} / sec` : '';
  const car = carDef(state.car), title = MILESTONES.find(m => m.title && totalStars() >= m.stars)?.title;
  const chip = `<span class="chip-name">${car.name}</span><span class="chip-tier">${title ? `<span class="chip-title">${title}</span><span class="sep"> · </span>` : ''}PR ${carPR(state.car)} · <b class="stars-inline">★ ${totalStars()}</b></span>`;
  if ($('car-chip').innerHTML !== chip) $('car-chip').innerHTML = chip;
  const g = goal(), gc = `<span class="goal-label">Next</span>${g.text}`;
  if (gc !== lastChip) { $('goal-chip').innerHTML = gc; lastChip = gc; }
  $('nav-upgrades').classList.toggle('has-badge', upgradeAffordable());
  $('nav-cars').classList.toggle('has-badge', CARS.some(c => !state.owned.includes(c.id) && !carLock(c.id) && c.price <= state.cash));
  $('btn-trophies').classList.toggle('has-badge', Object.keys(state.achievements).length > (state.achSeen || 0));
  coachUpdate();
}

function upgradeAffordable() {
  return Object.keys(CAR_UPGRADES).some(k => !upgradeLock(k) && upgradeCost(k) != null && upgradeCost(k) <= state.cash)
    || (garageCost('click') ?? Infinity) <= state.cash || (autoUnlocked() && (garageCost('auto') ?? Infinity) <= state.cash);
}

// The single "Next goal" chip (GDD §2.3).
function goal() {
  if (!state.tutorial.upgraded && state.cash >= upgradeCost('engine', 'kaze')) return { text: 'Buy your first upgrade', panel: 'upgrades', tab: 'car' };
  const fresh = EVENTS.find(e => eventUnlocked(e) && !state.events[e.id]?.won);
  if (fresh) return { text: `Race: ${fresh.name}`, panel: 'races', envTab: fresh.env };
  const car = CARS.find(c => !state.owned.includes(c.id) && !carLock(c.id) && c.price <= state.cash);
  if (car) return { text: `Buy the ${car.name}`, panel: 'cars' };
  const cheap = Object.keys(CAR_UPGRADES).find(k => !upgradeLock(k) && upgradeCost(k) != null && upgradeCost(k) <= state.cash * 0.25);
  if (cheap) return { text: `Upgrade: ${CAR_UPGRADES[cheap].name}`, panel: 'upgrades', tab: 'car' };
  const next = CARS.find(c => !state.owned.includes(c.id) && !carLock(c.id));
  if (next) return { text: `Save for the ${next.name} (${fmt(next.price)})`, panel: 'cars' };
  if (legendUnlocked()) return { text: `Legend Series: Round ${state.legend.round}`, panel: 'races', envTab: 'legend' };
  const m = MILESTONES.find(x => x.stars > totalStars());
  return m ? { text: `Earn ${m.stars}★ for ${m.cash ? fmt(m.cash) : m.decor}`, panel: 'races' } : { text: 'You are a Garage Legend!' };
}

const sideSheet = () => matchMedia('(min-width: 860px) and (orientation: landscape)').matches;

// Free screen area (CSS px) where the garage scene should frame the car.
export function garageFocus(ignoreBottomSheet = false) {
  const W = innerWidth, H = innerHeight;
  const top = $('goal-chip').getBoundingClientRect().bottom;
  let bottom = $('nav').getBoundingClientRect().top;
  let right = W;
  if (panel) {
    const sheet = $('sheet');
    if (sideSheet()) right = W - sheet.offsetWidth - 16;
    else if (!ignoreBottomSheet) bottom = H - sheet.offsetHeight;
  }
  return { x: 0, y: top, w: right, h: Math.max(80, bottom - top) };
}

function openPanel(name, keepTab = false) {
  if (!keepTab) {
    if (name === 'upgrades' && panel !== 'upgrades') tab = 'car';
    if (name === 'races') envTab = EVENTS.every(e => state.events[e.id]?.won) && legendUnlocked() ? 'legend' : latestEvent().env;
  }
  panel = name;
  renderPanel();
  $('sheet').classList.add('open');
  $('sheet').setAttribute('aria-hidden', 'false');
  document.querySelectorAll('[data-panel]').forEach(b => b.classList.toggle('active', b.dataset.panel === name));
  bus.emit('focus');
}

export function closePanel() {
  if (!panel) return;
  panel = null;
  $('sheet').classList.remove('open');
  $('sheet').setAttribute('aria-hidden', 'true');
  document.querySelectorAll('[data-panel]').forEach(b => b.classList.remove('active'));
  bus.emit('focus');
}

const tabsHtml = (list, on) => list.map(([id, label, locked]) => `<button class="tab ${id === on ? 'on' : ''} ${locked ? 'locked' : ''}" data-tab="${id}">${locked ? ICONS.lock : ''}${label}</button>`).join('');

function renderPanel() {
  const titles = { upgrades: 'Upgrades', cars: 'Cars', races: 'Race' };
  $('sheet-title').textContent = titles[panel];
  $('sheet-tabs').innerHTML = panel === 'upgrades' ? tabsHtml([['car', 'Car'], ['garage', 'Garage']], tab)
    : panel === 'races' ? tabsHtml([...ENVS.map(v => [v.id, v.short, !envUnlocked(v)]), ['legend', 'Legend', !legendUnlocked()]], envTab) : '';
  const scroll = $('sheet-body').scrollTop;
  $('sheet-body').innerHTML = panel === 'upgrades' ? (tab === 'car' ? renderCarUpgrades() : renderGarageUpgrades())
    : panel === 'cars' ? renderCars() : renderRaces();
  $('sheet-body').scrollTop = scroll;
  refreshAfford();
  coachUpdate();
}

const pips = (lvl, max = MAX_LEVEL) => `<div class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>`;

function buyButton(action, id, cost, lock) {
  if (lock) return `<div class="locked-note">${ICONS.lock}<span>${lock}</span></div>`;
  if (cost == null) return '<span class="max-tag">MAX</span>';
  return `<button class="btn buy" data-action="${action}" data-id="${id}" data-cost="${cost}">${fmt(cost)}</button>`;
}

function renderCarUpgrades() {
  const car = carDef(state.car), now = tunedSpec();
  const statName = { accel: 'Accel', topSpeed: 'Top', launch: 'Launch' };
  const hint = `<p class="hint">Tuning your <b>${car.name}</b> · PR <b>${carPR(state.car)}</b>. Each car keeps its own parts.</p>`;
  return hint + Object.entries(CAR_UPGRADES).map(([id, u]) => {
    const lvl = upgradeLevel(id), cost = upgradeCost(id), lock = upgradeLock(id);
    let preview = '';
    if (cost != null && !lock) {
      const next = previewSpec(id);
      const stat = u.stat ? `${statName[u.stat]} ${now[u.stat].toFixed(1)} → ${next[u.stat].toFixed(1)} · ` : `Shift zones +4% · `;
      preview = `${stat}PR ${pr(now)} → <b>${pr(next)}</b>`;
    }
    return `<div class="card upg ${cost == null ? 'maxed' : ''}">
      <div class="icon">${ICONS[u.icon]}</div>
      <div class="info">
        <div class="name">${u.name} <span class="lvl">Lv ${lvl}/${MAX_LEVEL}</span></div>
        <div class="desc">${u.desc}</div>
        ${preview ? `<div class="effect">${preview}</div>` : ''}
        ${pips(lvl)}
      </div>
      ${buyButton('upgrade', id, cost, lock)}
    </div>`;
  }).join('');
}

function renderGarageUpgrades() {
  const stars = totalStars(), mult = 1 + STAR_BONUS * stars;
  const m = MILESTONES.find(x => x.stars > stars);
  const rep = `<div class="rep"><span class="rep-stars">${ICONS.star}${stars}</span><div><b>Reputation</b> · tap income ×${mult.toFixed(2)}<div class="desc">${m ? `Next: ${m.stars}★ for ${m.cash ? fmt(m.cash) : m.decor}` : 'Every star earned!'}</div></div></div>`;
  const cp = state.clickPower, au = state.automation;
  const clickCard = `<div class="card upg ${cp >= MAX_LEVEL ? 'maxed' : ''}">
    <div class="icon income">${ICONS.coin}</div>
    <div class="info">
      <div class="name">Click Power <span class="lvl">Lv ${cp}/${MAX_LEVEL}</span></div>
      <div class="desc">Cash for every tap on your car.</div>
      <div class="effect">Base $${CLICK_BASE[cp]}${cp < MAX_LEVEL ? ` → <b>$${CLICK_BASE[cp + 1]}</b>` : ''} per tap</div>
      ${pips(cp)}
    </div>
    ${buyButton('garage', 'click', garageCost('click'))}
  </div>`;
  const autoCard = `<div class="card upg ${au >= MAX_LEVEL ? 'maxed' : ''}">
    <div class="icon income">${ICONS.crew}</div>
    <div class="info">
      <div class="name">Garage Automation <span class="lvl">Lv ${au}/${MAX_LEVEL}</span></div>
      <div class="desc">Taps your car for you, even while you're away (half rate, up to 2 h).</div>
      <div class="effect">${AUTO_CPS[au]} taps/s${au < MAX_LEVEL ? ` → <b>${AUTO_CPS[au + 1]} taps/s</b>` : ''}</div>
      ${pips(au)}
    </div>
    ${buyButton('garage', 'auto', garageCost('auto'), autoUnlocked() ? null : `Win ${eventDef(AUTO_UNLOCK).name}`)}
  </div>`;
  const decor = MILESTONES.filter(x => x.decor).map(x => {
    const on = stars >= x.stars;
    return `<div class="decor ${on ? 'on' : ''}">${on ? ICONS.check : ICONS.lock}<span>${x.decor}</span><b>${x.stars}★</b></div>`;
  }).join('');
  return rep + clickCard + autoCard + `<div class="hint">Garage decor, earned with stars</div><div class="decor-list">${decor}</div>`;
}

const windowLabel = w => (w >= 0.8 ? 'Wide' : w >= 0.7 ? 'Normal' : 'Narrow');

function stat(label, value, max) {
  return `<div class="stat"><span>${label}</span><div class="bar"><i style="width:${Math.min(100, (value / max) * 100)}%"></i></div><b>${Math.round(value)}</b></div>`;
}

function renderCars() {
  return CARS.map(c => {
    const owned = state.owned.includes(c.id), driving = state.car === c.id, lock = carLock(c.id);
    const s = owned ? tunedSpec(c.id) : c.stats;
    let btn;
    if (driving) btn = '<button class="btn" disabled>Driving</button>';
    else if (owned) btn = `<button class="btn go" data-action="select" data-id="${c.id}">Drive</button>`;
    else if (lock) btn = `<div class="locked-note wide">${ICONS.lock}<span>${lock} · ${fmt(c.price)}</span></div>`;
    else btn = `<button class="btn buy" data-action="car" data-id="${c.id}" data-cost="${c.price}">${fmt(c.price)}</button>`;
    return `<div class="card car ${driving ? 'selected' : ''} ${lock ? 'silhouette' : ''}">
      <img src="${carPreview(`garage-${c.id}`)}" alt="${c.name}">
      <div class="info">
        <div class="name">${c.name} <span class="tier">Tier ${c.tier}</span></div>
        <div class="pr-line">PR <b>${owned ? carPR(c.id) : stockPR(c.id)}</b> · ${c.stats.gears} gears · ${windowLabel(c.stats.shiftWindow)} shift window</div>
        <div class="desc quirk">${c.niche}</div>
      </div>
      <div class="stats">
        ${stat('Launch', s.launch, 130)}
        ${stat('Accel', s.accel, 130)}
        ${stat('Top speed', s.topSpeed, 130)}
      </div>
      ${btn}
    </div>`;
  }).join('');
}

// ✓ at or above, ⚠ within 10% below, ✕ more than 10% below (GDD §7.3)
function prCheck(rec) {
  const mine = carPR(state.car);
  if (mine >= rec) return `<span class="prc ok">${ICONS.check}PR ${rec}</span>`;
  if (mine >= rec * 0.9) return `<span class="prc warn">${ICONS.warn}PR ${rec}</span>`;
  return `<span class="prc bad">${ICONS.cross}PR ${rec}</span>`;
}

const starRow = (n, cls = '') => `<span class="star-row ${cls}">${[0, 1, 2].map(i => `<i class="${i < n ? 'on' : ''}">${ICONS.star}</i>`).join('')}</span>`;

function renderLegend() {
  const head = `<div class="loc"><div><div class="loc-name">Legend Series</div><div class="desc">Your car: <b>${carDef(state.car).name}</b> · PR <b>${carPR(state.car)}</b></div></div><span class="tag">Endless</span></div>`;
  if (!legendUnlocked()) {
    return head + `<div class="card locked-env">${ICONS.lock}<div><b>Locked</b><div class="desc">Win ${eventDef(LEGEND.unlock).name} to enter the Legend Series.</div></div></div>`;
  }
  const L = state.legend;
  const intro = `<p class="hint">Endless rounds against the fastest drivers around. Every win moves you up a round and the rivals get quicker each time. Best: <b>${L.best ? `Round ${L.best}` : 'none yet'}</b></p>`;
  return head + intro + [0, 1, 2].map(k => {
    const e = legendEvent(L.round + k), env = ENVS.find(v => v.id === e.env), open = k === 0;
    return `<div class="card race ${open ? '' : 'locked'}">
      <div class="info">
        <div class="name">Round ${e.legend} ${open ? '<span class="new-tag">NEXT</span>' : ''}</div>
        <div class="desc">${env.short} · ${DIST[e.dist].label} · vs <b>${OPPONENTS[e.opp].name}</b></div>
        <div class="effect">${prCheck(e.rec)} <span class="reward">${fmt(e.win)}</span></div>
      </div>
      ${open ? `<button class="btn go" data-action="race" data-id="${e.id}">Race</button>` : `<div class="locked-note">${ICONS.lock}<span>Win round ${e.legend - 1}</span></div>`}
    </div>`;
  }).join('');
}

function renderRaces() {
  if (envTab === 'legend') return renderLegend();
  const env = ENVS.find(v => v.id === envTab);
  const head = `<div class="loc"><div><div class="loc-name">${env.name}</div><div class="desc">Your car: <b>${carDef(state.car).name}</b> · PR <b>${carPR(state.car)}</b></div></div><span class="tag">${env.tag}</span></div>`;
  if (!envUnlocked(env)) {
    return head + `<div class="card locked-env">${ICONS.lock}<div><b>Locked</b><div class="desc">Win ${eventDef(env.requires).name} to unlock this venue.</div></div></div>`;
  }
  const list = EVENTS.filter(e => e.env === env.id);
  return head + list.map((e, i) => {
    const rec = state.events[e.id], open = eventUnlocked(e), o = OPPONENTS[e.opp];
    const reward = rec?.won ? fmt(e.win) : `${fmt(e.win + e.first + (e.champion || 0))}`;
    const right = open
      ? `<button class="btn go" data-action="race" data-id="${e.id}">Race</button>`
      : `<div class="locked-note">${ICONS.lock}<span>Win ${list[i - 1].name}</span></div>`;
    return `<div class="card race ${open ? '' : 'locked'}">
      <div class="info">
        <div class="name">${e.name} ${open && !rec?.won ? '<span class="new-tag">NEW</span>' : ''}</div>
        <div class="desc">${env.short} ${i + 1}/${list.length} · ${DIST[e.dist].label} · vs <b>${o.name}</b></div>
        <div class="effect">${prCheck(e.rec)} ${starRow(rec?.stars || 0)} <span class="reward">${reward}</span></div>
        ${rec?.best ? `<div class="desc">Best ${rec.best.toFixed(2)}s · ★★ ${MEDALS[e.id][0]}s · ★★★ ${MEDALS[e.id][1]}s</div>` : ''}
      </div>
      ${right}
    </div>`;
  }).join('');
}

function refreshAfford() {
  document.querySelectorAll('#sheet-body [data-cost]').forEach(b => b.classList.toggle('poor', state.cash < +b.dataset.cost));
}

function onSheetClick(e) {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const { action, id } = b.dataset;
  const need = () => toast(`Need ${fmt(+b.dataset.cost - state.cash)} more`);
  if (action === 'upgrade') {
    if (buyUpgrade(id)) sfx.buy(); else { sfx.deny(); need(); }
  } else if (action === 'garage') {
    if (buyGarage(id)) sfx.buy(); else { sfx.deny(); need(); }
  } else if (action === 'car') {
    if (buyCar(id)) { sfx.buy(); toast(`The ${carDef(id).name} is yours!`); } else { sfx.deny(); need(); }
  } else if (action === 'select') {
    sfx.click();
    selectCar(id);
  } else if (action === 'race') {
    sfx.click();
    showMatchup(id);
  }
}

function showScreen(name) {
  $('garage-ui').hidden = name !== 'garage';
  $('race-ui').hidden = name !== 'race';
  hideModal();
}

export function showGarage() {
  $('loading').classList.add('done');
  setTimeout(() => { $('loading').hidden = true; }, 450); // fades can stall in background tabs
  showScreen('garage');
  renderWallet();
  bus.emit('focus');
}

// Works from the garage and from a finished race ("Next event"), which restarts the race scene.
function startRace(id) {
  closePanel();
  coachOff();
  showScreen('race');
  game.scene.stop('garage');
  game.scene.start('race', { eventId: id });
}

function toGarage() {
  game.scene.stop('race');
  game.scene.start('garage');
}

// ---------------------------------------------------------------- pre-race matchup (GDD §7.3)

// The opponent's raw PR isn't shown: rookies drive worse than their PR suggests, so the
// recommended PR is the honest comparison.
function verdict(mine, rec) {
  if (mine >= rec) return ['ok', "You're the favorite"];
  if (mine >= rec * 0.9) return ['warn', 'Close match: drive clean'];
  return ['bad', 'Underpowered: upgrade first'];
}

export function showMatchup(id) {
  const e = eventDef(id), o = OPPONENTS[e.opp], env = ENVS.find(v => v.id === e.env), car = carDef(state.car);
  const mine = carPR(state.car), rec = state.events[e.id], [cls, text] = verdict(mine, e.rec);
  const reward = e.win + (rec?.won ? 0 : e.first + (e.champion || 0));
  const chips = state.owned.length < 2 ? '' : `<div class="mu-cars"><div class="label">Change car</div><div class="mu-chips">${
    state.owned.map(c => `<button class="mu-chip ${c === state.car ? 'on' : ''}" data-car="${c}">${carDef(c).name}<b>PR ${carPR(c)}</b></button>`).join('')}</div></div>`;
  modal(`
    <div class="mu-title">${e.name}</div>
    <div class="result-sub">${env.name} · ${DIST[e.dist].label}${e.legend ? '' : ` · ${env.short} ${EVENTS.filter(x => x.env === e.env).indexOf(e) + 1}/5`}</div>
    <div class="mu-vs">
      <div class="mu-side"><img src="${carPreview(`car-${state.car}`)}" alt=""><div class="mu-name">${car.name}</div><div class="mu-pr">PR ${mine}</div><div class="mu-who">You</div></div>
      <div class="mu-mid">VS</div>
      <div class="mu-side opp"><img src="${carPreview(`opp-${e.opp}`)}" alt=""><div class="mu-name">${o.name}</div><div class="mu-pr">${o.ai.name}</div><div class="mu-who">Rival</div></div>
    </div>
    <div class="mu-verdict ${cls}">${prCheck(e.rec)}<span>${text}</span></div>
    <div class="rows">
      <div class="row"><span>${rec?.won || e.legend ? 'Win' : 'First win'}</span><span class="plus">${fmt(reward)}</span></div>
      ${rec?.best ? `<div class="row"><span>Your best</span><span>${rec.best.toFixed(2)}s</span></div>` : ''}
      ${e.legend ? '' : `<div class="row"><span>Stars ${starRow(rec?.stars || 0)}</span><span>★★ ${MEDALS[e.id][0]}s · ★★★ ${MEDALS[e.id][1]}s</span></div>`}
    </div>
    ${chips}
    <div class="actions"><button class="btn" data-m="back">Back</button><button class="btn go" data-m="race" id="mu-race">RACE!</button></div>`, {
    back: () => { if ($('garage-ui').hidden) toGarage(); else coachUpdate(); },
    race: () => startRace(id),
  });
  const base = $('modal-card').onclick;
  $('modal-card').onclick = ev => {
    const c = ev.target.closest('[data-car]');
    if (!c) return base(ev);
    sfx.click();
    selectCar(c.dataset.car);
    showMatchup(id);
  };
  $('modal-card').classList.add('matchup');
  coachUpdate();
}

// ---------------------------------------------------------------- achievements

export function showAchievements() {
  const done = ACHIEVEMENTS.filter(a => state.achievements[a.id]).length;
  state.achSeen = Object.keys(state.achievements).length;
  changed('settings');
  const num = n => (n >= 1e4 ? fmt(n).slice(1) : n.toLocaleString('en-US'));
  const rows = ACHIEVEMENTS.map(a => {
    const got = !!state.achievements[a.id], p = achievementProgress(a);
    return `<div class="ach ${got ? 'on' : ''}">
      <div class="ach-icon">${got ? ICONS.trophy : ICONS.lock}</div>
      <div class="ach-info"><b>${a.name}</b><small>${a.desc}</small>
        ${got || a.goal === 1 ? '' : `<div class="bar"><i style="width:${(p / a.goal) * 100}%"></i></div><small>${num(Math.floor(p))} / ${num(a.goal)}</small>`}</div>
      <span class="ach-reward">${got ? ICONS.check : a.reward ? fmt(a.reward) : ''}</span>
    </div>`;
  }).join('');
  modal(`<div class="result-title">Achievements</div><div class="result-sub">${done} / ${ACHIEVEMENTS.length} unlocked</div>
    <div class="ach-list">${rows}</div>
    <div class="actions"><button class="btn go" data-m="close">Close</button></div>`, { close: coachUpdate });
}

// ---------------------------------------------------------------- settings

export function showSettings() {
  const s = state.stats;
  const toggle = (id, on, label, desc) => `<button class="set-row" data-set="${id}"><span><b>${label}</b><small>${desc}</small></span><i class="switch ${on ? 'on' : ''}"></i></button>`;
  const unit = u => `<button data-set="${u}" class="${state.units === u ? 'on' : ''}">${u === 'mph' ? 'MPH' : 'KM/H'}</button>`;  modal(`
    <div class="result-title">Settings</div>
    <div class="set-list">
      ${toggle('sound', !state.muted, 'Sound', 'Engine, lights and effects')}
      ${toggle('motion', state.reducedMotion, 'Reduce motion', 'Fewer shakes, bounces and flashes')}
      <div class="set-row"><span><b>Speed units</b><small>Shown on the speedometer</small></span><span class="seg">${unit('kmh')}${unit('mph')}</span></div>
    </div>
    <div class="rows">
      <div class="row"><span>Races</span><span>${s.races} · ${s.wins} won</span></div>
      <div class="row"><span>Perfect shifts</span><span>${s.perfectShifts}</span></div>
      <div class="row"><span>Earned from taps</span><span>${fmt(s.fromClicks)}</span></div>
      <div class="row"><span>Earned from races</span><span>${fmt(s.fromRaces)}</span></div>
      <div class="row"><span>Earned by your crew</span><span>${fmt(s.fromAuto)}</span></div>
      ${state.legend.best ? `<div class="row"><span>Best Legend round</span><span>${state.legend.best}</span></div>` : ''}
    </div>
    <button class="btn danger wide" data-set="reset">Reset progress</button>
    <div class="actions"><button class="btn go" data-m="close">Done</button></div>`, { close: coachUpdate });
  const base = $('modal-card').onclick;
  $('modal-card').onclick = ev => {
    const b = ev.target.closest('[data-set]');
    if (!b) return base(ev);
    sfx.click();
    const k = b.dataset.set;
    if (k === 'sound') { toggleSound(); b.querySelector('.switch').classList.toggle('on', !state.muted); return; }
    if (k === 'motion') state.reducedMotion = !state.reducedMotion;
    if (k === 'mph' || k === 'kmh') { state.units = k; state.unitsChosen = true; }
    if (k === 'reset') {
      if (b.dataset.armed) return resetSave();
      b.dataset.armed = '1';
      b.textContent = 'Tap again to erase everything';
      return;
    }
    applyMotion();
    changed('settings');
    b.querySelector('.switch')?.classList.toggle('on', state.reducedMotion);
    b.parentElement.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x.dataset.set === state.units));
  };
}

// ---------------------------------------------------------------- first-session guide (GDD §2.3)

// One coach mark at a time: a pulsing ring on the target and a bubble pointing at it.
let coachEl = null;
export function coach(el, text) {
  if (coachEl && coachEl !== el) coachEl.classList.remove('coach-target');
  const box = $('coach');
  const show = !!el && el.isConnected && el.getClientRects().length > 0;
  $('tap-hint').classList.toggle('coached', show);
  if (!show) {
    coachEl = null;
    box.hidden = true;
    return;
  }
  coachEl = el;
  el.classList.add('coach-target');
  if ($('coach-text').textContent !== text) $('coach-text').textContent = text;
  box.hidden = false;
  const r = el.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
  const above = el.id !== 'goal-chip' && r.top > bh + 24;
  const x = Math.min(innerWidth - bw - 8, Math.max(8, r.left + r.width / 2 - bw / 2));
  box.classList.toggle('below', !above);
  box.style.left = `${x}px`;
  box.style.top = `${above ? r.top - bh - 12 : r.bottom + 12}px`;
  box.style.setProperty('--arrow', `${Math.min(bw - 18, Math.max(18, r.left + r.width / 2 - x))}px`);
}
export const coachOff = () => coach(null);

// An open bottom sheet covers the nav bar, so point at the goal chip (which opens the same panel).
const navTarget = name => (panel && !sideSheet() ? $('goal-chip') : $(`nav-${name}`));

// Tap the car → buy the first upgrade → win the first race. Returns [element, text] or null.
function guideStep() {
  const t = state.tutorial;
  if (t.done) return null;
  if (t.upgraded && t.raced) {
    t.done = true;
    changed('settings');
    return null;
  }
  if (!$('modal').hidden) return !t.raced && $('mu-race') ? [$('mu-race'), "Let's race!"] : null;
  if (!t.upgraded) {
    if (state.cash < upgradeCost('engine', 'kaze')) return null; // the tap hint covers this part
    if (panel !== 'upgrades') return [navTarget('upgrades'), 'You can afford an upgrade!'];
    if (tab !== 'car') return [$('sheet-tabs').querySelector('[data-tab="car"]'), 'Car upgrades'];
    return [$('sheet-body').querySelector('[data-action="upgrade"][data-id="engine"]'), 'Buy Engine for more acceleration'];
  }
  if (panel !== 'races') return [navTarget('races'), 'Time for your first race!'];
  if (envTab !== 'countryside') return null;
  return [$('sheet-body').querySelector('[data-id="country_1"]'), 'Race The Rusty'];
}

function coachUpdate() {
  if ($('garage-ui').hidden) return;
  const step = guideStep();
  if (step) coach(...step); else coachOff();
}

// ---------------------------------------------------------------- race HUD

export const raceTopInset = () => $('progress').getBoundingClientRect().bottom;
export const raceHudHeight = () => innerHeight - $('race-hud').getBoundingClientRect().top;

// Tachometer drawn as SVG: RPM fraction 0–1 maps to −135°…+135°.
function buildTach(spec, redline) {
  const ang = f => -135 + 270 * f;
  const pol = (a, r) => {
    const t = ((a - 90) * Math.PI) / 180;
    return [50 + r * Math.cos(t), 50 + r * Math.sin(t)];
  };
  const arc = (f0, f1, r, cls) => {
    const a0 = ang(f0), a1 = ang(f1), [x0, y0] = pol(a0, r), [x1, y1] = pol(a1, r);
    return `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" class="${cls}"/>`;
  };
  const z = zones(spec), band = launchBand(spec);
  let s = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" class="t-face"/>';
  s += arc(0, 1, 41, 't-base');
  s += arc(z.good[0], z.good[1], 41, 't-good');
  s += arc(z.perfect[0], z.perfect[1], 41, 't-perfect');
  s += arc(Math.min(1, z.good[1] + 0.04), 1, 41, 't-red');
  s += arc(band[0], band[1], 34, 't-launch');
  const max = Math.floor(redline / 1000);
  for (let i = 0; i <= max; i++) {
    const a = ang((i * 1000) / redline);
    const [x0, y0] = pol(a, 36), [x1, y1] = pol(a, 31), [tx, ty] = pol(a, 24);
    s += `<line x1="${x0.toFixed(2)}" y1="${y0.toFixed(2)}" x2="${x1.toFixed(2)}" y2="${y1.toFixed(2)}" class="t-tick"/>`;
    s += `<text x="${tx.toFixed(2)}" y="${ty.toFixed(2)}" class="t-num">${i}</text>`;
  }
  s += '<text x="50" y="74" class="t-unit">RPM ×1000</text>';
  s += '<g class="needle"><line x1="50" y1="50" x2="50" y2="13" class="t-needle"/></g>';
  s += '<circle cx="50" cy="50" r="6" class="t-hub"/></svg>';
  return s;
}

export function showRace(event, pSpec, oSpec, handlers) {
  showScreen('race');
  const env = ENVS.find(v => v.id === event.env), car = carDef(state.car);
  $('race-name').textContent = event.name;
  $('race-sub').textContent = `${env.short} · ${DIST[event.dist].label} · ${car.name} PR ${pr(pSpec)} vs ${oSpec.name}`;
  $('speed-unit').textContent = state.units === 'kmh' ? 'KM/H' : 'MPH';
  const rec = state.events[event.id];
  $('race-reward').innerHTML = `<small>Win</small>${fmt(event.win + (rec?.won ? 0 : event.first + (event.champion || 0)))}`;
  $('tach').innerHTML = buildTach(pSpec, car.redlineRpm);
  hud = { needle: $('tach').querySelector('.needle'), hub: $('tach').querySelector('.t-hub'), last: {} };
  $('tach').classList.remove('launched');
  $('gear').textContent = '1';
  $('speed').textContent = '0';
  $('race-gap').textContent = '';
  setPrimary('launch');
  raceMsg('Hold on the ambers · needle in the yellow band · release on GREEN');
  $('progress').style.setProperty('--you', 0);
  $('progress').style.setProperty('--opp', 0);
  const btn = $('btn-shift');
  btn.onpointerdown = e => {
    e.preventDefault();
    try { btn.setPointerCapture(e.pointerId); } catch { /* release still arrives via pointerup */ }
    handlers.down();
  };
  btn.onpointerup = btn.onpointercancel = e => { e.preventDefault(); handlers.up(); };
  $('btn-pause').onclick = () => { sfx.click(); handlers.pause(); };
}

export function updateRace({ rpm, gear, mph, you, opp, zone, launched, inBand, gap, speed, nitro }) {
  if (!hud) return;
  hud.needle.setAttribute('transform', `rotate(${(-135 + 270 * Math.min(1, rpm)).toFixed(1)} 50 50)`);
  const l = hud.last;
  if (l.gear !== gear) $('gear').textContent = l.gear = gear;
  const s = Math.round(state.units === 'kmh' ? mph * 1.609 : mph);
  if (l.s !== s) $('speed').textContent = l.s = s;
  $('progress').style.setProperty('--you', you.toFixed(4));
  $('progress').style.setProperty('--opp', opp.toFixed(4));
  if (l.launched !== launched) { l.launched = launched; $('tach').classList.toggle('launched', launched); }
  const key = launched ? zone : inBand ? 'band' : null;
  if (l.zone !== key) {
    l.zone = key;
    hud.hub.setAttribute('class', `t-hub ${key || ''}`);
    const b = $('btn-shift');
    b.classList.toggle('ready', key === 'good' || key === 'perfect' || key === 'band');
    b.classList.toggle('over', key === 'limiter');
  }
  if (l.nitro !== nitro) {
    l.nitro = nitro;
    const b = $('btn-shift');
    for (const k of ['ready', 'chain', 'burn']) b.classList.toggle(`n-${k}`, nitro === k);
  }
  if (gap != null) {
    const t = -gap / speed, txt = `${t >= 0 ? '+' : '−'}${Math.abs(t).toFixed(2)} s`;
    if (l.gap !== txt) { l.gap = txt; $('race-gap').textContent = txt; $('race-gap').className = `gap ${t >= 0 ? 'ahead' : 'behind'}`; }
  }
}

export function setPrimary(mode, charges = 0) {
  const b = $('btn-shift');
  b.classList.toggle('launch', mode === 'launch');
  b.classList.toggle('done', mode === 'done');
  b.classList.toggle('nitro', mode === 'nitro');
  $('shift-label').textContent = { launch: 'HOLD', done: 'HOLD ON', nitro: `NITRO ×${charges}` }[mode] || 'SHIFT';
  $('shift-hint').textContent = { launch: 'release on green', done: 'to the line!', nitro: 'chain on the flash' }[mode] || 'Tap / Space';
}

export function raceMsg(text) {
  $('race-msg').textContent = text;
}

// A short buzz on phones for the best moments; skipped with Reduce motion.
export function buzz(ms = 25) {
  if (!state.reducedMotion) navigator.vibrate?.(ms);
}

export function callout(text, kind = '') {
  const el = $('callout');
  el.className = 'callout';
  void el.offsetWidth; // restart the animation
  el.textContent = text;
  el.className = `callout show ${kind}`;
}

// ---------------------------------------------------------------- dialogs

function modal(html, actions) {
  $('modal-card').className = 'modal-card panel';
  $('modal-card').innerHTML = html;
  $('modal').hidden = false;
  $('modal-card').onclick = e => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    sfx.click();
    hideModal();
    actions[b.dataset.m]?.();
  };
}

export function hideModal() {
  $('modal').hidden = true;
}

export function showPause(actions) {
  modal(`<div class="result-title">Paused</div>
    <p class="result-sub">Leaving the race gives no reward.</p>
    <div class="actions"><button class="btn" data-m="quit">Exit race</button><button class="btn" data-m="restart">Restart</button><button class="btn go" data-m="resume">Resume</button></div>`, actions);
}

function nitroText(list) {
  const n = q => list.filter(x => x === q).length;
  return [[n('boost') + n('chain'), 'fired'], [n('chain'), 'chained'], [n('early'), 'wasted']].filter(([v]) => v).map(([v, k]) => `${v} ${k}`).join(', ');
}

const LAUNCH_NAME = { perfect: 'Perfect launch', good: 'Good launch', bog: 'Bog', wheelspin: 'Wheelspin', jump: 'Jump start' };

export function showResult(d, actions) {
  const t = v => (v == null ? '—' : `${v.toFixed(2)}s`);
  const counts = ['perfect', 'good', 'early', 'late'].map(q => [q, d.shifts.filter(s => s === q).length]).filter(([, n]) => n);
  const shiftText = counts.length ? counts.map(([q, n]) => `${n} ${q[0].toUpperCase() + q.slice(1)}`).join(', ') : 'none';
  const gap = d.them - d.you;
  let tip = '';
  if (!d.won) {
    tip = d.launch === 'jump' ? 'Release only once the light turns green.'
      : d.reaction > 0.6 ? 'Launch the moment the light turns green.'
      : d.nitros && !d.nitros.length ? 'Tap NITRO in top gear, and chain it when the button flashes.'
      : d.launch === 'bog' ? 'Hold longer before green so the needle sits in the yellow launch band.'
        : d.shifts.filter(s => s === 'perfect' || s === 'good').length < d.shifts.length / 2 ? 'Shift while the needle is in the green zone.'
          : carPR(state.car) < d.event.rec ? `Recommended PR is ${d.event.rec}. Upgrade or pick a faster car.` : 'So close. Try again!';
  }
  const unlocks = [];
  if (d.env) unlocks.push(`${d.env.name} unlocked!`);
  else if (d.next) unlocks.push(`${d.next.name} unlocked!`);
  for (const m of d.milestones) if (m.decor) unlocks.push(`${m.stars}★: ${m.decor} in your garage${m.title ? ` · "${m.title}"` : ''}`);
  if (d.event.id === LEGEND.unlock && d.firstWin) unlocks.push('The Apex Zero can now be bought!', 'The Legend Series is open!');
  const legend = d.event.legend;
  modal(`
    <div class="result-title ${d.won ? 'win' : 'lose'}">${d.won ? 'VICTORY' : 'DEFEAT'}</div>
    <div class="result-sub">${d.won ? `You beat ${d.opp}` : `${d.opp} got you this time`} · ${d.won ? '+' : '−'}${Math.abs(gap).toFixed(2)}s</div>
    ${legend ? `<div class="new-stars">${d.won ? `Round ${legend} cleared` : `Round ${legend}`} · best ${state.legend.best || '—'}</div>` : starRow(d.stars, 'big')}
    ${d.newStars ? `<div class="new-stars">+${d.newStars}★ new</div>` : ''}
    <div class="result-money">+${fmt(d.total)}</div>
    <div class="rows">${d.lines.map(([k, v]) => `<div class="row"><span>${k}</span><span class="plus">+${fmt(v)}</span></div>`).join('')}</div>
    <div class="rows">
      <div class="row"><span>Your time</span><span>${t(d.you)}</span></div>
      <div class="row"><span>${d.opp}</span><span>${t(d.them)}</span></div>
      <div class="row"><span>${LAUNCH_NAME[d.launch] || 'Launch'}</span><span>${d.reaction == null ? '—' : d.reaction.toFixed(3) + 's'}</span></div>
      <div class="row"><span>Shifts</span><span>${shiftText}</span></div>
      ${d.nitros?.length ? `<div class="row"><span>Nitro</span><span>${nitroText(d.nitros)}</span></div>` : ''}
      ${legend ? '' : `<div class="row"><span>Stars</span><span>★★ ${MEDALS[d.event.id][0]}s · ★★★ ${MEDALS[d.event.id][1]}s</span></div>`}
    </div>
    ${unlocks.map(u => `<div class="unlock">${u}</div>`).join('')}
    ${tip ? `<div class="tip">Tip: ${tip}</div>` : ''}
    <div class="actions">
      <button class="btn" data-m="garage">Garage</button>
      <button class="btn ${actions.next ? '' : 'go'}" data-m="again">Retry</button>
      ${actions.next ? `<button class="btn go" data-m="next">${legend ? 'Next round' : 'Next event'}</button>` : ''}
    </div>`, actions);
}

// Toasts queue up, so several achievements at once show one after another.
const toasts = [];
let toastBusy = false;
export function toast(msg, kind = '') {
  toasts.push([msg, kind]);
  if (!toastBusy) nextToast();
}
function nextToast() {
  const el = $('toast'), next = toasts.shift();
  if (!next) { toastBusy = false; return; }
  toastBusy = true;
  el.textContent = next[0];
  el.className = `toast show ${next[1]}`;
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(nextToast, 300);
  }, toasts.length ? 2000 : 3000);
}
