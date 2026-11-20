/**
 * js/envelope.js
 * 3D Crimson Envelope & Handwritten Letter Streaming Engine.
 * Features: Wax seal cracking, flap fold open/close, letter sliding, skip option,
 * and reversible close/reopen capability.
 */
import { CONFIG } from './config.js';
import { storage } from './state.js';

class EnvelopeManager {
  constructor() {
    this.letterData = null;
    this.isOpen = false;
    this.audioCtx = null;
    this.isStreaming = false;
    this.skipStreaming = false;
  }

  async init() {
    this.assemblyEl = document.getElementById('envelope-assembly');
    this.sealEl = document.getElementById('wax-seal');
    this.sealPromptEl = document.getElementById('seal-prompt-badge');
    this.letterCardEl = document.getElementById('parchment-letter-card');
    this.letterBodyEl = document.getElementById('letter-content-body');
    this.skipBtn = document.getElementById('letter-skip-btn');
    this.closeBtn = document.getElementById('letter-close-btn');
    this.closeBottomBtn = document.getElementById('letter-close-bottom-btn');
    this.bonusEl = document.getElementById('letter-bonus-line');
    this.bonusTextEl = document.getElementById('bonus-line-text');
    this.sealInitialEl = document.getElementById('wax-seal-initial');

    if (this.sealInitialEl) {
      this.sealInitialEl.textContent = (CONFIG.initials && CONFIG.initials[0]) || 'S';
    }

    try {
      const res = await fetch('data/letter.json');
      this.letterData = await res.json();
    } catch (e) {
      console.warn('[Envelope] Could not load letter.json:', e);
      return;
    }

    const wasBroken = storage.get('mb_seal_broken', false);
    if (wasBroken) {
      this.openEnvelope(false);
    } else {
      this.bindInitialSealEvent();
    }

    // Bind Close Buttons (top bar and bottom action)
    const handleClose = () => this.closeEnvelope();
    if (this.closeBtn) this.closeBtn.addEventListener('click', handleClose);
    if (this.closeBottomBtn) this.closeBottomBtn.addEventListener('click', handleClose);

    // Bind Skip Button
    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', () => {
        this.skipStreaming = true;
        this.renderFullLetter();
      });
    }

    // Bind click on closed envelope to re-open
    if (this.assemblyEl) {
      this.assemblyEl.addEventListener('click', () => {
        if (!this.isOpen) {
          this.openEnvelope(true);
        }
      });
    }

    // Listen for 17 cranes unlocked
    window.addEventListener('all-cranes-unlocked', () => {
      this.checkBonusLine();
    });

    this.checkBonusLine();
  }

  bindInitialSealEvent() {
    if (!this.sealEl) return;
    this.sealEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openEnvelope(true);
    });
  }

  openEnvelope(withAnimation = true) {
    if (this.isOpen) return;
    this.isOpen = true;
    storage.set('mb_seal_broken', true);

    if (withAnimation) {
      this.playWaxCrackSound();
    }

    if (this.sealEl) this.sealEl.classList.add('is-cracked');
    if (this.sealPromptEl) this.sealPromptEl.style.display = 'none';

    setTimeout(() => {
      if (this.assemblyEl) this.assemblyEl.classList.add('is-open');

      setTimeout(() => {
        if (this.letterCardEl) {
          this.letterCardEl.classList.add('is-unfurled');
          if (withAnimation) {
            this.streamLetterContent();
          } else {
            this.renderFullLetter();
          }
        }
      }, withAnimation ? 450 : 50);
    }, withAnimation ? 300 : 50);
  }

  closeEnvelope() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.skipStreaming = true;

    this.playPaperFoldSound();

    // 1. Slide letter back up and hide
    if (this.letterCardEl) {
      this.letterCardEl.classList.remove('is-unfurled');
    }

    // 2. Fold envelope top flap back down
    setTimeout(() => {
      if (this.assemblyEl) {
        this.assemblyEl.classList.remove('is-open');
      }

      // 3. Show prompt badge to reopen
      if (this.sealPromptEl) {
        this.sealPromptEl.textContent = '✉ Click envelope to re-open letter';
        this.sealPromptEl.style.display = 'block';
      }
    }, 350);
  }

  async streamLetterContent() {
    if (!this.letterData || !this.letterBodyEl) return;
    this.isStreaming = true;
    this.skipStreaming = false;
    this.letterBodyEl.innerHTML = '';

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // 1. Salutation (only if specified)
    if (this.letterData.salutation && this.letterData.salutation.trim()) {
      const salutationDiv = document.createElement('div');
      salutationDiv.className = 'letter-salutation';
      this.letterBodyEl.appendChild(salutationDiv);
      await this.typeString(this.letterData.salutation, salutationDiv, sleep);
      if (this.skipStreaming) return;
      await sleep(350);
    }

    // 2. Paragraphs
    for (const para of (this.letterData.paragraphs || [])) {
      if (this.skipStreaming) break;
      const p = document.createElement('p');
      p.className = 'letter-paragraph';
      this.letterBodyEl.appendChild(p);
      await this.typeString(para, p, sleep);
      await sleep(450);
    }

    if (this.skipStreaming) return;

    // 3. Valediction & Signature (only if specified)
    const hasValediction = Boolean(this.letterData.valediction && this.letterData.valediction.trim());
    const hasSignature = Boolean(this.letterData.signature && this.letterData.signature.trim());
    if (hasValediction || hasSignature) {
      const signoffDiv = document.createElement('div');
      signoffDiv.className = 'letter-signoff';
      signoffDiv.innerHTML = `
        ${hasValediction ? `<div class="letter-valediction">${this.letterData.valediction}</div>` : ''}
        ${hasSignature ? `<div class="letter-signature">${this.letterData.signature}</div>` : ''}
      `;
      this.letterBodyEl.appendChild(signoffDiv);
    }

    this.isStreaming = false;
    if (this.skipBtn) this.skipBtn.style.display = 'none';

    this.checkBonusLine();
  }

  async typeString(text, element, sleep) {
    for (let i = 0; i < text.length; i++) {
      if (this.skipStreaming) return;
      const char = text[i];
      element.textContent += char;

      if (char === ',' || char === ';') {
        await sleep(200);
      } else if (char === '.' || char === '!' || char === '?') {
        await sleep(400);
      } else {
        await sleep(22 + Math.random() * 18);
      }
    }
  }

  renderFullLetter() {
    if (!this.letterData || !this.letterBodyEl) return;
    this.isStreaming = false;

    let html = '';
    if (this.letterData.salutation && this.letterData.salutation.trim()) {
      html += `<div class="letter-salutation">${this.letterData.salutation}</div>`;
    }

    (this.letterData.paragraphs || []).forEach((p) => {
      html += `<p class="letter-paragraph">${p}</p>`;
    });

    const hasValediction = Boolean(this.letterData.valediction && this.letterData.valediction.trim());
    const hasSignature = Boolean(this.letterData.signature && this.letterData.signature.trim());
    if (hasValediction || hasSignature) {
      html += `
        <div class="letter-signoff">
          ${hasValediction ? `<div class="letter-valediction">${this.letterData.valediction}</div>` : ''}
          ${hasSignature ? `<div class="letter-signature">${this.letterData.signature}</div>` : ''}
        </div>
      `;
    }

    this.letterBodyEl.innerHTML = html;
    if (this.skipBtn) this.skipBtn.style.display = 'none';
    this.checkBonusLine();
  }

  checkBonusLine() {
    const foundCranes = storage.get('mb_cranes_found', []);
    if (foundCranes.length === 17 && this.bonusEl && this.letterData) {
      if (this.bonusTextEl) {
        this.bonusTextEl.textContent = this.letterData.bonusLine || '[Bonus line unlocked!]';
      }
      this.bonusEl.classList.add('is-unlocked');
    }
  }

  playWaxCrackSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;

      // Crack pop
      const crackOsc = this.audioCtx.createOscillator();
      const crackGain = this.audioCtx.createGain();
      crackOsc.type = 'triangle';
      crackOsc.frequency.setValueAtTime(3200, now);
      crackOsc.frequency.exponentialRampToValueAtTime(400, now + 0.08);
      crackGain.gain.setValueAtTime(0.12, now);
      crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      crackOsc.connect(crackGain);
      crackGain.connect(this.audioCtx.destination);
      crackOsc.start(now);
      crackOsc.stop(now + 0.09);

      // Low paper thud
      const thudOsc = this.audioCtx.createOscillator();
      const thudGain = this.audioCtx.createGain();
      thudOsc.type = 'sine';
      thudOsc.frequency.setValueAtTime(140, now + 0.04);
      thudOsc.frequency.exponentialRampToValueAtTime(40, now + 0.35);
      thudGain.gain.setValueAtTime(0.15, now + 0.04);
      thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      thudOsc.connect(thudGain);
      thudGain.connect(this.audioCtx.destination);
      thudOsc.start(now + 0.04);
      thudOsc.stop(now + 0.35);
    } catch (e) {}
  }

  playPaperFoldSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.22);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }
}

export const envelopeManager = new EnvelopeManager();
