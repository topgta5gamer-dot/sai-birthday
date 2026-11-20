/**
 * js/mindreader.js
 * Patrick Jane's Mind-Reading Game & Finale Gift Riddle.
 * Section 7.6 & 7.7: 3 cards, deductive deductions, sealed prediction match, and gift riddle.
 */
import { storage } from './state.js';

class MindReaderGame {
  constructor() {
    this.gameData = null;
    this.pickedCardId = storage.get('mb_card_picked', null);
    this.audioCtx = null;
  }

  async init() {
    this.cardsContainer = document.getElementById('cards-trio-grid');
    this.predictionNoteEl = document.getElementById('prediction-folded-note');
    this.predictionRevealCard = document.getElementById('prediction-reveal-card');
    this.predictionTextEl = document.getElementById('prediction-reveal-text');
    this.riddleBtn = document.getElementById('riddle-unlock-btn');
    this.riddleScrollBox = document.getElementById('riddle-scroll-box');
    this.riddleTextEl = document.getElementById('finale-riddle-text');

    try {
      const res = await fetch('data/game.json');
      this.gameData = await res.json();

      this.renderCards();
      this.setupPredictionNote();
      this.setupRiddle();
      this.setupPulseReader();
    } catch (e) {
      console.warn('[MindReader] Error loading game.json:', e);
    }
  }

  renderCards() {
    if (!this.cardsContainer || !this.gameData || !this.gameData.cards) return;
    this.cardsContainer.innerHTML = '';

    this.gameData.cards.forEach((card) => {
      const cardItem = document.createElement('div');
      cardItem.className = `mind-card-item ${this.pickedCardId === card.id ? 'is-flipped' : ''}`;
      cardItem.id = `mind-card-${card.id}`;

      cardItem.innerHTML = `
        <div class="mind-card-inner">
          <!-- Back (Face down) -->
          <div class="mind-card-back">
            <div class="card-pattern-overlay"></div>
            <div class="card-back-icon">⚜</div>
            <div class="card-back-text">CBI Mystery</div>
          </div>
          <!-- Front (Face up) -->
          <div class="mind-card-front">
            <div class="card-symbol">${card.symbol}</div>
            <div class="card-name">${card.name}</div>
            <p class="card-deduction">${card.deduction}</p>
          </div>
        </div>
      `;

      cardItem.addEventListener('click', () => {
        this.selectCard(card.id, cardItem);
      });

      this.cardsContainer.appendChild(cardItem);
    });

    if (this.pickedCardId) {
      this.unlockPredictionNote();
    }
  }

  selectCard(cardId, cardEl) {
    this.pickedCardId = cardId;
    storage.set('mb_card_picked', cardId);

    // Unflip others, flip selected
    const allCards = this.cardsContainer.querySelectorAll('.mind-card-item');
    allCards.forEach((c) => c.classList.remove('is-flipped'));
    cardEl.classList.add('is-flipped');

    this.playCardSwooshSound();
    this.unlockPredictionNote();
  }

  setupPredictionNote() {
    if (!this.predictionNoteEl) return;

    this.predictionNoteEl.addEventListener('click', () => {
      if (!this.pickedCardId) {
        alert("Patrick Jane whispers: 'Pick one of the three cards first. Then we shall open the prediction.'");
        return;
      }

      this.togglePredictionReveal();
    });
  }

  unlockPredictionNote() {
    if (!this.predictionNoteEl) return;
    this.predictionNoteEl.classList.remove('is-locked');
    this.predictionNoteEl.classList.add('is-unlocked');
  }

  togglePredictionReveal() {
    if (!this.predictionRevealCard || !this.gameData) return;

    const isVisible = this.predictionRevealCard.classList.contains('is-visible');
    if (!isVisible) {
      const card = (this.gameData.cards || []).find((c) => c.id === this.pickedCardId);
      const cardName = card ? card.name : 'your choice';

      if (this.predictionTextEl) {
        this.predictionTextEl.textContent = `"${this.gameData.sealedPrediction || "I knew you'd choose this card. Because you are, and always will be, wonderfully you."}" (Predicted: ${cardName})`;
      }

      this.predictionRevealCard.classList.add('is-visible');
      this.playChimeSound();
    } else {
      this.predictionRevealCard.classList.remove('is-visible');
    }
  }

