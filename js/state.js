/**
 * js/state.js
 * Idempotent State Machine & Safe LocalStorage Persistence.
 * States:
 *  - 'locked'        (countdown running, > 60s remaining)
 *  - 'final-minute'  (countdown running, <= 60s remaining)
 *  - 'revealing'     (0 reached, cinematic transition executing)
 *  - 'unlocked'      (reveal complete, celebration content active)
 */
import { clock } from './clock.js';

export const STATES = {
  LOCKED: 'locked',
  FINAL_MINUTE: 'final-minute',
  REVEALING: 'revealing',
  UNLOCKED: 'unlocked'
};

class StateMachine {
  constructor() {
    this.currentState = null;
    this.listeners = new Set();
    this.hasRevealedInThisSession = false;
  }

  /**
   * Initializes state based on current clock.
   */
  init() {
    const remaining = clock.getRemaining();

    if (remaining.isPast) {
      // If opened after midnight, land straight in unlocked state quietly
      this.transitionTo(STATES.UNLOCKED, { quiet: true });
    } else if (remaining.totalMs <= 60000) {
      this.transitionTo(STATES.FINAL_MINUTE);
    } else {
      this.transitionTo(STATES.LOCKED);
    }

    // Subscribe to clock ticks to handle natural time transitions
    clock.subscribe((rem) => {
      this.evaluateTime(rem);
    });
  }

  evaluateTime(remaining) {
    if (this.currentState === STATES.UNLOCKED) return;

    if (remaining.isPast) {
      if (this.currentState !== STATES.REVEALING && this.currentState !== STATES.UNLOCKED) {
        // Trigger reveal transition
        this.transitionTo(STATES.REVEALING);
      }
    } else if (remaining.totalMs <= 60000 && this.currentState === STATES.LOCKED) {
      this.transitionTo(STATES.FINAL_MINUTE);
    } else if (remaining.totalMs > 60000 && this.currentState === STATES.FINAL_MINUTE) {
      // In case admin rolls time backward
      this.transitionTo(STATES.LOCKED);
    }
  }

  transitionTo(newState, meta = {}) {
    if (this.currentState === newState) return;

    const previousState = this.currentState;
    this.currentState = newState;

    if (newState === STATES.REVEALING) {
      this.hasRevealedInThisSession = true;
    }

    this.notify(newState, previousState, meta);
  }

  getState() {
    return this.currentState;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify(current, previous, meta) {
    for (const cb of this.listeners) {
      try {
        cb(current, previous, meta);
      } catch (err) {
        console.error('[StateMachine] Listener error:', err);
      }
    }
  }
}

/**
 * Safe LocalStorage wrapper (Section 5.9).
 */
export const storage = {
  get(key, fallback = null) {
    try {
      const val = localStorage.getItem(key);
      return val !== null ? JSON.parse(val) : fallback;
    } catch (e) {
      console.warn('[Storage] Read error for key:', key, e);
      return fallback;
    }
  },

  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('[Storage] Write error for key:', key, e);
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn('[Storage] Remove error for key:', key, e);
    }
  },

  clearAll() {
    try {
      const keysToClear = [
        'mb_seal_broken',
        'mb_cranes_found',
        'mb_card_picked',
        'mb_mute_pref',
        'mb_has_visited',
        'mb_passcode_unlocked',
        'mb_lid_closed'
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('[Storage] Clear error:', e);
    }
  }
};

export const stateMachine = new StateMachine();
