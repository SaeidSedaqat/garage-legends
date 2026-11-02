// DOM interface layered over the Phaser canvas: HUD, menus, race HUD and dialogs.
// HTML keeps text crisp and lets menus scroll naturally on phones.
import {
  state, changed, carDef, tunedSpec, carPR, stockPR, previewSpec, upgradeLevel, upgradeCost, upgradeLock, buyUpgrade,
  carLock, buyCar, selectCar, totalStars, clickValue, autoRate, autoUnlocked, garageCost, buyGarage,
  nextRace, raceCooldown, skipCooldown, bonusPayout, resetSave, achievementProgress,
} from './state.js';
import {
  CARS, ENVS, OPPONENTS, DIST, PARTS, PART_LEVELS, PART_STEP, NITRO_STEP, AUTO_UNLOCK, MILESTONES, STAR_BONUS,
  ACHIEVEMENTS, SIM,
} from './data.js';
import { pr, zones } from './physics.js';
import { crewRate, partName, tapBase } from './tuning.js';
import { bus } from './events.js';
import { sfx, setMuted, setMusic } from './audio.js';
import { partIconURL, uiIconURL } from './art.js';
import { platform } from './platform.js';

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
  prev: svg('<path d="m15 5-7 7 7 7"/>'),
  next: svg('<path d="m9 5 7 7-7 7"/>'),
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
  awd: svg('<rect x="3" y="3" width="4" height="6" rx="1"/><rect x="17" y="3" width="4" height="6" rx="1"/><rect x="3" y="15" width="4" height="6" rx="1"/><rect x="17" y="15" width="4" height="6" rx="1"/><path d="M7 6h10M7 18h10M12 6v12"/>'),
  exhaust: svg('<path d="M2 14h11l3-3h4v6h-4l-3-3"/><path d="M20 9c1-1 1-2 0-3M22 9c1.3-1.5 1.3-3 0-4.5"/>'),
  chip: svg('<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>'),
  wing: svg('<path d="M3 9h18l-2 4H5z"/><path d="M8 13v6M16 13v6M5 19h6M13 19h6"/>'),
  feather: svg('<path d="M20 4C11 4 6 9 6 18l-2 2"/><path d="M20 4c0 8-5 13-14 14M9 15h5M12 11h5"/>'),
  bottle: svg('<path d="M10 2h4M11 2v3M13 2v3"/><rect x="8" y="5" width="8" height="17" rx="3"/><path d="M8 11h8M10 15l4 0"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  battery: svg('<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M22 11v2M8 9l-2 3h4l-2 3"/>'),
  play: svg('<rect x="2" y="5" width="20" height="14" rx="3"/><path d="m10 9 5 3-5 3z"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
};

let game = null;
let viewing = null;     // a car not owned yet, on show in the garage; null shows the one you drive
let hud = null;
let taps = 0;

export function init(g) {
  game = g;
  $('car-prev').innerHTML = ICONS.prev;
  $('car-next').innerHTML = `${ICONS.next}<i class="badge"></i>`;
  $('btn-pause').innerHTML = ICONS.pause;
  $('btn-race-ad').innerHTML = `${ICONS.play}<span>Race now</span>`;

  $('car-prev').addEventListener('click', () => { sfx.click(); stepCar(-1); });
  $('car-next').addEventListener('click', () => { sfx.click(); stepCar(1); });
  $('btn-race').addEventListener('click', onRace);
  $('btn-race-ad').addEventListener('click', () => {
    sfx.click();
    watchAd('skip-cooldown', () => { skipCooldown(); onRace(); });
  });
  setInterval(renderRaceButton, 250);
  $('car-buy').addEventListener('click', onSheetClick);
  $('sheet-body').addEventListener('click', onSheetClick);
  $('goal-chip').addEventListener('click', () => {
    const g = goal();
    sfx.click();
    if (g.race) flash($('btn-race'));
    if (g.car) showCar(g.car);
    if (g.upgrade) {
      showCar(state.car);
      const b = document.querySelector(`.upg-btn[data-id="${g.upgrade}"]`);
      b?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      flash(b);
    }
  });
  $('btn-trophies').insertAdjacentHTML('afterbegin', ICONS.trophy);
  $('btn-trophies').addEventListener('click', () => { sfx.click(); showAchievements(); });
  $('btn-settings').innerHTML = ICONS.settings;
  $('btn-settings').addEventListener('click', () => { sfx.click(); showSettings(); });
  setMuted(state.muted);
  setMusic(!state.musicOff);
  applyMotion();
  bus.on('achievement', list => {
    sfx.achieve();
    // ones earned in a race are listed on the result card, where a toast would cover the title
    if (!$('race-ui').hidden) raceAchievements.push(...list);
    else list.forEach(a => toast(`🏆 ${a.name}${a.reward ? ` · +${fmt(a.reward)}` : ''}`, 'trophy'));
  });

  // keyboard: Enter presses a dialog's main button, Escape closes it; in the garage the arrow
  // keys flip through cars and R starts the next race (GDD §10.10)
  window.addEventListener('keydown', e => {
    if (e.code === 'Enter' && !$('modal').hidden && !e.repeat) {
      $('modal-card').querySelector('.actions .btn.go')?.click();
      return;
    }
    if ($('garage-ui').hidden || e.repeat) return;
    if (e.code === 'Escape' && !$('modal').hidden) { hideModal(); coachUpdate(); }
    if (!$('modal').hidden) return;
    if (e.code === 'ArrowLeft') stepCar(-1);
    if (e.code === 'ArrowRight') stepCar(1);
    if (e.code === 'KeyR') onRace();
  });

  bus.on('change', what => {
    if (what === 'car') viewing = null;
    if (what === 'art') paintedIcons();
    renderWallet();
    renderCarBuy();
    if (what === 'money') refreshAfford();
    else renderPanel();
  });
  taps = Math.min(8, state.stats.clicks);
  if (taps >= 8) $('tap-hint').classList.add('gone');
  bus.on('tap', () => { if (++taps === 8) $('tap-hint').classList.add('gone'); });
  window.addEventListener('resize', () => { bus.emit('focus'); coachUpdate(); });
  $('sheet-body').addEventListener('scroll', coachUpdate, { passive: true });
  renderPanel();
  renderCarBuy();
  renderWallet();
}

// ---------------------------------------------------------------- car browsing

// The car on show in the garage: one you don't own yet while browsing, else the one you drive.
export const shownCar = () => viewing || state.car;

// The ‹ › arrows walk through every car. Owned ones are driven straight away; others go on
// show with their price, so they can be looked over and bought right there.
function stepCar(dir) {
  const i = CARS.findIndex(c => c.id === shownCar());
  showCar(CARS[(i + dir + CARS.length) % CARS.length].id);
}

function showCar(id) {
  if (state.owned.includes(id)) {
    const was = viewing;
    viewing = null;
    if (state.car !== id) selectCar(id);
    else if (was) { bus.emit('view'); renderCarBuy(); renderPanel(); }
    return;
  }
  viewing = id;
  bus.emit('view');
  renderCarBuy();
  renderPanel();
}

// The card under a car you don't own yet: what it is, its parts and its price.
function renderCarBuy() {
  const box = $('car-buy');
  box.hidden = !viewing;
  if (!viewing) return;
  const c = carDef(viewing), lock = carLock(c.id);
  box.innerHTML = `<div class="cb-name">${c.name} <span class="tier">Tier ${c.tier}</span></div>
    <div class="cb-line">PR <b>${stockPR(c.id)}</b> · ${c.stats.gears} gears · ${windowLabel(c.stats.shiftWindow)} shift window</div>
    <div class="cb-line quirk">${c.niche}</div>
    ${lock ? `<div class="locked-note">${ICONS.lock}<span>${lock} · ${fmt(c.price)}</span></div>`
      : `<button class="btn buy" data-action="car" data-id="${c.id}" data-cost="${c.price}">Buy · ${fmt(c.price)}</button>`}`;
  refreshAfford();
}

// Once the painted icon sheet is in, it replaces the line icons on the Race button, the
// achievements button and the cash badge.
function paintedIcons() {
  const img = name => `<img class="art-icon" src="${uiIconURL(name)}" alt="">`;
  if (!uiIconURL('race')) return;
  raceKey = '';
  renderRaceButton();
  $('btn-trophies').querySelector('svg, .art-icon')?.remove();
  $('btn-trophies').insertAdjacentHTML('afterbegin', img('trophy'));
  document.querySelector('.cash-icon').innerHTML = img('cash');
  document.querySelector('.cash-icon').classList.add('art');
}

// A short pulse to show the player where something is.
function flash(el) {
  if (!el) return;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

function toggleSound() {
  state.muted = !state.muted;
  setMuted(state.muted);
  setMusic(!state.musicOff);
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
  $('rate-auto').textContent = auto ? `+${auto < 10 ? `$${+auto.toFixed(1)}` : fmt(auto)} / sec` : '';
  const car = carDef(state.car), title = MILESTONES.find(m => m.title && totalStars() >= m.stars)?.title;
  const chip = `<span class="chip-name">${car.name}</span><span class="chip-tier">${title ? `<span class="chip-title">${title}</span><span class="sep"> · </span>` : ''}PR ${carPR(state.car)} · <b class="stars-inline">★ ${totalStars()}</b></span>`;
  if ($('car-chip').innerHTML !== chip) $('car-chip').innerHTML = chip;
  const g = goal(), gc = `<span class="goal-label">Next</span>${g.text}`;
  if (gc !== lastChip) { $('goal-chip').innerHTML = gc; lastChip = gc; }
  $('car-next').classList.toggle('has-badge', CARS.some(c => !state.owned.includes(c.id) && !carLock(c.id) && c.price <= state.cash));
  $('btn-trophies').classList.toggle('has-badge', Object.keys(state.achievements).length > (state.achSeen || 0));
  coachUpdate();
}

// The single "Next goal" chip (GDD §2.3). `upgrade` points at a part button beside the car.
function goal() {
  if (!state.tutorial.upgraded && state.cash >= upgradeCost('engine', 'kaze')) return { text: 'Buy your first upgrade', upgrade: 'engine' };
  const e = nextRace();
  const car = CARS.find(c => !state.owned.includes(c.id) && !carLock(c.id) && c.price <= state.cash);
  if (car) return { text: `Buy the ${car.name}`, car: car.id };
  // an affordable part when the car is short of the next race, or when it's small change
  const def = carDef(state.car), underpowered = carPR(state.car) < e.rec;
  const part = def.parts.find(k => !upgradeLock(k) && upgradeCost(k) != null && upgradeCost(k) <= state.cash * (underpowered ? 1 : 0.25));
  if (part) return { text: `Upgrade: ${partName(def, part)}`, upgrade: part };
  if (!underpowered || carPR(state.car) >= e.rec * 0.9) return { text: `${e.name}: beat ${OPPONENTS[e.opp].name}`, race: true };
  const next = CARS.find(c => !state.owned.includes(c.id) && !carLock(c.id));
  if (next) return { text: `Save for the ${next.name} (${fmt(next.price)})`, car: next.id };
  return { text: `${e.name}: beat ${OPPONENTS[e.opp].name}`, race: true };
}

// ---------------------------------------------------------------- the RACE button

// RACE shows the next race and how the car measures up; after a race it counts down the
// cooldown, with a rewarded ad beside it to skip the wait.
let raceKey = '';
function renderRaceButton() {
  if ($('garage-ui').hidden) return;
  const e = nextRace(), left = Math.ceil(raceCooldown()), mine = carPR(state.car);
  const icon = uiIconURL('race') ? `<img class="art-icon" src="${uiIconURL('race')}" alt="">` : ICONS.flag;
  const fit = mine >= e.rec ? '' : mine >= e.rec * 0.9 ? 'close' : 'short';
  const key = `${e.n}|${e.dist}|${left}|${fit}|${icon.length}`;
  if (key === raceKey) return;
  raceKey = key;
  const b = $('btn-race');
  b.classList.toggle('cooling', left > 0);
  b.innerHTML = left > 0
    ? `${icon}<span class="rb-text"><b>${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</b><small>${e.name} next</small></span>`
    : `${icon}<span class="rb-text"><b>Race</b><small class="${fit === 'short' ? 'short' : ''}">${e.name} · ${DIST[e.dist].short} · PR ${e.rec}${fit === 'short' ? ' ⚠' : ''}</small></span>`;
  $('btn-race-ad').hidden = !(left > 0);
  $('tap-hint').classList.toggle('beside-ad', left > 0);
}

function onRace() {
  if ($('garage-ui').hidden || !$('modal').hidden) return;
  const left = Math.ceil(raceCooldown());
  if (left > 0) {
    sfx.deny();
    toast(`Next race in ${left} s · or watch an ad to race now`);
    flash($('btn-race-ad'));
    return;
  }
  sfx.click();
  startRace(nextRace().id);
}

// Plays a rewarded ad (a 3-second test ad until a portal SDK is in) with the music down, and
// gives the reward if it finished.
let adPlaying = false;
export async function watchAd(placement, reward) {
  if (adPlaying) return;
  adPlaying = true;
  setMusic(false);
  const ok = await platform.rewardedAd(placement).catch(() => false);
  setMusic(!state.musicOff);
  adPlaying = false;
  if (ok) reward(); else toast('No ad available right now');
}

// The garage view (CSS px): the screen beside the dock, or above it on phones held upright
// where the dock sits at the bottom.
export function garageArea() {
  const W = innerWidth, H = innerHeight, d = $('dock').getBoundingClientRect();
  return d.left > W * 0.3 ? { w: d.left, h: H } : { w: W, h: d.top };
}

// Where the garage scene should frame the car: the garage view below the goal chip.
export function garageFocus() {
  const a = garageArea(), top = $('goal-chip').getBoundingClientRect().bottom;
  return { x: 0, y: top, w: Math.max(80, a.w), h: Math.max(80, a.h - top - 8) };
}

function renderPanel() {
  const scroll = $('sheet-body').scrollTop;
  $('sheet-body').innerHTML = renderUpgrades();
  $('sheet-body').scrollTop = scroll;
  refreshAfford();
  coachUpdate();
}

// ---------------------------------------------------------------- upgrades

const pips = (lvl, max) => `<span class="pips">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>`;

// What one level of a part does, in numbers: "+7.5% acceleration · +3.8% top speed".
const FX_TEXT = { accel: 'acceleration', topSpeed: 'top speed', launch: 'launch' };
function partEffect(id) {
  const fx = PARTS[id].fx, pct = v => `${+(v * 100).toFixed(1)}%`;
  return [
    ...Object.entries(FX_TEXT).filter(([k]) => fx[k]).map(([k, label]) => `+${pct(PART_STEP * fx[k])} ${label}`),
    ...(fx.shift ? [`+${pct(0.04 * fx.shift * 10 / PART_LEVELS)} wider shift zones`] : []),
    ...(fx.grip ? ['softer slow starts'] : []),
    ...(fx.nitro ? [`+${pct(NITRO_STEP * fx.nitro)} nitro power`] : []),
  ].join(' · ') + ' per level';
}

// One upgrade: icon, name, what it does, level pips, what the next level adds, and its price.
function upgButton({ action, id, icon, img, name, desc, effect, lvl, max, gain, cost, lock, tag }) {
  const kind = tag ? 'rep' : lock ? 'locked' : cost == null ? 'maxed' : '';
  const price = tag || (lock ? `${ICONS.lock}<span>${lock}</span>` : cost == null ? 'MAX' : fmt(cost));
  return `<button class="upg-btn ${kind}" data-action="${action}" data-id="${id}"${kind ? '' : ` data-cost="${cost}"`}${lock ? ` data-lock="${lock}"` : ''}>
    <span class="ub-icon${img ? ' art' : ''}">${img ? `<img src="${img}" alt="">` : ICONS[icon]}</span>
    <span class="ub-name">${name}${lvl != null ? ` <small>Lv ${lvl}${max ? `/${max}` : ''}</small>` : ''}</span>
    <span class="ub-desc">${desc}${effect ? `<em>${effect}</em>` : ''}</span>
    ${lvl != null && max ? pips(lvl, max) : ''}
    ${gain && (!kind || tag) ? `<span class="ub-gain">${gain}</span>` : ''}
    <span class="ub-cost">${price}</span>
  </button>`;
}

// The car on show's own four parts, then the garage (tap power, pit crew, reputation). A car
// that isn't owned yet only shows what its parts would do.
function renderUpgrades() {
  const car = carDef(shownCar());
  if (viewing) {
    const parts = car.parts.map(id => `<div class="upg-btn preview">
      <span class="ub-icon art"><img src="${partIconURL(id)}" alt=""></span><span class="ub-name">${partName(car, id)}</span>
      <span class="ub-desc">${PARTS[id].desc}<em>${partEffect(id)}</em></span></div>`).join('');
    return `<div class="dock-head">${car.name}'s parts</div><p class="hint">Buy the ${car.name} to fit these. Each car has its own set.</p><div class="upg-grid">${parts}</div>`;
  }
  const now = pr(tunedSpec());
  const parts = car.parts.map(id => {
    const p = PARTS[id], cost = upgradeCost(id), lock = upgradeLock(id);
    const d = cost != null && !lock ? pr(previewSpec(id)) - now : 0;
    return upgButton({
      action: 'upgrade', id, icon: p.icon, img: partIconURL(id), name: partName(car, id), desc: p.desc, effect: partEffect(id),
      lvl: upgradeLevel(id), max: PART_LEVELS, gain: d > 0 ? `+${d} PR` : '', cost, lock: lock?.replace('Needs ', ''),
    });
  }).join('');
  const cp = state.clickPower, au = state.automation, stars = totalStars(), mult = 1 + STAR_BONUS * stars;
  const perTap = lvl => fmt(Math.round(tapBase(lvl) * mult));
  const garage = upgButton({
    action: 'garage', id: 'click', icon: 'coin', img: uiIconURL('tap'), name: 'Tap Power', lvl: cp, cost: garageCost('click'),
    desc: 'More cash for every tap on your car. No limit: keep upgrading.',
    gain: `${perTap(cp)} → ${perTap(cp + 1)} / tap`,
  }) + upgButton({
    action: 'garage', id: 'auto', icon: 'crew', img: uiIconURL('crew'), name: 'Pit Crew', lvl: autoUnlocked() ? au : null, cost: garageCost('auto'),
    desc: autoUnlocked() ? "Taps your car for you, even while you're away (half rate, up to 2 h). Each level makes them tap faster."
      : `Win race ${AUTO_UNLOCK} and your crew starts tapping your car at ${crewRate(0)} taps/s. Upgrades make them faster.`,
    lock: autoUnlocked() ? null : `Win race ${AUTO_UNLOCK}`,
    gain: `${crewRate(au)} → ${crewRate(au + 1)} taps / s`,
  }) + upgButton({
    action: 'rep', id: 'rep', icon: 'star', img: uiIconURL('rep'), name: 'Reputation', desc: 'Every race you win is a star: each adds 5% to tap income, and star milestones pay out cash.',
    gain: `×${mult.toFixed(2)} tap income`, tag: `★ ${stars}`,
  });
  return `<div class="dock-head">${car.name} · PR <b>${carPR(state.car)}</b></div><div class="upg-grid">${parts}</div>
    <div class="dock-head">Garage</div><div class="upg-grid">${garage}</div>`;
}

function showReputation() {
  const stars = totalStars(), mult = 1 + STAR_BONUS * stars, m = MILESTONES.find(x => x.stars > stars);
  const list = MILESTONES.map(x => {
    const on = stars >= x.stars;
    return `<div class="ms ${on ? 'on' : ''}">${on ? ICONS.check : ICONS.lock}<span>${fmt(x.cash)}${x.title ? ` · "${x.title}"` : ''}</span><b>${x.stars}★</b></div>`;
  }).join('');
  modal(`<div class="result-title">Reputation</div>
    <div class="rep"><span class="rep-stars">${ICONS.star}${stars}</span><div><b>Tap income ×${mult.toFixed(2)}</b><div class="desc">Every race win is a star and adds 5%. ${m ? `Next: ${m.stars}★ for ${fmt(m.cash)}` : 'Every milestone reached!'}</div></div></div>
    <div class="hint">Star milestones</div><div class="ms-list">${list}</div>
    <div class="actions"><button class="btn go" data-m="close">Close</button></div>`, { close: coachUpdate });
}

const windowLabel = w => (w >= 0.8 ? 'Wide' : w >= 0.7 ? 'Normal' : 'Narrow');

function refreshAfford() {
  document.querySelectorAll('#sheet-body [data-cost], #car-buy [data-cost]').forEach(b => b.classList.toggle('poor', state.cash < +b.dataset.cost));
}

function onSheetClick(e) {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  const { action, id } = b.dataset;
  const need = () => toast(b.dataset.lock ? `Locked: ${b.dataset.lock}` : `Need ${fmt(+b.dataset.cost - state.cash)} more`);
  if (b.classList.contains('maxed')) { sfx.click(); toast('Maxed out!'); return; }
  if (action === 'upgrade') {
    const before = carPR(state.car);
    if (buyUpgrade(id)) {
      sfx.buy();
      buzz(20);
      flash(document.querySelector(`.upg-btn[data-id="${id}"]`));
      bus.emit('upgraded', { name: partName(carDef(state.car), id), lvl: upgradeLevel(id), gain: carPR(state.car) - before });
    } else { sfx.deny(); need(); }
  } else if (action === 'garage') {
    if (buyGarage(id)) {
      sfx.buy();
      buzz(20);
      flash(document.querySelector(`.upg-btn[data-id="${id}"]`));
      bus.emit('upgraded', { name: id === 'click' ? 'Tap Power' : 'Pit Crew', lvl: id === 'click' ? state.clickPower : state.automation });
    } else { sfx.deny(); need(); }
  } else if (action === 'rep') {
    sfx.click();
    showReputation();
  } else if (action === 'car') {
    if (buyCar(id)) { sfx.buy(); toast(`The ${carDef(id).name} is yours!`); } else { sfx.deny(); need(); }
  } else if (action === 'select') {
    sfx.click();
    selectCar(id);
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
  raceKey = '';
  renderRaceButton();
  bus.emit('focus');
}

// Works from the garage and from a finished race ("Next event"), which restarts the race scene.
function startRace(id, practice = false) {
  coachOff();
  showScreen('race');
  game.scene.stop('garage');
  game.scene.start('race', { eventId: id, practice });
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
      ${toggle('sound', !state.muted, 'Sound', 'All game audio')}
      ${toggle('music', !state.musicOff, 'Music', 'Garage and race music')}
      ${toggle('motion', state.reducedMotion, 'Reduce motion', 'Fewer shakes, bounces and flashes')}
      <div class="set-row"><span><b>Speed units</b><small>Shown on the speedometer</small></span><span class="seg">${unit('kmh')}${unit('mph')}</span></div>
    </div>
    <div class="rows">
      <div class="row"><span>Races</span><span>${s.races} · ${s.wins} won</span></div>
      <div class="row"><span>Perfect shifts</span><span>${s.perfectShifts}</span></div>
      <div class="row"><span>Earned from taps</span><span>${fmt(s.fromClicks)}</span></div>
      <div class="row"><span>Earned from races</span><span>${fmt(s.fromRaces)}</span></div>
      <div class="row"><span>Earned by your crew</span><span>${fmt(s.fromAuto)}</span></div>
      <div class="row"><span>Best race won</span><span>${state.race.best ? `Race ${state.race.best}` : '—'}</span></div>
    </div>
    <button class="btn wide" data-set="practice">${ICONS.flag} Driving lesson (practice, no rewards)</button>
    <div class="credits"><b>Credits</b>Crowd cheering: Gregor Quendel (CC BY 4.0) · Tyre squeal: audible-edge / Tom Haigh (CC BY 3.0) · Engine loop: domasx2 (CC0) · Effects: Kenney.nl (CC0) · Music: "Awake! (Megawall-10)" by cynicmusic, "Countryside" and "Oceanside" by TAD (CC0)</div>
    <button class="btn danger wide" data-set="reset">Reset progress</button>
    <div class="actions"><button class="btn go" data-m="close">Done</button></div>`, { close: coachUpdate });
  const base = $('modal-card').onclick;
  $('modal-card').onclick = ev => {
    const b = ev.target.closest('[data-set]');
    if (!b) return base(ev);
    sfx.click();
    const k = b.dataset.set;
    if (k === 'sound') { toggleSound(); b.querySelector('.switch').classList.toggle('on', !state.muted); return; }
    if (k === 'music') {
      state.musicOff = !state.musicOff;
      setMusic(!state.musicOff);
      changed('settings');
      b.querySelector('.switch').classList.toggle('on', !state.musicOff);
      return;
    }
    if (k === 'practice') { hideModal(); startRace('race_1', true); return; }
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
  box.classList.remove('center');
  el.classList.add('coach-target');
  // no text: just the pulsing ring, where a bubble would cover something
  if (!text) { box.hidden = true; return; }
  if ($('coach-text').textContent !== text) $('coach-text').textContent = text;
  box.hidden = false;
  const r = el.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight;
  // in the upgrades dock a bubble above would cover the car's name and PR, so it goes below when it fits
  const below = !!el.closest('#dock') && innerHeight - r.bottom > bh + 24;
  const above = !below && el.id !== 'goal-chip' && r.top > bh + 24;
  const x = Math.min(innerWidth - bw - 8, Math.max(8, r.left + r.width / 2 - bw / 2));
  box.classList.toggle('below', !above);
  box.style.left = `${x}px`;
  box.style.top = `${above ? r.top - bh - 12 : r.bottom + 12}px`;
  box.style.setProperty('--arrow', `${Math.min(bw - 18, Math.max(18, r.left + r.width / 2 - x))}px`);
}
export const coachOff = () => lesson(null);

// The race lesson's card: a step title ("2/3 · SHIFT"), one instruction and, when the race
// waits on reading rather than on an action, a button. It points at `el`, or sits mid-screen
// without one. `frozen` dims the track so it's clear the race is waiting for the player.
let lessonKey = '';
export function lesson(el, { title = '', text = '', button = null, onButton = null, frozen = false } = {}) {
  $('race-dim').classList.toggle('on', !!frozen && !!text);
  const box = $('coach');
  box.classList.toggle('lesson', !!text);
  if (!text) {
    lessonKey = '';
    $('coach-text').innerHTML = '';
    return coach(null);
  }
  const key = `${title}|${text}|${button}`;
  if (key !== lessonKey) {
    lessonKey = key;
    $('coach-text').innerHTML = `${title ? `<b class="lesson-title">${title}</b>` : ''}<span>${text}</span>${button ? `<button class="btn go lesson-btn">${button}</button>` : ''}`;
    $('coach-text').querySelector('.lesson-btn')?.addEventListener('click', e => { e.stopPropagation(); sfx.click(); onButton?.(); });
  }
  // on a phone held upright a card pointing at the HUD would cover the rev meter and speedo:
  // there the target just pulses and the card sits up over the sky
  const portrait = innerHeight > innerWidth;
  if (el && !portrait) return coach(el, $('coach-text').textContent);
  // no target: a centred card under the race header
  if (coachEl && coachEl !== el) coachEl.classList.remove('coach-target');
  coachEl = el;
  el?.classList.add('coach-target');
  box.hidden = false;
  box.classList.remove('below');
  box.classList.add('center');
  box.style.left = `${(innerWidth - box.offsetWidth) / 2}px`;
  box.style.top = `${raceTopInset() + 16}px`;
}

// Tap the car → buy the first upgrade → win the first race. Returns [element, text] or null.
function guideStep() {
  const t = state.tutorial;
  if (t.done) return null;
  if (t.upgraded && t.raced) {
    t.done = true;
    changed('settings');
    return null;
  }
  if (!$('modal').hidden) return null;
  if (!t.upgraded) {
    if (state.cash < upgradeCost('engine', 'kaze')) return null; // the tap hint covers this part
    return [document.querySelector('.upg-btn[data-id="engine"]'), 'Tap Engine to upgrade your car'];
  }
  return [$('btn-race'), 'Time for your first race!'];
}

function coachUpdate() {
  if ($('garage-ui').hidden) return;
  const step = guideStep();
  if (step) coach(...step); else coachOff();
}

// ---------------------------------------------------------------- race HUD

export const raceTopInset = () => $('progress').getBoundingClientRect().bottom;
export const raceHudHeight = () => innerHeight - $('race-hud').getBoundingClientRect().top;

// Speedometer dial: a 270° arc that fills with speed (0 to the car's top speed with nitro), with
// a tick every tenth.
const DIAL = 'M21.7 78.3A40 40 0 1 1 78.3 78.3';
function buildSpeedo() {
  let s = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="48" class="s-face"/><path class="s-base" pathLength="100" d="${DIAL}"/>`;
  for (let i = 0; i <= 10; i++) {
    const t = ((-135 + 27 * i - 90) * Math.PI) / 180, c = Math.cos(t), n = Math.sin(t), r0 = i % 5 ? 32 : 29;
    s += `<line x1="${(50 + 34.5 * c).toFixed(2)}" y1="${(50 + 34.5 * n).toFixed(2)}" x2="${(50 + r0 * c).toFixed(2)}" y2="${(50 + r0 * n).toFixed(2)}" class="s-tick"/>`;
  }
  return `${s}<path class="s-fill" id="speed-arc" pathLength="100" d="${DIAL}"/></svg>`;
}

// Rev bar: RPM fraction 0–1 left to right, with the shift zones and the red line marked on it
// and the engine's thousands underneath.
function buildRev(spec, redline) {
  const z = zones(spec), pct = f => `${(100 * f).toFixed(2)}%`, band = (f0, f1, cls) => `<i class="${cls}" style="left:${pct(f0)};width:${pct(f1 - f0)}"></i>`;
  const red = Math.min(1, z.good[1] + 0.04);
  $('rev-track').innerHTML = band(z.good[0], z.good[1], 'z-good') + band(z.perfect[0], z.perfect[1], 'z-perfect') + band(red, 1, 'z-red')
    + '<i class="rev-fill"></i><i class="rev-mark"></i>';
  let ticks = '';
  for (let i = 0; i <= Math.floor(redline / 1000); i++) ticks += `<span style="left:${pct((i * 1000) / redline)}">${i}</span>`;
  $('rev-ticks').innerHTML = ticks;
}

const raceAchievements = [];
export function showRace(event, pSpec, oSpec, handlers, practice = false) {
  showScreen('race');
  raceAchievements.length = 0;
  const env = ENVS.find(v => v.id === event.env), car = carDef(state.car);
  $('race-name').textContent = practice ? 'Driving lesson' : event.name;
  // narrow phones drop the place and the car's name so the rest fits on one line
  $('race-sub').innerHTML = `<span class="sub-long">${env.short} · </span>${DIST[event.dist].label} · <span class="sub-long">${car.name} </span>PR ${pr(pSpec)} vs ${oSpec.name}`;
  $('speed-unit').textContent = state.units === 'kmh' ? 'KM/H' : 'MPH';
  $('race-reward').innerHTML = practice ? '<small>Lesson</small>Practice' : `<small>Win</small>${fmt(event.win)}`;
  $('callout').className = 'callout';
  $('speed-dial').innerHTML = buildSpeedo();
  buildRev(pSpec, car.redlineRpm);
  // the dial's full sweep is the car's top speed with a nitro burst on top
  hud = { arc: $('speed-arc'), rev: $('tach'), maxMph: (90 + 1.6 * pSpec.topSpeed) * SIM.nitro.speed * 1.05, last: {} };
  hud.rev.classList.remove('good', 'perfect', 'go', 'limiter');
  hud.rev.style.setProperty('--rpm', 0);
  hud.arc.style.strokeDashoffset = 100;
  $('gear').textContent = '1';
  $('speed').textContent = '0';
  $('race-gap').textContent = '';
  setPrimary('launch');
  raceMsg('Press and hold on the yellow lights · let go on GREEN');
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

export function updateRace({ rpm, gear, mph, you, opp, zone, launched, go, gap, speed, nitro }) {
  if (!hud) return;
  const l = hud.last, r = Math.min(1, Math.max(0, rpm)).toFixed(3);
  if (l.rpm !== r) hud.rev.style.setProperty('--rpm', l.rpm = r);
  if (l.gear !== gear) $('gear').textContent = l.gear = gear;
  const s = Math.round(state.units === 'kmh' ? mph * 1.609 : mph);
  if (l.s !== s) {
    $('speed').textContent = l.s = s;
    hud.arc.style.strokeDashoffset = (100 - 100 * Math.min(1, mph / hud.maxMph)).toFixed(1);
  }
  $('progress').style.setProperty('--you', you.toFixed(4));
  $('progress').style.setProperty('--opp', opp.toFixed(4));
  const key = launched ? zone : go ? 'go' : null;
  if (l.zone !== key) {
    l.zone = key;
    for (const k of ['good', 'perfect', 'go', 'limiter']) hud.rev.classList.toggle(k, key === k);
    const b = $('btn-shift');
    b.classList.toggle('ready', key === 'good' || key === 'perfect' || key === 'go');
    b.classList.toggle('over', key === 'limiter');
  }
  if (l.nitro !== nitro) {
    l.nitro = nitro;
    const b = $('btn-shift');
    for (const k of ['ready', 'chain', 'burn']) b.classList.toggle(`n-${k}`, nitro === k);
    $('speedo').classList.toggle('boost', nitro === 'burn' || nitro === 'chain');
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

const LAUNCH_NAME = { perfect: 'Perfect launch', good: 'Good launch', slow: 'Slow start', late: 'Late start', jump: 'Jump start' };

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
      : d.launch === 'slow' || d.launch === 'late' ? 'Let go the instant the light turns green: every tenth of a second counts.'
        : d.shifts.filter(s => s === 'perfect' || s === 'good').length < d.shifts.length / 2 ? 'Shift while the rev bar is in the green zone.'
          : carPR(state.car) < d.event.rec ? `This race wants PR ${d.event.rec}: upgrade your car or buy a faster one.` : 'So close. Try again!';
  }
  const unlocks = [];
  const next = nextRace();
  if (d.won && d.event.n === AUTO_UNLOCK) unlocks.push('Your Pit Crew is ready: they tap your car for you!');
  for (const c of CARS) if (d.won && c.requires === d.event.n) unlocks.push(`The ${c.name} can now be bought!`);
  for (const m of d.milestones) if (m.title) unlocks.push(`${m.stars}★: you are now a "${m.title}"!`);
  const trophies = raceAchievements.splice(0).map(a => `🏆 ${a.name}${a.reward ? ` · +${fmt(a.reward)}` : ''}`);
  const prize = d.lines[0][1];
  modal(`
    <div class="result-title ${d.won ? 'win' : 'lose'}">${d.won ? 'VICTORY' : 'DEFEAT'}</div>
    <div class="result-sub">${d.won ? `You beat ${d.opp}` : `${d.opp} got you this time`} · ${d.won ? '+' : '−'}${Math.abs(gap).toFixed(2)}s</div>
    <div class="new-stars">${d.won ? `${d.event.name} cleared · +1★` : `${d.event.name} again next time`}</div>
    <div class="result-money" id="result-money">+${fmt(d.total)}</div>
    <div class="rows">${d.lines.map(([k, v]) => `<div class="row"><span>${k}</span><span class="plus">+${fmt(v)}</span></div>`).join('')}</div>
    <button class="btn ad result-ad" id="result-ad">${ICONS.play}Watch an ad: 2× prize (+${fmt(prize)})</button>
    ${unlocks.map(u => `<div class="unlock">${u}</div>`).join('')}
    ${trophies.length ? `<div class="trophies">${trophies.map(u => `<div class="unlock trophy">${u}</div>`).join('')}</div>` : ''}
    <div class="rows">
      <div class="row"><span>Your time</span><span>${t(d.you)}</span></div>
      <div class="row"><span>${d.opp}</span><span>${t(d.them)}</span></div>
      <div class="row"><span>${LAUNCH_NAME[d.launch] || 'Launch'}</span><span>${d.reaction == null ? '—' : d.reaction.toFixed(3) + 's'}</span></div>
      <div class="row"><span>Shifts</span><span>${shiftText}</span></div>
      ${d.nitros?.length ? `<div class="row"><span>Nitro</span><span>${nitroText(d.nitros)}</span></div>` : ''}
      <div class="row"><span>Next</span><span>${next.name} · vs ${OPPONENTS[next.opp].name} · PR ${next.rec}</span></div>
    </div>
    ${tip ? `<div class="tip">Tip: ${tip}</div>` : ''}
    <div class="actions">
      <button class="btn go" data-m="garage">Back to the garage</button>
    </div>`, actions);
  // the ad doubles the race prize once (milestone cash isn't doubled)
  const ad = $('result-ad');
  ad.onclick = e => {
    e.stopPropagation();
    if (ad.disabled) return;
    sfx.click();
    watchAd('double-prize', () => {
      bonusPayout(prize);
      sfx.buy();
      ad.disabled = true;
      ad.textContent = `Prize doubled: +${fmt(prize)}`;
      $('result-money').textContent = `+${fmt(d.total + prize)}`;
    });
  };
}

// End of a Practice lesson: how each of the three skills went, with the rule to remember.
export function showPracticeDone(d, actions) {
  const n = q => d.shifts.filter(s => s === q).length;
  const shiftText = ['perfect', 'good', 'early', 'late'].filter(q => n(q)).map(q => `${n(q)} ${q}`).join(', ') || 'none';
  const skill = (name, result, good, rule) => `<div class="skill ${good ? 'ok' : ''}">
    <div class="skill-head"><b>${name}</b><span>${result}</span></div><small>${rule}</small></div>`;
  modal(`
    <div class="result-title win">LESSON DONE</div>
    <div class="result-sub">Practice races pay nothing. Run it again any time from the Race menu.</div>
    <div class="skills">
      ${skill('1 · Launch', LAUNCH_NAME[d.launch] || '—', d.launch === 'perfect' || d.launch === 'good', 'Press and hold on the yellow lights, then let go the instant the light turns GREEN. Under 0.2 s is a PERFECT launch.')}
      ${skill('2 · Shift', shiftText, n('early') + n('late') === 0, 'Tap when the rev bar reaches the GREEN zone. Its bright middle is a PERFECT shift: a burst of speed.')}
      ${skill('3 · Nitro', nitroText(d.nitros) || 'not used', d.nitros.includes('chain'), 'In top gear, tap for a burst. Tap again when the button flashes white to CHAIN a bigger one.')}
    </div>
    <div class="actions">
      <button class="btn" data-m="garage">Garage</button>
      <button class="btn go" data-m="again">Practice again</button>
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
