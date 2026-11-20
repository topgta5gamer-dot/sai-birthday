/**
 * js/palace.js
 * Patrick Jane's Memory Palace & Witness Deposition Board.
 * Section 7.4 & 7.5: Hallway of doors, corkboard of polaroids with red pushpins, 3D flip notes,
 * and signed witness statements.
 */
import { CONFIG } from './config.js';

class MemoryPalaceManager {
  constructor() {
    this.palaceData = [];
    this.activeDoorId = null;
    this.audioCtx = null;
  }

  async init() {
    this.doorsContainer = document.getElementById('doors-hallway');
    this.corkboardContainer = document.getElementById('corkboard-grid') || document.getElementById('corkboard-room');
    this.palaceCaseTag = document.getElementById('corkboard-case-tag');

    if (this.palaceCaseTag) {
      this.palaceCaseTag.textContent = `Case File: ${CONFIG.recipientName || 'Sai'}`;
    }

    try {
      const palaceRes = await fetch('data/palace.json');
      this.palaceData = await palaceRes.json();
      this.renderDoors();
    } catch (e) {
      console.warn('[Memory Palace] Error loading data:', e);
    }
  }

  renderDoors() {
    if (!this.doorsContainer || this.palaceData.length === 0) return;
    this.doorsContainer.innerHTML = '';

    this.palaceData.forEach((room, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `door-tab-btn ${idx === 0 ? 'is-active' : ''}`;
      btn.innerHTML = `<span class="door-icon">🚪</span> <span>${room.title}</span>`;

      btn.addEventListener('click', () => {
        this.selectRoom(room.doorId);
      });

      this.doorsContainer.appendChild(btn);
    });

    // Select first room initially
    if (this.palaceData[0]) {
      this.selectRoom(this.palaceData[0].doorId);
    }
  }

  selectRoom(doorId) {
    this.activeDoorId = doorId;

    // Update active tab button
    const buttons = this.doorsContainer.querySelectorAll('.door-tab-btn');
    this.palaceData.forEach((room, idx) => {
      if (buttons[idx]) {
        buttons[idx].classList.toggle('is-active', room.doorId === doorId);
      }
    });

    const room = this.palaceData.find((r) => r.doorId === doorId);
    if (!room || !this.corkboardContainer) return;

    this.corkboardContainer.innerHTML = '';

    // Render Polaroids with individual rotation offsets
    (room.polaroids || []).forEach((item) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'polaroid-wrapper';
      const rot = item.rotation || 0;
      wrapper.style.transform = `rotate(${rot}deg)`;

      wrapper.innerHTML = `
        <div class="pushpin-pin"></div>
        <div class="pushpin-shadow"></div>
        <div class="polaroid-inner">
          <!-- Front Face -->
          <div class="polaroid-front">
            <div class="polaroid-photo-frame">
              <span class="evidence-stamp">${item.tag || 'EXHIBIT'}</span>
              <img src="${item.image}" alt="${item.caption}" class="polaroid-img" loading="lazy" />
            </div>
            <div class="polaroid-caption">${item.caption}</div>
          </div>
          <!-- Back Face (Memory Note) -->
          <div class="polaroid-back">
            <div class="evidence-stamp">${item.tag || 'EXHIBIT'} &bull; NOTE</div>
            <p class="polaroid-back-note">${item.backNote}</p>
            <div class="polaroid-flip-hint">Click to flip back</div>
          </div>
        </div>
      `;

      wrapper.addEventListener('click', () => {
        wrapper.classList.toggle('is-flipped');
        this.playFlipSound();
      });

      this.corkboardContainer.appendChild(wrapper);
    });
  }

  playFlipSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.audioCtx) this.audioCtx = new AudioCtx();
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, this.audioCtx.currentTime + 0.12);

      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.14);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.14);
    } catch (e) {}
  }
}

export const memoryPalace = new MemoryPalaceManager();
