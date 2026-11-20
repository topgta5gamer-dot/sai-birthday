/**
 * js/clock.js
 * Master timekeeper.
 * Requirement 1: All time comes from clock.now(). Nothing else calls Date directly.
 * Requirement 2: Pinned time zone using CONFIG.unlockAt with explicit UTC offset.
 * Requirement 3: Self-correcting resync on visibilitychange & focus.
 */
import { CONFIG } from './config.js';

class MasterClock {
  constructor() {
    this.offsetMs = 0;
    this.targetTimestamp = new Date(CONFIG.unlockAt).getTime();
    this.listeners = new Set();
    this.initResyncListeners();
  }

  /**
   * Returns current simulated time in ms.
   * Master replacement for Date.now().
   */
  now() {
    return Date.now() + this.offsetMs;
  }

  /**
   * Sets artificial time offset in ms (used by admin time machine).
   */
  setOffset(ms) {
    this.offsetMs = ms;
    this.notify();
  }

  /**
   * Gets active offset in ms.
   */
  getOffset() {
    return this.offsetMs;
  }

  /**
   * Resets offset to 0 (real-world clock).
   */
  resetOffset() {
    this.offsetMs = 0;
    this.notify();
  }

  /**
   * Returns target timestamp (pinned from CONFIG.unlockAt).
   */
  getTarget() {
    return this.targetTimestamp;
  }

  /**
   * Computes precise remaining time breakdown.
   */
  getRemaining() {
    const current = this.now();
    const diff = this.targetTimestamp - current;

    if (diff <= 0) {
      return {
        totalMs: 0,
        isPast: true,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        rawDiff: diff
      };
    }

    const seconds = Math.floor((diff / 1000) % 60);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    return {
      totalMs: diff,
      isPast: false,
      days,
      hours,
      minutes,
      seconds,
      rawDiff: diff
    };
  }

  /**
   * Subscribe to clock update notifications.
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      try {
        cb(this.getRemaining());
      } catch (err) {
        console.error('[Clock] Listener error:', err);
      }
    }
  }

  /**
   * Listen for browser sleep / tab visibility changes to guarantee sync.
   */
  initResyncListeners() {
    const resync = () => {
      this.notify();
    };

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        resync();
      }
    });

    window.addEventListener('focus', resync);
  }
}

export const clock = new MasterClock();