  setupRiddle() {
    if (!this.riddleBtn || !this.riddleScrollBox || !this.gameData) return;

    if (this.riddleTextEl) {
      this.riddleTextEl.textContent = this.gameData.finaleRiddle || 'Patrick Jane leaves one final case clue: Happy Birthday, Sai!';
    }

    this.riddleBtn.addEventListener('click', () => {
      const isUnveiled = this.riddleScrollBox.classList.contains('is-unveiled');
      this.riddleScrollBox.classList.toggle('is-unveiled', !isUnveiled);
      this.riddleBtn.textContent = isUnveiled ? '🔍 Read Final Clue' : 'Fold Clue';
      this.playCardSwooshSound();
    });
  }

  setupPulseReader() {
    this.pulsePad = document.getElementById('pulse-pad-card');
    this.pulseInstruction = document.getElementById('pulse-instruction');
    this.pulseVerdictBox = document.getElementById('pulse-verdict-box');
    this.pulseVerdictQuote = document.getElementById('pulse-verdict-quote');
    this.pulseInterval = null;
    this.pulseHeld = false;

    if (!this.pulsePad) return;

    const startPulse = (e) => {
      if (this.pulseHeld) return;
      this.pulseHeld = true;
      this.pulsePad.classList.add('is-scanning');
      if (this.pulseInstruction) this.pulseInstruction.textContent = 'Reading pulse... hold still (3s)...';

      this.playHeartbeatThump();

      let beats = 0;
      this.pulseInterval = setInterval(() => {
        beats++;
        this.playHeartbeatThump();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(40); } catch(e) {}
        }
        if (beats >= 3) {
          clearInterval(this.pulseInterval);
          this.completePulseReading();
        }
      }, 750);
    };

    const cancelPulse = () => {
      if (!this.pulseHeld) return;
      this.pulseHeld = false;
      if (this.pulseInterval) clearInterval(this.pulseInterval);
      this.pulsePad.classList.remove('is-scanning');
      if (this.pulseInstruction && !this.pulsePad.classList.contains('is-verified')) {
        this.pulseInstruction.textContent = 'Press & hold thumb to test your pulse...';
      }
    };

    this.pulsePad.addEventListener('mousedown', startPulse);
    this.pulsePad.addEventListener('touchstart', startPulse, { passive: true });
    this.pulsePad.addEventListener('mouseup', cancelPulse);
    this.pulsePad.addEventListener('mouseleave', cancelPulse);
    this.pulsePad.addEventListener('touchend', cancelPulse);
  }

  completePulseReading() {
    this.pulseHeld = false;
    this.pulsePad.classList.remove('is-scanning');
    this.pulsePad.classList.add('is-verified');
    if (this.pulseInstruction) this.pulseInstruction.textContent = 'Biometric scan complete ✓';
    this.playChimeSound();

    const deductions = [
      "Resting pulse: Steady. Pupil dilation: Slight smirk. My deduction: You pretend you don't like fuss, but you're secretly smiling right now. Happy Birthday, Sai.",
      "Pulse spike at 0.8 seconds. Observation: Classic tells of someone who is fiercely loyal to their people, makes brilliant tea, and deserves the happiest year ahead.",
      "Micro-tremor detected: You're trying to figure out how this trick works. Stop overanalyzing, Sai. Enjoy your day — case closed.",
      "Biometrics confirmed: Curly Baal waala Insaan clearance level 10. You bring calm to chaos and warmth into every room. Happy Birthday, Sai."
    ];
    const picked = deductions[Math.floor(Math.random() * deductions.length)];

    if (this.pulseVerdictQuote) this.pulseVerdictQuote.textContent = `"${picked}"`;
    if (this.pulseVerdictBox) this.pulseVerdictBox.classList.add('is-visible');
  }

  playHeartbeatThump() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      // Lub
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(85, now);
      osc1.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain1.gain.setValueAtTime(0.14, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.12);

      // Dub
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(75, now + 0.18);
      osc2.frequency.exponentialRampToValueAtTime(40, now + 0.32);
      gain2.gain.setValueAtTime(0.16, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.32);
    } catch(e) {}
  }

  playCardSwooshSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.06, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.18);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.18);
    } catch (e) {}
  }

  playChimeSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, this.audioCtx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.4);
    } catch (e) {}
  }
}

export const mindReader = new MindReaderGame();
