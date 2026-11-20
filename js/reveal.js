/**
 * js/reveal.js
 * Midnight Cinematic Transition & Rose Petal Cascade.
 * Section 7.1: Lighting warms to candlelight, falling rose petals, vinyl player needle drop.
 * Audio-orchestrated: Guarantees zero audio overlap between opening transition and main song.
 */
import { stateMachine, STATES } from './state.js';
import { audioEngine } from './audio.js';
import { pocketWatch } from './countdown.js';

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
      document.body.classList.add('candlelight-warmth');
      audioEngine.showNeedlePrompt();
    }
  }

  handleState(state, prevState, meta) {
    if (state === STATES.REVEALING) {
      this.triggerCinematicReveal();
    } else if (state === STATES.UNLOCKED) {
      document.body.classList.add('candlelight-warmth');

      // Make sure opening chimes are completely silenced
      pocketWatch.stopMidnightChimes();

      if (meta && meta.quiet) {
        // Opened after midnight: skip cinematic, show needle prompt
        audioEngine.showNeedlePrompt();
      } else {
        // Natural transition: smooth 400ms cinematic pause before needle drops
        setTimeout(() => {
          audioEngine.play().catch(() => {
            audioEngine.showNeedlePrompt();
          });
        }, 400);
      }
    }
  }

  triggerCinematicReveal() {
    // 1. Warm lighting to candlelight
    document.body.classList.add('candlelight-warmth');

    // 2. Petals cascade (unless prefers-reduced-motion)
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion && this.canvas) {
      this.startPetalCascade();
    }

    // 3. Complete transition cleanly after intro bells complete
    setTimeout(() => {
      pocketWatch.stopMidnightChimes();
      stateMachine.transitionTo(STATES.UNLOCKED);
    }, 2800);
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

    const startTime = Date.now();
    const duration = 8000;

    const animate = () => {
      if (!this.isRunning) return;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      const elapsed = Date.now() - startTime;

      this.petals.forEach((p) => {
        p.angle += p.oscillationSpeed;
        p.x += p.speedX + Math.sin(p.angle) * 1.5;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        this.ctx.save();
        this.ctx.translate(p.x, p.y);
        this.ctx.rotate((p.rotation * Math.PI) / 180);
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.opacity;

        this.ctx.beginPath();
        this.ctx.moveTo(0, -p.size / 2);
        this.ctx.bezierCurveTo(p.size / 2, -p.size / 2, p.size / 2, p.size / 2, 0, p.size / 2);
        this.ctx.bezierCurveTo(-p.size / 2, p.size / 2, -p.size / 2, -p.size / 2, 0, -p.size / 2);
        this.ctx.fill();
        this.ctx.restore();
      });

      if (elapsed < duration) {
        this.animId = requestAnimationFrame(animate);
      } else {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.isRunning = false;
      }
    };

    animate();
  }
}

export const revealManager = new RevealManager();
