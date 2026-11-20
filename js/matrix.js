/**
 * js/matrix.js
 * Matrix Digital Rain, Synthesized Cyber Audio,
 * Keanu Reeves (Neo) Pill Choice Modal, and Theme Controller.
 */

import { storage, stateMachine, STATES } from './state.js';
import { audioEngine } from './audio.js';

class MatrixEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.drops = [];
    this.fontSize = 14;
    this.columns = 0;
    this.animId = null;
    this.isRunning = false;
    this.audioCtx = null;
    this.currentTheme = 'red-pill';
    this.matrixChars = '日ﾊﾐﾋｰｳｼﾅﾓﾆｻﾜﾂｵﾘｱﾎﾃﾏｹﾒｴｶｷﾑﾕﾗｾﾈｽﾀﾇﾍ0123456789ZIONSNEOMATRIXSAI';
  }

  init() {
    this.canvas = document.getElementById('matrix-rain-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }

    this.cacheElements();
    this.bindEvents();

    // Check stored choice
    const savedPill = storage.get('sai_pill_choice', null);
    if (savedPill) {
      this.applyTheme(savedPill, false);
    } else {
      // Default initial theme is red-pill (Mentalist)
      this.applyTheme('red-pill', false);
    }
  }

  cacheElements() {
    this.modal = document.getElementById('matrix-choice-modal');
    this.overlay = document.getElementById('matrix-transition-overlay');
    this.terminalBody = document.getElementById('matrix-terminal-body');
    this.btnRedPill = document.getElementById('btn-take-red-pill');
    this.btnBluePill = document.getElementById('btn-take-blue-pill');
    this.switcherContainer = document.getElementById('pill-switcher-container');
    this.switcherBtn = document.getElementById('pill-switch-btn');
    this.replayBtn = document.getElementById('pill-replay-choice-btn');
    
    // Dynamic text targets for mode switching
    this.badgeEl = document.querySelector('.case-badge');
    this.titleEl = document.querySelector('.title-display');
    this.subtitleEl = document.querySelector('.subtitle');
    this.teabagTag = document.querySelector('.teabag-tag');
    this.hudCounter = document.getElementById('cranes-hud-counter');
  }

  bindEvents() {
    if (this.btnRedPill) {
      this.btnRedPill.addEventListener('click', () => this.choosePill('red-pill'));
    }
    if (this.btnBluePill) {
      this.btnBluePill.addEventListener('click', () => this.choosePill('blue-pill'));
    }
    if (this.switcherBtn) {
      this.switcherBtn.addEventListener('click', () => {
        const nextTheme = this.currentTheme === 'red-pill' ? 'blue-pill' : 'red-pill';
        this.choosePill(nextTheme, false);
      });
    }
    if (this.replayBtn) {
      this.replayBtn.addEventListener('click', () => this.openNeoChoiceModal());
    }
  }

  // =========================================================================
  // Canvas Matrix Digital Rain
  // =========================================================================

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.columns = Math.floor(this.canvas.width / this.fontSize);
    this.drops = [];
    for (let i = 0; i < this.columns; i++) {
      this.drops[i] = Math.floor(Math.random() * -this.canvas.height / this.fontSize);
    }
  }

  startRain(highDensity = false) {
    if (!this.canvas || !this.ctx) return;
    if (this.animId) cancelAnimationFrame(this.animId);
    this.isRunning = true;

    const render = () => {
      if (!this.isRunning) return;

      // Dark translucent wash to create trailing green code fading effect
      this.ctx.fillStyle = highDensity ? 'rgba(2, 8, 4, 0.12)' : 'rgba(2, 8, 4, 0.08)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.font = `${this.fontSize}px monospace`;

      for (let i = 0; i < this.drops.length; i++) {
        const char = this.matrixChars[Math.floor(Math.random() * this.matrixChars.length)];
        const x = i * this.fontSize;
        const y = this.drops[i] * this.fontSize;

        // Leading char is bright white-green; tail is phosphorescent matrix green
        if (Math.random() > 0.85) {
          this.ctx.fillStyle = '#FFFFFF';
        } else {
          this.ctx.fillStyle = '#00FF66';
        }

        this.ctx.fillText(char, x, y);

        if (y > this.canvas.height && Math.random() > 0.975) {
          this.drops[i] = 0;
        }
        this.drops[i]++;
      }

      this.animId = requestAnimationFrame(render);
    };

    render();
  }

  stopRain() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
  }

  // =========================================================================
  // Web Audio Synthesizer (Zero external dependencies)
  // =========================================================================

  initAudio() {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.audioCtx = new AudioCtx();
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  playTerminalBleep() {
    this.initAudio();
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800 + Math.random() * 600, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.06);
    } catch (e) {}
  }

  playRedPillChime() {
    this.initAudio();
    if (!this.audioCtx) return;
    try {
      // Warm resonant chime + heart tone
      [261.63, 329.63, 392.00, 523.25].forEach((freq, idx) => {
        setTimeout(() => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.8);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.8);
        }, idx * 120);
      });
    } catch (e) {}
  }

  playBluePillCyberSweep() {
    this.initAudio();
    if (!this.audioCtx) return;
    try {
      // Futuristic cyber frequency sweep
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1600, this.audioCtx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.6);
    } catch (e) {}
  }

  playDejaVuGlitch() {
    this.initAudio();
    if (!this.audioCtx) return;
    try {
      for (let i = 0; i < 4; i++) {
        setTimeout(() => {
          const osc = this.audioCtx.createOscillator();
          const gain = this.audioCtx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(1200 - i * 200, this.audioCtx.currentTime);
          gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.05);
          osc.connect(gain);
          gain.connect(this.audioCtx.destination);
          osc.start();
          osc.stop(this.audioCtx.currentTime + 0.05);
        }, i * 40);
      }
    } catch (e) {}
  }

  // =========================================================================
  // Cinematic Transition Execution
  // =========================================================================

  triggerCinematicTransition(onComplete) {
    this.initAudio();
    if (this.overlay) {
      this.overlay.classList.add('is-active');
    }

    this.startRain(true);

    const lines = [
      'CALL TRANS OPT: RECEIVED.',
      'TRACE PROGRAM RUNNING: TARGET = SAI',
      'SYSTEM OVERRIDE DETECTED.',
      'WAKE UP, SAI...',
      'THE MATRIX HAS YOU.',
      'FOLLOW THE WHITE RABBIT.'
    ];

    let currentLine = 0;
    if (this.terminalBody) this.terminalBody.innerHTML = '';

    const typeNextLine = () => {
      if (currentLine >= lines.length) {
        // Transition to Neo Modal after terminal completes
        setTimeout(() => {
          if (this.overlay) this.overlay.classList.remove('is-active');
          this.openNeoChoiceModal(onComplete);
        }, 800);
        return;
      }

      const p = document.createElement('div');
      p.className = 'terminal-line';
      if (this.terminalBody) this.terminalBody.appendChild(p);

      let charIdx = 0;
      const text = lines[currentLine];

      const typeInterval = setInterval(() => {
        if (charIdx < text.length) {
          p.textContent += text[charIdx];
          if (Math.random() > 0.4) this.playTerminalBleep();
          charIdx++;
        } else {
          clearInterval(typeInterval);
          currentLine++;
          setTimeout(typeNextLine, 280);
        }
      }, 35);
    };

    typeNextLine();
  }

  openNeoChoiceModal(onComplete = null) {
    this.pendingCompletion = onComplete;
    if (this.modal) {
      this.modal.classList.add('is-open');
    }
  }

  closeNeoChoiceModal() {
    if (this.modal) {
      this.modal.classList.remove('is-open');
    }
  }

  choosePill(theme, playSound = true) {
    this.closeNeoChoiceModal();
    this.applyTheme(theme, true);
    storage.set('sai_pill_choice', theme);

    if (playSound) {
      if (theme === 'red-pill') {
        this.playRedPillChime();
      } else {
        this.playBluePillCyberSweep();
      }
    }

    if (this.pendingCompletion) {
      const cb = this.pendingCompletion;
      this.pendingCompletion = null;
      cb();
    }
  }

  // =========================================================================
  // Theme Application & Dynamic UI Adaptation
  // =========================================================================

  applyTheme(theme, animate = true) {
    this.currentTheme = theme;
    document.documentElement.dataset.theme = theme;

    // Show Pill Switcher in Header once a pill is chosen
    if (this.switcherContainer) {
      this.switcherContainer.style.display = 'flex';
    }

    if (theme === 'blue-pill') {
      // 🔵 BLUE PILL: THE MATRIX CONSTRUCT
      if (this.switcherBtn) {
        this.switcherBtn.className = 'pill-switch-btn is-blue';
        this.switcherBtn.innerHTML = `
          <span class="pill-dot"></span>
          <span>Matrix Construct (Blue Pill)</span>
          <span style="opacity: 0.7; font-size: 0.75rem;">⇄ Switch to 🔴 Reality</span>
        `;
      }

      if (this.badgeEl) this.badgeEl.textContent = 'NEBUCHADNEZZAR // SYSTEM CORE';
      if (this.titleEl) this.titleEl.textContent = 'The Matrix Construct // Sai.exe';
      if (this.subtitleEl) this.subtitleEl.textContent = '"There is no spoon... but there is jasmine tea."';
      if (this.teabagTag) this.teabagTag.textContent = "Operator's Brew";

      // Keep subtle matrix rain falling in the background of the construct
      this.startRain(false);

    } else {
      // 🔴 RED PILL: THE MENTALIST / CBI REALITY
      if (this.switcherBtn) {
        this.switcherBtn.className = 'pill-switch-btn is-red';
        this.switcherBtn.innerHTML = `
          <span class="pill-dot"></span>
          <span>CBI Reality (Red Pill)</span>
          <span style="opacity: 0.7; font-size: 0.75rem;">⇄ Switch to 🔵 Matrix</span>
        `;
      }

      if (this.badgeEl) this.badgeEl.textContent = 'CBI : Curly Baal waala Insaan';
      if (this.titleEl) this.titleEl.textContent = 'A Question of Time';
      if (this.subtitleEl) this.subtitleEl.textContent = '"There is no such thing as luck. Only discipline."';
      if (this.teabagTag) this.teabagTag.textContent = "Patrick's Tea";

      // In red-pill mode, stop background rain so warm candlelight & rose petals shine
      this.stopRain();
      if (this.ctx && this.canvas) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    }
  }

  isBluePill() {
    return this.currentTheme === 'blue-pill';
  }
}

export const matrixEngine = new MatrixEngine();
