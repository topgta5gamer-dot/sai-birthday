/**
 * js/teacup.js
 * The Steaming Porcelain Teacup & Patrick Jane / Matrix Quote Engine.
 * Features: Tilts on click, non-repeating quotes, and cozy sleeping cat companion.
 */

import { matrixEngine } from './matrix.js';

class TeacupController {
  constructor() {
    this.quotes = [];
    this.lastQuoteIndex = -1;
    this.isLoaded = false;
    this.audioCtx = null;
  }

  async init() {
    this.cupEl = document.getElementById('teacup-interactive');
    this.cardEl = document.getElementById('teacup-quote-card');
    this.textEl = document.getElementById('quote-card-text');
    this.sourceEl = document.getElementById('quote-card-source');
    this.catEl = document.getElementById('cozy-cat-companion');
    this.catToast = document.getElementById('cat-purr-toast');

    if (!this.cupEl) return;

    try {
      const res = await fetch('data/quotes.json');
      this.quotes = await res.json();
      this.isLoaded = true;

      this.displayNextQuote(false);

      this.cupEl.addEventListener('click', () => {
        this.takeSip();
      });

      if (this.catEl) {
        this.catEl.addEventListener('click', () => {
          this.petCat();
        });
      }

      if (this.cardEl) {
        this.cardEl.addEventListener('click', (e) => {
          e.stopPropagation();
          this.cardEl.classList.remove('is-visible');
        });
      }

      document.addEventListener('click', (e) => {
        if (!this.cupEl.contains(e.target) && !this.cardEl.contains(e.target)) {
          this.cardEl.classList.remove('is-visible');
        }
      });
    } catch (err) {
      console.warn('[Teacup] Failed to load quotes.json:', err);
    }
  }

  takeSip() {
    if (!this.cupEl || !this.isLoaded) return;

    this.cupEl.classList.remove('is-sipping');
    void this.cupEl.offsetWidth;
    this.cupEl.classList.add('is-sipping');

    this.playPorcelainClink();
    this.displayNextQuote(true);
  }

  petCat() {
    const isBlue = matrixEngine && matrixEngine.isBluePill();

    if (isBlue) {
      matrixEngine.playDejaVuGlitch();
      this.playCatVoice();

      if (this.catToast) {
        const dejaVuMessages = [
          '🐱 "Glitch in the Matrix! Déjà vu detected!" ⚡',
          '🐾 *Did a black cat just walk past twice?!* 🟢',
          '🐱 "System Anomaly: Sai\'s favorite kitten online."',
          '🐾 *Meow!* "There is no spoon, only treats." 💖',
          '🐱 "Operator: Matrix meow confirmed!"'
        ];
        const randomMsg = dejaVuMessages[Math.floor(Math.random() * dejaVuMessages.length)];
        this.catToast.textContent = randomMsg;
        this.catToast.classList.add('is-purring');
        setTimeout(() => {
          this.catToast.classList.remove('is-purring');
        }, 2800);
      }
    } else {
      this.playCatVoice();

      if (this.catToast) {
        const meowMessages = [
          '🐱 "Meow! 💖" (Sai\'s Favorite)',
          '🐾 *purrrrrr...* Mew!',
          '🐱 "Mrrrp? 🐾 *happy purrs*"',
          '🐾 *soft kitten meow* 💖',
          '🐱 "Mew! *demands head scratches*"'
        ];
        const randomMsg = meowMessages[Math.floor(Math.random() * meowMessages.length)];
        this.catToast.textContent = randomMsg;
        this.catToast.classList.add('is-purring');
        setTimeout(() => {
          this.catToast.classList.remove('is-purring');
        }, 2500);
      }
    }

    if (this.catEl) {
      this.catEl.classList.remove('cat-bounce');
      void this.catEl.offsetWidth;
      this.catEl.classList.add('cat-bounce');
    }
  }

  displayNextQuote(showCard = true) {
    if (!this.quotes || this.quotes.length === 0) return;

    const isBlue = matrixEngine && matrixEngine.isBluePill();
    const currentTheme = isBlue ? 'blue-pill' : 'red-pill';

    // Filter quotes relevant to current theme if available
    let pool = this.quotes.filter(q => !q.theme || q.theme === currentTheme);
    if (pool.length === 0) pool = this.quotes;

    let nextIndex;
    if (pool.length === 1) {
      nextIndex = 0;
    } else {
      do {
        nextIndex = Math.floor(Math.random() * pool.length);
      } while (nextIndex === this.lastQuoteIndex && pool.length > 1);
    }

    this.lastQuoteIndex = nextIndex;
    const item = pool[nextIndex];

    if (this.textEl) this.textEl.textContent = `"${item.text}"`;
    if (this.sourceEl) this.sourceEl.textContent = `— ${item.source || 'Patrick Jane'}`;

    if (this.cardEl && showCard) {
      this.cardEl.classList.add('is-visible');
    }
  }

  playPorcelainClink() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2400, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1800, this.audioCtx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.15);
    } catch (e) {}
  }

  playCatVoice() {
    const audioFiles = [
      'assets/audio/cat-meow.wav',
      'assets/audio/cat-chirp.wav',
      'assets/audio/meow.ogg'
    ];
    const chosenFile = audioFiles[Math.floor(Math.random() * audioFiles.length)];

    const audio = new Audio(chosenFile);
    audio.volume = 0.85;

    audio.play().catch(() => {
      this.synthesizeCuteMeow();
    });
  }

  synthesizeCuteMeow() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.18);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.45);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.2, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.25);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch (e) {}
  }
}

export const teacup = new TeacupController();
