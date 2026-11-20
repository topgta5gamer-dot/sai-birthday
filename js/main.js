/**
 * js/main.js
 * Application Entry Point.
 * Coordinates clock loop, state transitions, passcode gate, watch chronometer,
 * teacup quotes, origami cranes, vinyl player audio engine, midnight reveal,
 * 3D wax-sealed letter, memory palace, mind-reading game, and admin tools.
 */
import { CONFIG } from './config.js';
import { clock } from './clock.js';
import { stateMachine, STATES } from './state.js';
import { initAdmin } from './admin.js';
import { initGate } from './gate.js';
import { pocketWatch } from './countdown.js';
import { teacup } from './teacup.js';
import { origami } from './origami.js';
import { initEasterEggs } from './easteregg.js';
import { audioEngine } from './audio.js';
import { revealManager } from './reveal.js';
import { envelopeManager } from './envelope.js';
import { memoryPalace } from './palace.js';
import { mindReader } from './mindreader.js';

class App {
  constructor() {
    this.lastSecond = null;
  }

  init() {
    console.log('[Birthday App] Initializing The Mentalist Edition...');

    // Initialize State Machine
    stateMachine.init();

    // Check Option B: Passcode Gate
    initGate(() => {
      this.onUnlockedGate();
    });

    // Initialize Admin Time Machine (only mounts if ?preview=key is valid)
    initAdmin();

    // Start high-precision animation loop
    this.startClockLoop();

    console.log('[Birthday App] Ready. Target unlock:', CONFIG.unlockAt);
  }

  onUnlockedGate() {
    // 1. Initialize the Victorian Pocket Watch Chronometer
    pocketWatch.init();

    // 2. Initialize the Steaming Teacup & Quote Dispensary
    teacup.init();

    // 3. Initialize the 17 Drifting Origami Cranes
    origami.init();

    // 4. Initialize Friendly Easter Eggs (Smiley, DevTools, Keystrokes)
    initEasterEggs();

    // 5. Initialize Audio Engine & Vinyl Turntable
    audioEngine.init();

    // 6. Initialize Midnight Cinematic Transition
    revealManager.init();

    // 7. Initialize 3D Wax-Sealed Envelope & Letter
    envelopeManager.init();

    // 8. Initialize Patrick Jane's Memory Palace & Witness Statements
    memoryPalace.init();

    // 9. Initialize Mind-Reading Game & Finale Riddle
    mindReader.init();

    // Subscribe to state changes to update root dataset & status notices
    stateMachine.subscribe((newState, prevState, meta) => {
      this.handleStateChange(newState, prevState, meta);
    });

    // Initial state setup
    this.handleStateChange(stateMachine.getState(), null, {});
  }

  handleStateChange(newState, prevState, meta) {
    document.documentElement.dataset.state = newState;
  }

  startClockLoop() {
    const tick = () => {
      const nowSec = Math.floor(clock.now() / 1000);
      if (nowSec !== this.lastSecond) {
        this.lastSecond = nowSec;
        clock.notify();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// Boot on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init();
});
