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
    score: $('score'),
    wave: $('wave'),
    combo: $('combo'),
    embers: $('embers'),
    bossBar: $('boss-bar'),
    bossName: $('boss-name'),
    bossFill: $('boss-fill'),
    title: $('title-screen'),
    bestScore: $('best-score'),
    upgrade: $('upgrade-screen'),
    upgradeCards: $('upgrade-cards'),
    pause: $('pause-screen'),
    gameover: $('gameover-screen'),
    finalScore: $('final-score'),
    finalWave: $('final-wave'),
    finalKills: $('final-kills'),
    victory: $('victory-screen'),
    victoryScore: $('victory-score'),
    toast: $('toast'),
  };

  let toastTimer = null;

  function showToast(text, ms = 2200) {
    els.toast.textContent = text;
    els.toast.classList.add('show');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => els.toast.classList.remove('show'), ms);
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
    els.score.textContent = String(game.score);
    els.wave.textContent = `WAVE ${game.wave} / 10`;
    els.embers.textContent = `⬢ ${game.embers}`;
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
      card.innerHTML = `<span class="up-key">${index + 1}</span>
        <span class="up-name">${choice.name}</span>
        <span class="up-desc">${choice.desc}</span>`;
      card.addEventListener('click', () => onPick(choice));
      els.upgradeCards.appendChild(card);
    });
  }

  function showPause() {
    showOnly('pause');
  }

  function showGameOver(game) {
    showOnly('gameover');
    els.finalScore.textContent = String(game.score);
    els.finalWave.textContent = String(game.wave);
    els.finalKills.textContent = String(game.kills);
  }

  function showVictory(game) {
    showOnly('victory');
    els.victoryScore.textContent = String(game.score);
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
