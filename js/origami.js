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

      // Dismiss open compliment popups when clicking outside
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.origami-crane-capsule')) {
          document.querySelectorAll('.origami-crane-capsule.is-active').forEach(el => {
            el.classList.remove('is-active');
          });
        }
      });
    } catch (err) {
      console.warn('[Origami] Failed to load compliments.json:', err);
    }
  }

  renderCranes() {
    if (!this.container) return;
    this.container.innerHTML = '';

    // 17 predefined artistic coordinates [x%, y%] scattered organically around perimeter
    const coordinates = [
      [6, 12],  [94, 10], [10, 24], [90, 22],
      [5, 36],  [95, 34], [8, 48],  [92, 46],
      [5, 58],  [94, 56], [7, 68],  [93, 66],
      [5, 78],  [95, 78], [6, 88],  [94, 88],
      [50, 96]
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
      this.triggerSparklerCelebration();
    }
  }

  triggerSparklerCelebration() {
    if (this.sparklersDone) return;
    this.sparklersDone = true;

    try {
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.inset = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '300';
      document.body.appendChild(canvas);

      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const sparks = [];
      const colors = ['#D4AF37', '#F5D77F', '#FFF2CC', '#E63946', '#FF8095'];
      const originX = Math.min(window.innerWidth - 80, window.innerWidth * 0.85);
      const originY = 55;

      for (let i = 0; i < 48; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6.5 + 2.5;
        sparks.push({
          x: originX,
          y: originY,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: Math.random() * 3.5 + 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          life: 1.0,
          decay: Math.random() * 0.02 + 0.012
        });
      }

      const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        sparks.forEach((s) => {
          if (s.life > 0) {
            alive = true;
            s.x += s.vx;
            s.y += s.vy;
            s.vy += 0.08;
            s.life -= s.decay;

            ctx.save();
            ctx.globalAlpha = Math.max(0, s.life);
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        });

        if (alive) {
          requestAnimationFrame(animate);
        } else {
          canvas.remove();
        }
      };
      requestAnimationFrame(animate);
    } catch(e) {}
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
