// EMBERFALL — tuning table. Every number that shapes how the game feels lives here,
// so a balance pass is one file, not a hunt through the codebase.
export const CONFIG = {
  // Arena (logical pixels; the canvas scales to fit the window).
  WIDTH: 1280,
  HEIGHT: 720,

  // Fixed-step simulation.
  STEP: 1 / 60,

  // The Ember Heart: the last ember of the old world, burning at the arena's
  // core. Enemies hunt it; if it dies, the night wins. The player defends it.
  HEART_X: 640,
  HEART_Y: 360,
  HEART_RADIUS: 26,
  HEART_MAX_HP: 150,
  HEART_NIGHT_HEAL: 25,
  HEART_LIGHT_RADIUS: 235,
  HEART_TOUCH_COOLDOWN: 1.5, // seconds between one enemy's bites at the Heart
  HEART_NOVA_RADIUS: 170,

  // The Heart's flame (EMBERFALL 3.0): fuel drains all night; feeding
  // embers is the only way to keep it burning. At 0 fuel the Heart burns
  // out — it starts losing HP until it is fed again.
  FLAME: {
    MAX_FUEL: 100,
    DRAIN_BASE: 1.15, // fuel per second, night 1 — 4.0: the flame breathes easier
    DRAIN_PER_NIGHT: 0.10, // +fuel per second each later night
    FEED_FUEL: 6, // fuel per ember fed
    FEED_HP: 3, // Heart HP healed per ember fed — feeding is real triage
    FEED_SCORE: 15,
    FEED_RATE: 5, // embers poured in per second, standing by the Heart
    FEED_RADIUS: 95, // distance from the Heart's centre to feed
    CARRY_CAP: 12, // embers the satchel holds (upgrades raise it)
    BURNOUT_HP_PER_SEC: 3, // Heart HP lost per second with no fuel
    LOW_FUEL: 30, // below this the flame is "low": warnings, dimming
    NIGHT_REFUEL: 30, // dawn rekindles the Heart a little each night
  },

  // Player.
  PLAYER_RADIUS: 14,
  PLAYER_MAX_HP: 115,
  PLAYER_ACCEL: 2600,
  PLAYER_MAX_SPEED: 330,
  PLAYER_FRICTION: 4.2,
  PLAYER_FIRE_RATE: 6.5, // shots per second
  PLAYER_BULLET_SPEED: 640,
  PLAYER_BULLET_DAMAGE: 12,
  PLAYER_BULLET_RADIUS: 5,
  DASH_SPEED: 950,
  DASH_TIME: 0.16,
  DASH_COOLDOWN: 1.7,
  DASH_IFRAMES: 0.35,
  CONTACT_IFRAMES: 0.8,
  MAGNET_RADIUS: 110, // 4.0: embers fly home faster, less time away from the Heart

  // Scoring.
  COMBO_WINDOW: 3.0, // seconds between kills before the combo decays
  COMBO_STEP: 0.1, // +10% score per combo kill
  COMBO_MAX: 3.0, // multiplier cap (x3)
  EMBER_SCORE: 10,
  HEART_HEAL: 25,
  HEART_DROP_CHANCE: 0.12,

  // Waves.
  TOTAL_WAVES: 10,
  BOSS_WAVES: [5, 10],
  WAVE_CLEAR_BONUS: 150,
  BETWEEN_WAVE_DELAY: 1.2,

  // Particles / juice.
  MAX_PARTICLES: 420,
  SHAKE_MAX: 14,

  // Enemy tuning, per type. hp / speed scale a little with the wave.
  ENEMIES: {
    drifter: {
      name: 'Drifter',
      hp: 22,
      speed: 72,
      radius: 16,
      damage: 10,
      score: 50,
      embers: 3,
      color: '#ff5d8f',
      glow: '#ff2e63',
    },
    dart: {
      name: 'Dart',
      hp: 10,
      speed: 195,
      radius: 10,
      damage: 8,
      score: 40,
      embers: 2,
      color: '#ffd166',
      glow: '#ffb703',
    },
    splitter: {
      name: 'Splitter',
      hp: 32,
      speed: 56,
      radius: 21,
      damage: 12,
      score: 60,
      embers: 3,
      color: '#7bd389',
      glow: '#38b000',
    },
    mini: {
      name: 'Mini',
      hp: 8,
      speed: 150,
      radius: 9,
      damage: 6,
      score: 20,
      embers: 1,
      color: '#a7f3d0',
      glow: '#38b000',
    },
    spitter: {
      name: 'Spitter',
      hp: 26,
      speed: 62,
      radius: 15,
      damage: 8,
      score: 70,
      embers: 3,
      color: '#b388ff',
      glow: '#7b2fbe',
    },
    boss: {
      name: 'Ember Tyrant',
      hp: 650,
      speed: 58,
      radius: 48,
      damage: 18,
      score: 1000,
      embers: 20,
      color: '#ff3b30',
      glow: '#ff6b00',
    },
    kindler: {
      name: 'Kindler',
      hp: 14,
      speed: 132,
      radius: 12,
      damage: 5,
      score: 60,
      embers: 2,
      color: '#ff7b00',
      glow: '#ffb347',
    },
    shade: {
      name: 'Shade',
      hp: 18,
      speed: 112,
      radius: 13,
      damage: 10,
      score: 70,
      embers: 2,
      color: '#8b7fd4',
      glow: '#b7a6ff',
    },
    warden: {
      name: 'Warden of Ash',
      hp: 320,
      speed: 46,
      radius: 34,
      damage: 14,
      score: 500,
      embers: 10,
      color: '#c9b8ff',
      glow: '#7b2fbe',
    },
    sniper: {
      name: 'Longshot',
      hp: 16,
      speed: 96,
      radius: 12,
      damage: 6, // the bolt it fires at the Heart — 4.0: snipers graze, not gut
      score: 90,
      embers: 3,
      color: '#7df9ff',
      glow: '#00b4d8',
    },
    rammer: {
      name: 'Crasher',
      hp: 30,
      speed: 128,
      radius: 15,
      damage: 12, // the blast when it reaches the Heart and bursts
      score: 80,
      embers: 3,
      color: '#ff8c42',
      glow: '#ff5400',
    },
    bulwark: {
      name: 'Bulwark',
      hp: 150, // a walking wall: Overcharge and pierce exist for this
      speed: 40,
      radius: 26,
      damage: 10,
      score: 120,
      embers: 5,
      color: '#94a3b8',
      glow: '#e2e8f0',
    },
  },

  // Enemy bullets (spitter orbs, boss radial shots).
  ENEMY_BULLET_SPEED: 170,
  ENEMY_BULLET_RADIUS: 7,

  // Colours.
  COLORS: {
    bgTop: '#0b1026',
    bgBottom: '#1a0b2e',
    player: '#ffb347',
    playerCore: '#fff3c4',
    bullet: '#ffe66d',
    ember: '#ff9f1c',
    heart: '#ff4d6d',
    text: '#f5f0ff',
    dim: '#9d8fd0',
  },
};

