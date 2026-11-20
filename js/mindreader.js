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
