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
    this.ambientBtn = document.getElementById('vinyl-ambient-btn');
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

    if (this.ambientBtn) {
      this.ambientBtn.addEventListener('click', () => {
        this.toggleAmbientRain();
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

  toggleAmbientRain() {
    this.initAudioContext();
    if (!this.audioCtx) return;

    if (this.isAmbientPlaying) {
      this.stopAmbientRain();
    } else {
      this.startAmbientRain();
    }
  }

  startAmbientRain() {
    if (this.isAmbientPlaying || !this.audioCtx) return;
    this.isAmbientPlaying = true;
    const now = this.audioCtx.currentTime;

    try {
      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const rainFilter = this.audioCtx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.setValueAtTime(1100, now);

      const rainGain = this.audioCtx.createGain();
      rainGain.gain.setValueAtTime(0.001, now);
      rainGain.gain.linearRampToValueAtTime(0.08, now + 1.2);

      whiteNoise.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(this.audioCtx.destination);
      whiteNoise.start(now);

      const crackleBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const crackleOut = crackleBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        if (Math.random() < 0.0022) {
          crackleOut[i] = (Math.random() * 2 - 1) * 0.85;
        } else {
          crackleOut[i] = 0;
        }
      }

      const crackleSource = this.audioCtx.createBufferSource();
      crackleSource.buffer = crackleBuffer;
      crackleSource.loop = true;

      const crackleFilter = this.audioCtx.createBiquadFilter();
      crackleFilter.type = 'highpass';
      crackleFilter.frequency.setValueAtTime(1700, now);

      const crackleGain = this.audioCtx.createGain();
      crackleGain.gain.setValueAtTime(0.001, now);
      crackleGain.gain.linearRampToValueAtTime(0.11, now + 1.2);

      crackleSource.connect(crackleFilter);
      crackleFilter.connect(crackleGain);
      crackleGain.connect(this.audioCtx.destination);
      crackleSource.start(now);

      this.ambientNodes = { whiteNoise, rainGain, crackleSource, crackleGain };

      if (this.ambientBtn) {
        this.ambientBtn.classList.add('is-active');
        this.ambientBtn.innerHTML = '<span>🌧 Rain: On</span>';
      }
    } catch (e) {
      console.warn('[Audio] Ambient synthesis error:', e);
    }
  }

  stopAmbientRain() {
    if (!this.isAmbientPlaying || !this.ambientNodes) return;
    this.isAmbientPlaying = false;
    const now = this.audioCtx.currentTime;

    try {
      this.ambientNodes.rainGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      this.ambientNodes.crackleGain.gain.linearRampToValueAtTime(0.0001, now + 0.6);
      setTimeout(() => {
        if (this.ambientNodes) {
          try { this.ambientNodes.whiteNoise.stop(); } catch(e){}
          try { this.ambientNodes.crackleSource.stop(); } catch(e){}
          this.ambientNodes = null;
        }
      }, 700);
    } catch(e) {
      this.ambientNodes = null;
    }

    if (this.ambientBtn) {
      this.ambientBtn.classList.remove('is-active');
      this.ambientBtn.innerHTML = '<span>🌧 Rain: Off</span>';
    }
  }

  showNeedlePrompt() {
    if (this.needlePromptEl && !this.isPlaying) {
      this.needlePromptEl.style.display = 'inline-flex';
    }
  }
}

export const audioEngine = new AudioEngine();
