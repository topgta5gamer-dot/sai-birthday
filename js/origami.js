/**
 * js/origami.js
 * 17 Drifting Origami Cranes & Micro-Compliments.
 * Section 6: Discovers compliments on hover/tap, tracks found counter, unlocks bonus letter line.
 */
import { storage } from './state.js';

class OrigamiManager {
  constructor() {
    this.compliments = [];
    this.foundIds = new Set(storage.get('mb_cranes_found', []));
    this.audioCtx = null;
    this.container = null;
    this.hudEl = null;
  }

  async init() {
    this.container = document.getElementById('cranes-sky');
    this.hudEl = document.getElementById('cranes-hud-counter');

    if (!this.container) return;

    try {
      const res = await fetch('data/compliments.json');
      this.compliments = await res.json();

      this.renderCranes();
      this.updateHud();
    } catch (err) {
      console.warn('[Origami] Failed to load compliments.json:', err);
    }
  }

  renderCranes() {
    if (!this.container) return;
    this.container.innerHTML = '';

    // 17 predefined artistic coordinates [x%, y%] scattered organically around perimeter
    const coordinates = [
      [8, 14],  [92, 12], [6, 32],  [94, 28],
      [12, 48], [88, 46], [5, 65],  [93, 62],
      [14, 78], [86, 76], [22, 83], [78, 83],
      [36, 84], [64, 84], [18, 22], [82, 24],
      [50, 85]
    ];

    this.compliments.forEach((item, idx) => {
      const [leftPercent, topPercent] = coordinates[idx % coordinates.length];
      const isFound = this.foundIds.has(item.id);

      const capsule = document.createElement('div');
      capsule.className = `origami-crane-capsule ${isFound ? 'is-found' : ''}`;
      capsule.id = `crane-item-${item.id}`;
      capsule.style.left = `${leftPercent}%`;
      capsule.style.top = `${topPercent}%`;

      // Subtle float animation delay & drift
      const animDelay = (idx * 0.4).toFixed(1);
      const floatDuration = (4.5 + (idx % 3)).toFixed(1);
      capsule.style.animation = `craneFloat ${floatDuration}s ease-in-out ${animDelay}s infinite alternate`;

      const alignClass = leftPercent < 22 ? 'align-left' : (leftPercent > 78 ? 'align-right' : '');

      capsule.innerHTML = `
        <svg class="origami-heart-svg" viewBox="0 0 64 58" aria-label="Secret Heart ${item.id}">
          <defs>
            <linearGradient id="heartGrad-${item.id}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FF4D6D" />
              <stop offset="35%" stop-color="#C9184A" />
              <stop offset="70%" stop-color="#9B111E" />
              <stop offset="100%" stop-color="#590D14" />
            </linearGradient>
            <linearGradient id="heartShine-${item.id}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#FFF" stop-opacity="0.65" />
              <stop offset="100%" stop-color="#FFF" stop-opacity="0.0" />
            </linearGradient>
          </defs>
          <!-- Main Heart Shell with Gold Foil Trim -->
          <path class="heart-body" d="M 32,54 C 32,54 6,36 6,18 C 6,7 15,2 25,6 C 28,7 30,10 32,13 C 34,10 36,7 39,6 C 49,2 58,7 58,18 C 58,36 32,54 32,54 Z"
                fill="url(#heartGrad-${item.id})" stroke="#D4AF37" stroke-width="1.3" />
          <!-- Left Origami Light Facet -->
          <path class="heart-facet-light" d="M 32,13 L 32,53 C 32,53 6,35 6,18 C 6,9 13,4 21,5 C 26,6 29,9 32,13 Z"
                fill="#FF758F" opacity="0.38" />
          <!-- Right Origami Dark Facet -->
          <path class="heart-facet-dark" d="M 32,13 L 32,53 C 32,53 58,35 58,18 C 58,9 51,4 43,5 C 38,6 35,9 32,13 Z"
                fill="#4A050C" opacity="0.45" />
          <!-- Gloss Reflection -->
          <ellipse cx="20" cy="14" rx="7" ry="3.5" transform="rotate(-30 20 14)" fill="url(#heartShine-${item.id})" />
          <!-- Golden Center Crease -->
          <line x1="32" y1="13" x2="32" y2="53" stroke="#FFE3A8" stroke-width="1.2" stroke-linecap="round" opacity="0.85" />
        </svg>

        <div class="crane-compliment-tag ${alignClass}">
          <span class="crane-tag-num">💖 Secret Heart ${item.id} of 17</span>
          <span class="crane-tag-text">${item.text}</span>
        </div>
      `;

      // Click / Tap Handler
      capsule.addEventListener('click', (e) => {
        e.stopPropagation();
        this.discoverCrane(item.id, capsule);
      });

      this.container.appendChild(capsule);
    });

    // Add keyframe style dynamically if not already injected
    if (!document.getElementById('crane-float-style')) {
      const style = document.createElement('style');
      style.id = 'crane-float-style';
      style.textContent = `
        @keyframes craneFloat {
          0% { transform: translate(0, 0) rotate(-4deg); }
          50% { transform: translate(4px, -8px) rotate(2deg); }
          100% { transform: translate(-3px, -15px) rotate(-3deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  discoverCrane(id, capsuleEl) {
    if (!this.foundIds.has(id)) {
      this.foundIds.add(id);
      storage.set('mb_cranes_found', Array.from(this.foundIds));
      capsuleEl.classList.add('is-found');
      this.playRustleSound();
      this.updateHud();

      // Check if all 17 found
      if (this.foundIds.size === 17) {
        window.dispatchEvent(new CustomEvent('all-cranes-unlocked'));
      }
    }

    capsuleEl.classList.toggle('is-active');
  }

  updateHud() {
    if (!this.hudEl) return;
    const count = this.foundIds.size;
    this.hudEl.innerHTML = `<span>💖</span> <span>${count} / 17 Hearts Discovered</span>`;

    if (count === 17) {
      this.hudEl.classList.add('all-found');
      this.hudEl.innerHTML = `<span>💖</span> <span>All 17 Hearts Discovered! Secret Unlocked</span>`;
    }
  }

  playRustleSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      // Soft paper rustle / gentle harp ping
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, this.audioCtx.currentTime); // E5
      osc.frequency.exponentialRampToValueAtTime(1318.51, this.audioCtx.currentTime + 0.18); // E6

      gain.gain.setValueAtTime(0.05, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.audioCtx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.22);
    } catch (e) {}
  }
}

export const origami = new OrigamiManager();
