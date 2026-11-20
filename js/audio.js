/**
 * js/audio.js
 * Retro Vinyl Audio Engine ("Night Changes - One Direction").
 * Handles MP3 playback, duration formatting, tonearm mechanics, and scrub seeking.
 * Pure audio pipeline: Guaranteed zero overlap with intro chimes or synthetic fallback.
 */
import { CONFIG } from './config.js';
import { storage } from './state.js';

class AudioEngine {
  constructor() {
    this.audioEl = null;
    this.isPlaying = false;
    this.isMuted = storage.get('mb_mute_pref', false);
    this.audioCtx = null;
  }

  init() {
    this.audioEl = document.getElementById('bg-music');
    this.recordEl = document.getElementById('vinyl-record');
    this.tonearmEl = document.getElementById('tonearm-assembly');
    this.playBtn = document.getElementById('vinyl-play-btn');
    this.muteBtn = document.getElementById('vinyl-mute-btn');
    this.timeCurrentEl = document.getElementById('vinyl-time-current');
    this.timeDurationEl = document.getElementById('vinyl-time-duration');
    this.progressFillEl = document.getElementById('vinyl-progress-fill');
    this.progressTrackEl = document.getElementById('vinyl-progress-track');
    this.needlePromptEl = document.getElementById('needle-prompt-banner');

    if (!this.audioEl) return;

    this.audioEl.src = CONFIG.audioSrc;
    this.audioEl.preload = 'auto';
    this.audioEl.muted = this.isMuted;
    this.audioEl.volume = 1.0;

    this.bindEvents();
    this.updateMuteUI();
  }

  bindEvents() {
    if (this.playBtn) {
      this.playBtn.addEventListener('click', () => {
        this.togglePlay();
      });
    }

    if (this.muteBtn) {
      this.muteBtn.addEventListener('click', () => {
        this.toggleMute();
      });
    }

    if (this.needlePromptEl) {
      this.needlePromptEl.addEventListener('click', () => {
        this.needlePromptEl.style.display = 'none';
        this.play();
      });
    }

    if (this.recordEl) {
      this.recordEl.addEventListener('click', () => {
        this.togglePlay();
      });
    }

    this.audioEl.addEventListener('loadedmetadata', () => {
      this.updateProgress(this.audioEl.currentTime, this.audioEl.duration);
    });

    this.audioEl.addEventListener('timeupdate', () => {
      if (this.audioEl.duration) {
        this.updateProgress(this.audioEl.currentTime, this.audioEl.duration);
      }
    });

    this.audioEl.addEventListener('ended', () => {
      this.pause();
    });

    // Scrub tracking
    if (this.progressTrackEl) {
      this.progressTrackEl.addEventListener('click', (e) => {
        const rect = this.progressTrackEl.getBoundingClientRect();
        const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

        if (this.audioEl.duration && !isNaN(this.audioEl.duration)) {
          this.audioEl.currentTime = clickRatio * this.audioEl.duration;
        }
      });
    }
  }

  async play() {
    this.initAudioContext();
    this.isPlaying = true;

    // Drop tonearm & spin record
    if (this.tonearmEl) this.tonearmEl.classList.add('is-playing');
    if (this.recordEl) this.recordEl.classList.add('is-spinning');
    if (this.playBtn) this.playBtn.innerHTML = '<span>⏸ Pause</span>';
    if (this.needlePromptEl) this.needlePromptEl.style.display = 'none';

    try {
      this.audioEl.volume = 1.0;
      await this.audioEl.play();
    } catch (err) {
      console.warn('[Audio] Autoplay waiting for user gesture:', err);
      this.pause();
      this.showNeedlePrompt();
    }
  }

  pause() {
    this.isPlaying = false;

    // Lift tonearm & stop spin
    if (this.tonearmEl) this.tonearmEl.classList.remove('is-playing');
    if (this.recordEl) this.recordEl.classList.remove('is-spinning');
    if (this.playBtn) this.playBtn.innerHTML = '<span>▶ Play</span>';

    if (this.audioEl) {
      this.audioEl.pause();
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audioEl) this.audioEl.muted = this.isMuted;
    storage.set('mb_mute_pref', this.isMuted);
    this.updateMuteUI();
  }

  updateMuteUI() {
    if (!this.muteBtn) return;
    this.muteBtn.innerHTML = this.isMuted
      ? '<span>🔇 Unmute</span>'
      : '<span>🔊 Mute</span>';
  }

  updateProgress(currentTime, duration) {
    if (!duration || isNaN(duration) || duration === 0) return;
    const progressPercent = Math.min(100, (currentTime / duration) * 100);

    if (this.progressFillEl) {
      this.progressFillEl.style.width = `${progressPercent}%`;
    }

    const format = (secs) => {
      if (isNaN(secs)) return '0:00';
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m}:${String(s).padStart(2, '0')}`;
    };

    if (this.timeCurrentEl) this.timeCurrentEl.textContent = format(currentTime);
    if (this.timeDurationEl) this.timeDurationEl.textContent = format(duration);
  }

  initAudioContext() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  showNeedlePrompt() {
    if (this.needlePromptEl && !this.isPlaying) {
      this.needlePromptEl.style.display = 'inline-flex';
    }
  }
}

export const audioEngine = new AudioEngine();
