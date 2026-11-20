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
    this.petCount = (this.petCount || 0) + 1;
    this.playCatVoice();

    // Subtle tactile haptic response on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([35, 50, 35]); } catch (e) {}
    }

    const isStretch = (this.petCount % 3 === 0);

    if (this.catToast) {
      const meowMessages = [
        '🐱 "Meow! 💖" (Sai\'s Favorite)',
        '🐾 *purrrrrr...* Mew!',
        '🐱 "Mrrrp? 🐾 *happy purrs*"',
        '🐾 *soft kitten chirp* 💖',
        '🐱 "Mew! *demands head scratches*"'
      ];
      const stretchMessages = [
        '💖 *stretches sleepily & purrs* "Sai is my favorite human!"',
        '🐾 *big sleepy yawn & stretches front paws* ✨',
        '🐱 *rolls over happily into your hand* 💖'
      ];
      const randomMsg = isStretch
        ? stretchMessages[Math.floor(Math.random() * stretchMessages.length)]
        : meowMessages[Math.floor(Math.random() * meowMessages.length)];

      this.catToast.textContent = randomMsg;
      this.catToast.classList.add('is-purring');
      setTimeout(() => {
        this.catToast.classList.remove('is-purring');
      }, 2600);
    }

    if (this.catEl) {
      this.catEl.classList.remove('cat-bounce', 'cat-stretching');
      void this.catEl.offsetWidth;
      this.catEl.classList.add(isStretch ? 'cat-stretching' : 'cat-bounce');
    }
  }

  displayNextQuote(showCard = true) {
    if (!this.quotes || this.quotes.length === 0) return;

    let nextIndex;
    this.sipCounter = (this.sipCounter || 0) + 1;

    // Alternate every second sip with Patrick Jane's curated Birthday Tea Blends
    if (this.sipCounter % 2 === 0) {
      const blends = [
        {
          text: "Today's Blend: Himalayan Golden Tips with Bergamot & Wild Honey. Note: Best consumed while unraveling someone's secrets.",
          source: "Patrick Jane's Tea Pairing"
        },
        {
          text: "Today's Blend: Vintage Lapsang Souchong with Dried Jasmine. Note: Strictly never stir clockwise on a birthday.",
          source: "CBI Kitchen Records"
        },
        {
          text: "Today's Blend: Kashmiri Kahwa with crushed saffron & green cardamom. Note: Luxurious, celebratory, and fits Sai perfectly.",
          source: "Patrick Jane's Private Reserve"
        },
        {
          text: "Today's Blend: First Flush Darjeeling with fresh garden mint sprigs. Note: Razor-sharp and calming for turning another year wiser.",
          source: "Patrick Jane • Field Notes"
        }
      ];
      const selected = blends[Math.floor(Math.random() * blends.length)];
      if (this.textEl) this.textEl.textContent = `"${selected.text}"`;
      if (this.sourceEl) this.sourceEl.textContent = `— ${selected.source}`;
    } else {
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
    }

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
    try {
      const clips = [
        'assets/audio/cat-meow.wav',
        'assets/audio/cat-chirp.wav',
        'assets/audio/meow.ogg'
      ];
      const selectedClip = clips[Math.floor(Math.random() * clips.length)];
      const audio = new Audio(selectedClip);
      audio.volume = 0.85;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          this.synthesizeCuteMeow();
        });
      }
    } catch (e) {
      this.synthesizeCuteMeow();
    }
  }

  synthesizeCuteMeow() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const osc2 = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      // Realistic kitten pitch sweep: 460Hz -> 920Hz peak -> 440Hz gentle release
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(460, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.22);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.65);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(465, now);
      osc2.frequency.exponentialRampToValueAtTime(925, now + 0.22);
      osc2.frequency.exponentialRampToValueAtTime(445, now + 0.65);

      // Kitten vocal tract resonance filter
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1700, now);
      filter.Q.setValueAtTime(2.0, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.08);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.45);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.68);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc2.start(now);
      osc.stop(now + 0.70);
      osc2.stop(now + 0.70);
    } catch (e) {}
  }
}

export const teacup = new TeacupController();
