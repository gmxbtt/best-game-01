// EMBERFALL — tuning table. Every number that shapes how the game feels lives here,
// so a balance pass is one file, not a hunt through the codebase.
export const CONFIG = {
  // Arena (logical pixels; the canvas scales to fit the window).
  WIDTH: 1280,
  HEIGHT: 720,

  // Fixed-step simulation.
  STEP: 1 / 60,

  // Player.
  PLAYER_RADIUS: 14,
  PLAYER_MAX_HP: 100,
  PLAYER_ACCEL: 2600,
  PLAYER_MAX_SPEED: 330,
  PLAYER_FRICTION: 4.2,
  PLAYER_FIRE_RATE: 6.5, // shots per second
  PLAYER_BULLET_SPEED: 640,
  PLAYER_BULLET_DAMAGE: 10,
  PLAYER_BULLET_RADIUS: 5,
  DASH_SPEED: 950,
  DASH_TIME: 0.16,
  DASH_COOLDOWN: 2.0,
  DASH_IFRAMES: 0.35,
  CONTACT_IFRAMES: 0.8,
  MAGNET_RADIUS: 90,

  // Scoring.
  COMBO_WINDOW: 3.0, // seconds between kills before the combo decays
  COMBO_STEP: 0.1, // +10% score per combo kill
  COMBO_MAX: 3.0, // multiplier cap (x3)
  EMBER_SCORE: 10,
  HEART_HEAL: 25,
  HEART_DROP_CHANCE: 0.08,

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

// Wave composition: how many of each type a wave fields, before the boss waves.
// count grows with the wave; the mix widens as the player survives.
export function waveComposition(wave) {
  const comp = [];
  const add = (type, count) => {
    if (count > 0) comp.push({ type, count });
  };
  add('drifter', 4 + wave * 2);
  add('dart', wave >= 2 ? 2 + wave : 0);
  add('splitter', wave >= 3 ? 1 + Math.floor(wave / 2) : 0);
  add('spitter', wave >= 4 ? Math.floor(wave / 2) : 0);
  if (CONFIG.BOSS_WAVES.includes(wave)) add('boss', 1);
  return comp;
}
