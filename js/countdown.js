/**
 * js/countdown.js
 * The Victorian Pocket Watch Chronometer.
 * Manages dials, mechanical tick audio synthesis, winding gesture, and hunter-case lid.
 * Audio-safety: Prevents any chime / tick overlap with the main soundtrack.
 */
import { CONFIG } from './config.js';
import { clock } from './clock.js';
import { stateMachine, STATES, storage } from './state.js';

class PocketWatchController {
  constructor() {
    this.audioCtx = null;
    this.isMuted = storage.get('mb_mute_pref', false);
    this.audioUnlocked = false;
    this.lastTickSec = null;
    this.windTimer = null;
    this.chimeInterval = null;
  }

  init() {
    this.cacheElements();
    this.setupLidInteractivity();
    this.setupCrownWinding();
    this.setupMuteToggle();
    this.renderMonograms();
    this.setupParallaxGlare();

    // Subscribe to clock updates
    clock.subscribe((rem) => {
      this.updateDials(rem);
      this.handleTicking(rem);
    });

    // Subscribe to state transitions
    stateMachine.subscribe((state) => {
      this.handleState(state);
    });
  }

  cacheElements() {
    this.daysEl = document.getElementById('chrono-days');
    this.hoursEl = document.getElementById('chrono-hours');
    this.minsEl = document.getElementById('chrono-mins');
    this.secsEl = document.getElementById('chrono-secs');
    this.statusLine = document.getElementById('watch-status-line');
    this.lidEl = document.getElementById('hunter-lid');
    this.lidToggleBtn = document.getElementById('lid-toggle-btn');
    this.crownEl = document.getElementById('watch-crown');
    this.crownHint = document.getElementById('crown-hint');
    this.muteBtn = document.getElementById('watch-mute-toggle');
    this.monogramLid = document.getElementById('lid-monogram-text');
    this.monogramDial = document.getElementById('dial-monogram-text');
  }

  renderMonograms() {
    const initials = CONFIG.initials || 'XY';
    if (this.monogramLid) this.monogramLid.textContent = initials;
    if (this.monogramDial) this.monogramDial.textContent = initials;
  }

  setupParallaxGlare() {
    this.glareEl = document.querySelector('.watch-glass-glare');
    this.watchChainAnchor = document.querySelector('.watch-chain-anchor');
    if (!this.glareEl) return;

    // Mouse movement glint on desktop
    window.addEventListener('mousemove', (e) => {
      const xPercent = (e.clientX / window.innerWidth - 0.5) * 26;
      const yPercent = (e.clientY / window.innerHeight - 0.5) * 26;
      if (this.glareEl) {
        this.glareEl.style.transform = `translate3d(${xPercent}px, ${yPercent}px, 0)`;
      }
    }, { passive: true });

    // Gyroscope tilt on mobile
    if (typeof window !== 'undefined' && window.DeviceOrientationEvent) {
      window.addEventListener('deviceorientation', (e) => {
        if (e.gamma !== null && e.beta !== null) {
          const tiltX = Math.max(-25, Math.min(25, e.gamma * 0.75));
          const tiltY = Math.max(-25, Math.min(25, (e.beta - 45) * 0.75));
          if (this.glareEl) {
            this.glareEl.style.transform = `translate3d(${tiltX}px, ${tiltY}px, 0)`;
          }
          if (this.watchChainAnchor) {
            this.watchChainAnchor.style.transform = `rotate(${tiltX * 0.22}deg)`;
          }
        }
      }, { passive: true });
    }
  }

  setupLidInteractivity() {
    if (!this.lidEl) return;

    const isLidClosed = storage.get('mb_lid_closed', false);
    if (!isLidClosed) {
      this.lidEl.classList.add('is-open');
      if (this.lidToggleBtn) this.lidToggleBtn.textContent = 'Close Lid';
    } else {
      if (this.lidToggleBtn) this.lidToggleBtn.textContent = 'Flip Lid Open';
    }

    const toggleLid = () => {
      const willOpen = !this.lidEl.classList.contains('is-open');
      this.lidEl.classList.toggle('is-open', willOpen);
      storage.set('mb_lid_closed', !willOpen);
      if (this.lidToggleBtn) {
        this.lidToggleBtn.textContent = willOpen ? 'Close Lid' : 'Flip Lid Open';
      }
      this.playTickSound(800, 0.04);
    };

    this.lidEl.addEventListener('click', toggleLid);
    if (this.lidToggleBtn) {
      this.lidToggleBtn.addEventListener('click', toggleLid);
    }
  }