// The ten nights: each has a name, a twist the player feels, and whether the
// arena falls dark (on dark nights only the Heart's light — and the player's
// own glow — can be trusted; Shades hide in the dark).
export const NIGHTS = [
  { name: 'First Sparks', twist: 'Drifters drift in. Learn the Heart — and feed its flame.', dark: false },
  { name: 'Swift Shadows', twist: 'Darts hunt you. Keep moving.', dark: false },
  { name: 'The Splitting', twist: 'Splitters burst into Minis. Longshots snipe the Heart from afar.', dark: false },
  { name: 'Kindlers Wake', twist: 'Kindlers run for the Heart. Guard it.', dark: false },
  { name: 'The Tyrant Wakes', twist: 'The Ember Tyrant comes for the Heart. Crashers charge it.', dark: false },
  { name: 'Night of Shades', twist: 'Darkness falls. Shades hide beyond the light. Bulwarks march — forge Overcharge to break them.', dark: true },
  { name: 'The Warden', twist: 'A Warden shields its swarm. Break the shield.', dark: false },
  { name: 'Ember Rain', twist: 'Kindlers pour in from every edge. Crashers with them.', dark: false },
  { name: 'The Long Dark', twist: 'Darkness again — and everything is faster. Elites burn gold.', dark: true },
  { name: 'The Last Night', twist: 'The Tyrant returns, hungrier. Hold the Heart till dawn.', dark: false },
];

// Night composition: how many of each type a night fields. The mix widens as
// the player survives; Kindlers (Heart-hunters) arrive from night 4, Shades
// from the first dark night, and the Warden holds night 7.
export function nightComposition(night) {
  const comp = [];
  // Boss nights are about the boss: the swarm thins out so the Tyrant —
  // not a wall of bodies — is what the player fights.
  const bossNightScale = CONFIG.BOSS_WAVES.includes(night) ? 0.6 : 1;
  const add = (type, count) => {
    const scaled = type === 'boss' ? count : Math.floor(count * bossNightScale);
    if (scaled > 0) comp.push({ type, count: scaled });
  };
  // The flood grows, but it is capped: late nights stay tense instead of
  // becoming a wall of bodies no one can shoot through in time.
  add('drifter', 4 + night);
  add('dart', night >= 2 ? 2 + Math.floor(night / 2) : 0);
  add('splitter', night >= 3 ? 1 + Math.floor(night / 2) : 0);
  add('spitter', night >= 4 ? Math.floor(night / 2) : 0);
  add('kindler', night >= 4 ? 1 + Math.floor(night * 0.6) : 0);
  add('bulwark', night >= 6 ? 1 + Math.floor((night - 6) / 2) : 0); // 4.0: the walking wall arrives late
  add('sniper', night >= 3 ? 1 + Math.floor(night / 3) : 0);
  add('rammer', night >= 5 ? 1 + Math.floor((night - 3) / 2) : 0);
  add('shade', night >= 6 ? 3 + Math.floor(night * 0.75) : 0);
  if (night === 7) add('warden', 1);
  if (night === 9) add('warden', 1);
  if (CONFIG.BOSS_WAVES.includes(night)) add('boss', 1);
  return comp;
}
