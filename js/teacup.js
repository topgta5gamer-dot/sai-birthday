/**
 * js/teacup.js
 * The Steaming Porcelain Teacup & Patrick Jane Quote Engine.
 * Features: Tilts on click, non-repeating quotes, and cozy sleeping cat companion.
 */

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
    if (this.catToast) {
      this.catToast.textContent = '🐾 Purrrr... (Cat Approved)';
      this.catToast.classList.add('is-purring');
      setTimeout(() => {
        this.catToast.classList.remove('is-purring');
      }, 2000);
    }
    this.playPurrSound();
  }

  displayNextQuote(showCard = true) {
    if (!this.quotes || this.quotes.length === 0) return;

    let nextIndex;
    if (this.quotes.length === 1) {
      nextIndex = 0;
    } else {
      do {
        nextIndex = Math.floor(Math.random() * this.quotes.length);
      } while (nextIndex === this.lastQuoteIndex);
    }

    this.lastQuoteIndex = nextIndex;
    const item = this.quotes[nextIndex];

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

  playPurrSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, now);
      osc.frequency.setValueAtTime(110, now + 0.15);
      osc.frequency.setValueAtTime(75, now + 0.3);

      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }
}

export const teacup = new TeacupController();
