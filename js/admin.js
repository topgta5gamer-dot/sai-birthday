/**
 * js/admin.js
 * Creator / Admin verification mode.
 * Section 8:
 *  - Only active when ?preview=[previewKey] is in URL.
 *  - If key is wrong or missing, this module injects NOTHING into the DOM.
 *  - Provides live Time-Machine controls: Pre-Midnight, T-10s, Post-Midnight, Reset, Clear Storage.
 */
import { CONFIG } from './config.js';
import { clock } from './clock.js';
import { stateMachine, STATES, storage } from './state.js';

export function initAdmin() {
  const params = new URLSearchParams(window.location.search);
  const userKey = params.get('preview');

  if (!userKey || userKey !== CONFIG.previewKey) {
    // Silent exit. No admin elements injected into DOM.
    return;
  }

  renderAdminBar();
}

function renderAdminBar() {
  // Check if already created
  if (document.getElementById('admin-time-machine')) return;

  const bar = document.createElement('aside');
  bar.id = 'admin-time-machine';
  bar.className = 'admin-bar';
  bar.setAttribute('aria-label', 'Creator Time Machine Controls');

  bar.innerHTML = `
    <div class="admin-bar-header">
      <span class="admin-badge">Admin Mode</span>
      <span class="admin-status" id="admin-status-text">State: Initializing</span>
    </div>
    <div class="admin-bar-controls">
      <button type="button" class="admin-btn" id="btn-pre-midnight" title="Force pre-midnight locked countdown">
        ⏳ Pre-Midnight
      </button>
      <button type="button" class="admin-btn admin-btn-highlight" id="btn-t-minus-10" title="Simulate 10 seconds before midnight">
        ⚡ T-minus 10s
      </button>
      <button type="button" class="admin-btn" id="btn-post-midnight" title="Force post-midnight unlocked celebration">
        🎉 Post-Midnight
      </button>
      <button type="button" class="admin-btn" id="btn-reset-clock" title="Restore real world clock">
        ↺ Real Clock
      </button>
      <button type="button" class="admin-btn admin-btn-danger" id="btn-clear-storage" title="Clear saved user progress">
        🧹 Reset Progress
      </button>
    </div>
  `;

  document.body.appendChild(bar);

  // Bind Buttons
  const targetTime = clock.getTarget();

  // 1. Pre-Midnight: set clock offset so countdown is safely in the future (> 1 hour)
  document.getElementById('btn-pre-midnight').addEventListener('click', () => {
    // If real time is already before unlock, offset is 0, otherwise shift target forward
    const realRemaining = targetTime - Date.now();
    if (realRemaining > 60000) {
      clock.resetOffset();
    } else {
      // Simulate being 3 hours before target
      clock.setOffset(targetTime - (3 * 3600 * 1000) - Date.now());
    }
    stateMachine.transitionTo(STATES.LOCKED);
  });

  // 2. T-minus 10 seconds: zero will be hit in exactly 10,000 ms
  document.getElementById('btn-t-minus-10').addEventListener('click', () => {
    const requiredOffset = (targetTime - 10000) - Date.now();
    clock.setOffset(requiredOffset);
    stateMachine.transitionTo(STATES.FINAL_MINUTE);
  });

  // 3. Post-Midnight: unlocked celebration
  document.getElementById('btn-post-midnight').addEventListener('click', () => {
    const requiredOffset = (targetTime + 2000) - Date.now();
    clock.setOffset(requiredOffset);
    stateMachine.transitionTo(STATES.UNLOCKED);
  });

  // 4. Real Clock
  document.getElementById('btn-reset-clock').addEventListener('click', () => {
    clock.resetOffset();
    const rem = clock.getRemaining();
    if (rem.isPast) {
      stateMachine.transitionTo(STATES.UNLOCKED, { quiet: true });
    } else if (rem.totalMs <= 60000) {
      stateMachine.transitionTo(STATES.FINAL_MINUTE);
    } else {
      stateMachine.transitionTo(STATES.LOCKED);
    }
  });

  // 5. Clear Storage
  document.getElementById('btn-clear-storage').addEventListener('click', () => {
    storage.clearAll();
    window.location.reload();
  });

  // Live Status updater
  const statusEl = document.getElementById('admin-status-text');
  const updateStatus = () => {
    const rem = clock.getRemaining();
    const st = stateMachine.getState();
    const offsetSec = Math.round(clock.getOffset() / 1000);
    const offsetStr = offsetSec !== 0 ? ` (Offset: ${offsetSec}s)` : ' (Real Time)';
    statusEl.textContent = `State: [${st}] | Rem: ${rem.days}d ${rem.hours}h ${rem.minutes}m ${rem.seconds}s${offsetStr}`;
  };

  clock.subscribe(updateStatus);
  stateMachine.subscribe(updateStatus);
  updateStatus();
}