  setupCrownWinding() {
    if (!this.crownEl) return;

    const startWinding = (e) => {
      e.preventDefault();
      this.initAudioContext();
      this.crownEl.classList.add('is-winding');
      if (this.crownHint) {
        this.crownHint.textContent = 'Winding mechanism...';
        this.crownHint.classList.add('hint-visible');
      }

      let tickCounter = 0;
      this.windTimer = setInterval(() => {
        tickCounter++;
        this.playTickSound(1200 + (tickCounter * 50), 0.03);
        if (tickCounter >= 6) {
          clearInterval(this.windTimer);
          this.windTimer = null;
          this.audioUnlocked = true;
          this.crownEl.classList.remove('is-winding');
          if (this.crownHint) {
            this.crownHint.textContent = 'Mechanism fully wound!';
            setTimeout(() => this.crownHint.classList.remove('hint-visible'), 1500);
          }
        }
      }, 100);
    };

    const cancelWinding = () => {
      if (this.windTimer) {
        clearInterval(this.windTimer);
        this.windTimer = null;
      }
      if (this.crownEl) this.crownEl.classList.remove('is-winding');
    };

    this.crownEl.addEventListener('pointerdown', startWinding);
    window.addEventListener('pointerup', cancelWinding);
    window.addEventListener('pointercancel', cancelWinding);
  }

  setupMuteToggle() {
    if (!this.muteBtn) return;
    this.updateMuteUI();

    this.muteBtn.addEventListener('click', () => {
      this.isMuted = !this.isMuted;
      storage.set('mb_mute_pref', this.isMuted);
      this.updateMuteUI();
      if (!this.isMuted) {
        this.initAudioContext();
        this.playTickSound(1000, 0.05);
      }
    });
  }

  updateMuteUI() {
    if (!this.muteBtn) return;
    this.muteBtn.innerHTML = this.isMuted
      ? '<span>🔇 Audio Muted</span>'
      : '<span>🔊 Audio On</span>';
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTickSound(freq = 900, duration = 0.04) {
    if (this.isMuted || !this.audioCtx) return;

    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + duration);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {}
  }

  playChime(count = 1) {
    if (this.isMuted || !this.audioCtx) return;

    try {
      const freqs = [523.25, 659.25, 783.99]; // C Major triad chord
      freqs.forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);

        const decay = 1.4 - (idx * 0.2);
        gain.gain.setValueAtTime(0.04 / (idx + 1), this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + decay);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.start();
        osc.stop(this.audioCtx.currentTime + decay);
      });
    } catch (e) {}
  }

  updateDials(rem) {
    const pad = (n) => String(n).padStart(2, '0');

    if (rem.isPast) {
      if (this.daysEl) this.daysEl.textContent = '00';
      if (this.hoursEl) this.hoursEl.textContent = '00';
      if (this.minsEl) this.minsEl.textContent = '00';
      if (this.secsEl) this.secsEl.textContent = '00';
      return;
    }

    if (this.daysEl) this.daysEl.textContent = pad(rem.days);
    if (this.hoursEl) this.hoursEl.textContent = pad(rem.hours);
    if (this.minsEl) this.minsEl.textContent = pad(rem.minutes);
    if (this.secsEl) this.secsEl.textContent = pad(rem.seconds);
  }

  handleTicking(rem) {
    if (rem.isPast) return;

    const currentSec = rem.seconds;
    if (currentSec !== this.lastTickSec) {
      this.lastTickSec = currentSec;

      if (this.audioUnlocked && !this.isMuted) {
        if (rem.totalMs <= 10000) {
          this.playTickSound(1400, 0.03);
          setTimeout(() => this.playTickSound(1100, 0.03), 150);
        } else if (rem.totalMs <= 60000) {
          this.playTickSound(1100, 0.04);
        } else {
          this.playTickSound(900, 0.03);
        }
      }
    }
  }

  handleState(state) {
    if (!this.statusLine) return;

    if (state === STATES.LOCKED) {
      this.statusLine.textContent = '';
      this.stopMidnightChimes();
    } else if (state === STATES.FINAL_MINUTE) {
      this.statusLine.textContent = "Don't look away.";
      this.statusLine.style.color = 'var(--color-vintage-gold)';
    } else if (state === STATES.REVEALING) {
      this.statusLine.textContent = 'Midnight has arrived.';
      this.triggerMidnightChimes();
    } else if (state === STATES.UNLOCKED) {
      this.statusLine.textContent = 'Happy Birthday';
      // Instantly silence any remaining intro chimes so Night Changes plays cleanly
      this.stopMidnightChimes();
    }
  }

  triggerMidnightChimes() {
    this.stopMidnightChimes();
    let chimeIdx = 0;
    // Play 3 brief, sweet melodic bell chimes spaced 750ms apart
    this.playChime(0);
    chimeIdx = 1;

    this.chimeInterval = setInterval(() => {
      this.playChime(chimeIdx);
      chimeIdx++;
      if (chimeIdx >= 3) {
        this.stopMidnightChimes();
      }
    }, 750);
  }

  stopMidnightChimes() {
    if (this.chimeInterval) {
      clearInterval(this.chimeInterval);
      this.chimeInterval = null;
    }
  }
}

export const pocketWatch = new PocketWatchController();
