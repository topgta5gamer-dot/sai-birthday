/**
 * js/reveal.js
 * Midnight Cinematic Transition, Matrix Rain Trigger,
 * and Dynamic Rose Petal Cascade / Candlelight Atmosphere.
 */
import { stateMachine, STATES, storage } from './state.js';
import { audioEngine } from './audio.js';
import { pocketWatch } from './countdown.js';
import { matrixEngine } from './matrix.js';

class RevealManager {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.petals = [];
    this.animId = null;
    this.isRunning = false;
  }

  init() {
    this.canvas = document.getElementById('petals-canvas');
    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d');
    }

    stateMachine.subscribe((state, prevState, meta) => {
      this.handleState(state, prevState, meta);
    });

    // Check initial state on boot
    const current = stateMachine.getState();
    if (current === STATES.UNLOCKED) {
      const hasChosen = storage.get('sai_pill_choice', null);
      if (!hasChosen) {
        setTimeout(() => {
          matrixEngine.openNeoChoiceModal();
        }, 500);
      }
      if (!matrixEngine.isBluePill()) {
        document.body.classList.add('candlelight-warmth');
      }
      audioEngine.showNeedlePrompt();
    }
  }

  handleState(state, prevState, meta) {
    if (state === STATES.REVEALING) {
      this.triggerCinematicReveal();
    } else if (state === STATES.UNLOCKED) {
      // Make sure opening chimes are completely silenced
      pocketWatch.stopMidnightChimes();

      if (!matrixEngine.isBluePill()) {
        document.body.classList.add('candlelight-warmth');
      } else {
        document.body.classList.remove('candlelight-warmth');
        this.stopPetalCascade();
      }

      if (meta && meta.quiet) {
        audioEngine.showNeedlePrompt();
      } else {
        setTimeout(() => {
          audioEngine.play().catch(() => {
            audioEngine.showNeedlePrompt();
          });
        }, 400);
      }
    }
  }

  triggerCinematicReveal() {
    // 1. Silence pocket watch chimes so Matrix audio plays cleanly
    pocketWatch.stopMidnightChimes();

    // 2. Trigger Fullscreen Matrix Digital Rain & Neo Pill Choice Modal
    matrixEngine.triggerCinematicTransition(() => {
      // Executed once Sai clicks Red Pill or Blue Pill
      const isBlue = matrixEngine.isBluePill();

      if (!isBlue) {
        document.body.classList.add('candlelight-warmth');
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!prefersReducedMotion && this.canvas) {
          this.startPetalCascade();
        }
      } else {
        document.body.classList.remove('candlelight-warmth');
        this.stopPetalCascade();
      }

      stateMachine.transitionTo(STATES.UNLOCKED);
    });
  }

  startPetalCascade() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.isRunning = true;

    this.petals = [];
    const colors = ['#9B111E', '#B51E2B', '#800020', '#C9184A', '#7A0E18'];

    for (let i = 0; i < 45; i++) {
      this.petals.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * -this.canvas.height,
        size: Math.random() * 12 + 10,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedY: Math.random() * 2 + 1.2,
        speedX: Math.random() * 1.5 - 0.75,
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 2,
        oscillationSpeed: Math.random() * 0.03 + 0.01,
        angle: Math.random() * Math.PI * 2,
        opacity: Math.random() * 0.35 + 0.65
      });
    }

    const animate = () => {
      if (!this.isRunning || !this.ctx) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      for (let i = 0; i < this.petals.length; i++) {
        const p = this.petals[i];
        p.y += p.speedY;
        p.angle += p.oscillationSpeed;
        p.x += Math.sin(p.angle) * 1.5 + p.speedX;
        p.rotation += p.rotationSpeed;

        if (p.y > this.canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * this.canvas.width;
        }

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.globalAlpha = p.opacity;
        this.ctx.fillStyle = p.color;

        // Draw organic petal curve
        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size / 2);
        this.ctx.bezierCurveTo(p.size / 2, -p.size / 2, p.size / 2, p.size / 2, 0, p.size / 2);
        this.ctx.bezierCurveTo(-p.size / 2, p.size / 2, -p.size / 2, -p.size / 2, 0, -p.size / 2);
        this.ctx.fill();
        this.ctx.restore();
      }

      this.animId = requestAnimationFrame(animate);
    };

    if (this.animId) cancelAnimationFrame(this.animId);
    animate();
  }

  stopPetalCascade() {
    this.isRunning = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.canvas && this.ctx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

export const revealManager = new RevealManager();
