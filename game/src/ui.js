// EMBERFALL — DOM interface: the HUD (hearts, score, wave, combo, embers, boss
// bar) and the menu screens (title, upgrade choice, pause, game over, victory).
// The game itself is drawn on canvas; the DOM carries the text-heavy chrome so it
// stays crisp and readable in screenshots.

export function createUI(handlers) {
  const $ = (id) => document.getElementById(id);
  const els = {
    hud: $('hud'),
    hearts: $('hearts'),
    hpFill: $('hp-fill'),
    hpText: $('hp-text'),
    heartFill: $('heart-fill'),
    heartText: $('heart-text'),
    flameFill: $('flame-fill'),
    flameText: $('flame-text'),
    score: $('score'),
    wave: $('wave'),
    nightName: $('night-name'),
    combo: $('combo'),
    embers: $('embers'),
    bossBar: $('boss-bar'),
    bossName: $('boss-name'),
    bossFill: $('boss-fill'),
    nightBanner: $('night-banner'),
    bannerTitle: $('banner-title'),
    bannerTwist: $('banner-twist'),
    title: $('title-screen'),
    bestScore: $('best-score'),
    upgrade: $('upgrade-screen'),
    upgradeCards: $('upgrade-cards'),
    pause: $('pause-screen'),
    gameover: $('gameover-screen'),
    gameoverTitle: $('gameover-title'),
    gameoverSub: $('gameover-sub'),
    finalScore: $('final-score'),
    finalWave: $('final-wave'),
    finalKills: $('final-kills'),
    finalFed: $('final-fed'),
    finalCombo: $('final-combo'),
    victory: $('victory-screen'),
    victoryScore: $('victory-score'),
    victoryKills: $('victory-kills'),
    victoryHeart: $('victory-heart'),
    victoryFed: $('victory-fed'),
    victoryCombo: $('victory-combo'),
    toast: $('toast'),
  };

  let toastTimer = null;
  let bannerTimer = null;

  function showNightBanner(wave, name, twist) {
    els.bannerTitle.textContent = `NIGHT ${wave} — ${name.toUpperCase()}`;
    els.bannerTwist.textContent = twist;
    els.nightBanner.classList.remove('hidden');
    els.nightBanner.classList.add('show');
    if (bannerTimer) window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => els.nightBanner.classList.remove('show'), 2600);
  }

  function hideNightBanner() {
    if (bannerTimer) window.clearTimeout(bannerTimer);
    els.nightBanner.classList.remove('show');
  }

  function showToast(text, ms = 2200) {
    els.toast.textContent = text;
    els.toast.classList.add('show');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), ms);
  }

  function hideToast() {
    if (toastTimer) window.clearTimeout(toastTimer);
    els.toast.classList.remove('show');
  }

  function showOnly(name) {
    for (const key of ['title', 'upgrade', 'pause', 'gameover', 'victory']) {
      els[key].classList.toggle('hidden', key !== name);
    }
    els.hud.classList.toggle('hidden', name === 'title');
  }

  function updateHUD(game) {
    const p = game.player;
    if (!p) return;
    // Hearts: 3 hearts, each worth a third of max HP, with partial fill.
    let heartsHtml = '';
    const perHeart = p.maxHp / 3;
    for (let i = 0; i < 3; i += 1) {
      const fill = Math.max(0, Math.min(1, (p.hp - i * perHeart) / perHeart));
      const cls = fill >= 1 ? 'full' : fill > 0 ? 'half' : 'empty';
      heartsHtml += `<span class="heart ${cls}">♥</span>`;
    }
    els.hearts.innerHTML = heartsHtml;
    const hpFrac = Math.max(0, p.hp / p.maxHp);
    els.hpFill.style.width = `${hpFrac * 100}%`;
    els.hpFill.classList.toggle('low', hpFrac < 0.3);
    els.hpText.textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
    // The Heart's own bar: the second health bar, the one the run is about.
    const heart = game.heart;
    if (heart) {
      const heartFrac = Math.max(0, heart.hp / heart.maxHp);
      els.heartFill.style.width = `${heartFrac * 100}%`;
      els.heartFill.classList.toggle('low', heartFrac < 0.35);
      els.heartText.textContent = `♥ ${Math.ceil(heart.hp)} / ${heart.maxHp}`;
    }
    // The Heart's flame: the meter the whole run is about. It drains all
    // night and only embers fed to the Heart refill it.
    if (heart) {
      const fuelFrac = Math.max(0, heart.fuel / heart.maxFuel);
      els.flameFill.style.width = `${fuelFrac * 100}%`;
      els.flameFill.classList.toggle('low', fuelFrac < 0.3);
      els.flameText.textContent = fuelFrac <= 0
        ? '🔥 FLAME OUT — FEED IT NOW!'
        : `🔥 FLAME ${Math.ceil(heart.fuel)} / ${heart.maxFuel}`;
    }
    els.score.textContent = String(game.score);
    els.wave.textContent = `NIGHT ${game.wave} / 10`;
    els.nightName.textContent = game.nightName ? `— ${game.nightName.toUpperCase()} —` : '';
    const carryCap = 12 + (game.player.mods.carryBonus ?? 0);
    els.embers.textContent = `⬢ ${game.carried} / ${carryCap} CARRIED`;
    const mult = game.comboMultiplier();
    els.combo.textContent = game.combo > 1 ? `COMBO x${mult.toFixed(1)} (${game.combo})` : '';
    els.combo.classList.toggle('hot', mult >= 2);

    if (game.boss && game.boss.hp > 0) {
      els.bossBar.classList.remove('hidden');
      els.bossName.textContent = `☠ ${game.boss.type === 'boss' ? 'EMBER TYRANT' : 'BOSS'}`;
      els.bossFill.style.width = `${Math.max(0, (game.boss.hp / game.boss.maxHp) * 100)}%`;
    } else {
      els.bossBar.classList.add('hidden');
    }
  }

  function showTitle(best) {
    showOnly('title');
    els.bestScore.textContent = best > 0 ? `BEST SCORE: ${best}` : 'No runs yet — make your first ember fall.';
  }

  function showUpgrade(choices, onPick) {
    showOnly('upgrade');
    els.upgradeCards.innerHTML = '';
    choices.forEach((choice, index) => {
      const card = document.createElement('button');
      card.className = 'upgrade-card';
      const tag = choice.tag === 'heart'
        ? '<span class="up-tag">♥ HEART UPGRADE</span>'
        : '';
      card.innerHTML = `<span class="up-key">${index + 1}</span>
        <span class="up-name">${choice.name}</span>
        ${tag}
        <span class="up-desc">${choice.desc}</span>`;
      card.addEventListener('click', () => onPick(choice));
      els.upgradeCards.appendChild(card);
    });
  }

  function showPause() {
    showOnly('pause');
  }

  function showGameOver(game, reason) {
    showOnly('gameover');
    if (reason === 'heart') {
      els.gameoverTitle.textContent = 'THE HEART IS ASH';
      els.gameoverSub.textContent = 'The last ember is out. The dark takes the arena.';
    } else {
      els.gameoverTitle.textContent = 'EMBER DOWN';
      els.gameoverSub.textContent = 'The arena keeps your score — but the Heart burns on.';
    }
    els.finalScore.textContent = String(game.score);
    els.finalWave.textContent = String(game.wave);
    els.finalKills.textContent = String(game.kills);
    els.finalFed.textContent = String(game.fed);
    els.finalCombo.textContent = `x${game.bestCombo}`;
  }

  function showVictory(game) {
    showOnly('victory');
    els.victoryScore.textContent = String(game.score);
    els.victoryKills.textContent = String(game.kills);
    els.victoryHeart.textContent = game.heart ? `${Math.ceil(game.heart.hp)} / ${game.heart.maxHp}` : '—';
    els.victoryFed.textContent = String(game.fed);
    els.victoryCombo.textContent = `x${game.bestCombo}`;
  }

  // Buttons.
  $('btn-start').addEventListener('click', () => handlers.onStart());
  $('btn-resume').addEventListener('click', () => handlers.onResume());
  $('btn-restart-pause').addEventListener('click', () => handlers.onRestart());
  $('btn-restart-over').addEventListener('click', () => handlers.onRestart());
  $('btn-restart-victory').addEventListener('click', () => handlers.onRestart());
  $('btn-title-over').addEventListener('click', () => handlers.onTitle());
  $('btn-title-victory').addEventListener('click', () => handlers.onTitle());
  $('btn-mute').addEventListener('click', () => handlers.onMute());

  return {
    showToast,
    hideToast,
    showNightBanner,
    hideNightBanner,
    showOnly,
    updateHUD,
    showTitle,
    showUpgrade,
    showPause,
    showGameOver,
    showVictory,
    setMuteLabel(muted) {
      $('btn-mute').textContent = muted ? '🔇 Unmute (M)' : '🔊 Mute (M)';
    },
  };
}
