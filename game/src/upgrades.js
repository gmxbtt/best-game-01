// EMBERFALL — the upgrade pool. Between waves the player picks 1 of 3; each
// upgrade mutates game.mods, and every one changes something the player can feel
// (damage numbers, shot count, speed, survivability). Stacks are capped where a
// runaway would break the balance.

export const UPGRADES = [
  {
    id: 'damage',
    name: 'Heavy Embers',
    desc: '+25% bullet damage',
    max: 5,
    apply(mods) { mods.damageMul *= 1.25; },
  },
  {
    id: 'firerate',
    name: 'Rapid Burn',
    desc: '+18% fire rate',
    max: 5,
    apply(mods) { mods.fireRateMul *= 1.18; },
  },
  {
    id: 'multishot',
    name: 'Split Shot',
    desc: '+1 bullet per shot',
    max: 2,
    apply(mods) { mods.multishot += 1; },
  },
  {
    id: 'pierce',
    name: 'Piercing Flames',
    desc: 'Bullets pass through +1 enemy',
    max: 2,
    apply(mods) { mods.pierce += 1; },
  },
  {
    id: 'speed',
    name: 'Swift Wings',
    desc: '+12% movement speed',
    max: 4,
    apply(mods) { mods.speedMul *= 1.12; },
  },
  {
    id: 'maxhp',
    name: 'Ember Heart',
    desc: '+25 max HP and heal 25',
    max: 4,
    apply(mods) { mods.maxHpBonus += 25; },
  },
  {
    id: 'dash',
    name: 'Blink Dash',
    desc: 'Dash recharges 30% faster',
    max: 3,
    apply(mods) { mods.dashCooldownMul *= 0.7; },
  },
  {
    id: 'magnet',
    name: 'Ember Magnet',
    desc: '+60% pickup radius',
    max: 3,
    apply(mods) { mods.magnetMul *= 1.6; },
  },
  {
    id: 'crit',
    name: 'Critical Spark',
    desc: '+12% chance to crit (x2 damage)',
    max: 4,
    apply(mods) { mods.critChance += 0.12; },
  },
  {
    id: 'mendheart',
    name: 'Mend the Heart',
    desc: 'Heal the Heart 50 and raise its max by 25',
    max: 3,
    apply(mods) { mods.heartMend += 1; },
  },
  {
    id: 'thorns',
    name: 'Heart Thorns',
    desc: 'The Heart wounds every enemy that bites it (+12)',
    max: 3,
    apply(mods) { mods.heartThorns += 12; },
  },
  {
    id: 'halo',
    name: 'Halo of Light',
    desc: '+40% light radius — Shades have nowhere to hide',
    max: 2,
    apply(mods) { mods.lightMul *= 1.4; },
  },
  {
    id: 'nova',
    name: 'Heartpulse Nova',
    desc: 'The Heart bursts fire at everything close, every few seconds',
    max: 3,
    apply(mods) { mods.novaLevel += 1; },
  },
];

export function defaultMods() {
  return {
    damageMul: 1,
    fireRateMul: 1,
    multishot: 0,
    pierce: 0,
    speedMul: 1,
    maxHpBonus: 0,
    dashCooldownMul: 1,
    magnetMul: 1,
    critChance: 0,
    heartMend: 0,
    heartThorns: 0,
    lightMul: 1,
    novaLevel: 0,
  };
}

// Roll 3 distinct upgrades the player has not maxed out yet.
export function rollUpgrades(rng, takenCounts) {
  const available = UPGRADES.filter((u) => (takenCounts[u.id] ?? 0) < u.max);
  const pool = available.length >= 3 ? available : UPGRADES;
  rng.shuffle(pool);
  return pool.slice(0, 3);
}
