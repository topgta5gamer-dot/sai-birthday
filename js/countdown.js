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
    this.chimeInterval = null;
  }

  init() {
    this.cacheElements();
    this.setupLidInteractivity();
    this.setupMuteToggle();
    this.renderMonograms();
    this.setupParallaxGlare();

    // Auto-unlock audio context on user gesture
    const unlockAudio = () => {
      this.audioUnlocked = true;
      this.initAudioContext();
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

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

    const toggleLid = (e) => {
      if (e) e.stopPropagation();
      this.initAudioContext();
      this.audioUnlocked = true;

      const willOpen = !this.lidEl.classList.contains('is-open');
      this.lidEl.classList.toggle('is-open', willOpen);
      storage.set('mb_lid_closed', !willOpen);

      if (this.lidToggleBtn) {
        this.lidToggleBtn.textContent = willOpen ? 'Close Lid' : 'Flip Lid Open';
      }

      if (willOpen) {
        this.playLidOpenSound();
      } else {
        this.playLidCloseSound();
      }
    };

    this.lidEl.addEventListener('click', toggleLid);
    if (this.lidToggleBtn) {
      this.lidToggleBtn.addEventListener('click', toggleLid);
    }
  }

  playLidOpenSound() {
    if (this.isMuted || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      // Stage 1: Spring release latch click
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1600, now);
      osc1.frequency.exponentialRampToValueAtTime(350, now + 0.04);
      gain1.gain.setValueAtTime(0.09, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.04);

      // Stage 2: Golden hinge metallic ping
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2400, now + 0.015);
      osc2.frequency.exponentialRampToValueAtTime(650, now + 0.16);
      gain2.gain.setValueAtTime(0.045, now + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.015);
      osc2.stop(now + 0.16);
    } catch (e) {}
  }

  playLidCloseSound() {
    if (this.isMuted || !this.audioCtx) return;
    try {
      const now = this.audioCtx.currentTime;
      // Stage 1: Bezel rim contact
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(750, now);
      osc1.frequency.exponentialRampToValueAtTime(180, now + 0.035);
      gain1.gain.setValueAtTime(0.07, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.035);

      // Stage 2: Mechanical hunter-case latch lock snap
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(1400, now + 0.028);
      osc2.frequency.exponentialRampToValueAtTime(280, now + 0.085);
      gain2.gain.setValueAtTime(0.08, now + 0.028);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.028);
      osc2.stop(now + 0.085);
    } catch (e) {}
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
