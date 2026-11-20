/**
 * js/gate.js
 * Option B: 4-digit Passcode Gate ("CBI Confidential Clearance").
 * Keeps the website private to anyone who doesn't have the secret code.
 */
import { CONFIG } from './config.js';
import { storage } from './state.js';

export function initGate(onUnlock) {
  const gateEl = document.getElementById('passcode-gate');
  const appEl = document.getElementById('app');

  // Check URL preview key (Admin bypasses gate automatically)
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get('preview') === CONFIG.previewKey;

  // Check if already unlocked previously in this browser
  const isPreviouslyUnlocked = storage.get('mb_passcode_unlocked', false);

  if (isAdmin || isPreviouslyUnlocked) {
    if (gateEl) gateEl.style.display = 'none';
    if (appEl) appEl.classList.remove('blurred-locked');
    onUnlock();
    return;
  }

  // Show Gate
  if (gateEl) {
    gateEl.style.display = 'flex';
    if (appEl) appEl.classList.add('blurred-locked');
    setupPinInputs(gateEl, onUnlock);
  } else {
    onUnlock();
  }
}

function setupPinInputs(gateEl, onUnlock) {
  const inputs = gateEl.querySelectorAll('.pin-digit');
  const errorMsg = gateEl.getElementById ? gateEl.getElementById('gate-error') : document.getElementById('gate-error');
  const appEl = document.getElementById('app');

  // Auto-focus first digit
  setTimeout(() => {
    if (inputs[0]) inputs[0].focus();
  }, 200);

  inputs.forEach((input, idx) => {
    input.addEventListener('input', (e) => {
      const val = e.target.value.replace(/[^0-9]/g, '');
      e.target.value = val ? val[0] : '';

      if (val && idx < inputs.length - 1) {
        inputs[idx + 1].focus();
      }

      checkCompletePin();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !input.value && idx > 0) {
        inputs[idx - 1].focus();
      }
    });

    // Handle copy/paste of full 4-digit PIN
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData).getData('text').trim();
      const digits = pasteData.replace(/[^0-9]/g, '').slice(0, 4);

      if (digits.length > 0) {
        digits.split('').forEach((d, i) => {
          if (inputs[i]) inputs[i].value = d;
        });
        const nextIdx = Math.min(digits.length, inputs.length - 1);
        inputs[nextIdx].focus();
        checkCompletePin();
      }
    });
  });

  function checkCompletePin() {
    const enteredPin = Array.from(inputs).map((i) => i.value).join('');

    if (enteredPin.length === 4) {
      if (enteredPin === CONFIG.passcode) {
        // Success
        inputs.forEach((i) => i.classList.add('pin-success'));
        if (errorMsg) {
          errorMsg.textContent = 'Clearance granted. Welcome...';
          errorMsg.classList.add('success-text');
        }

        storage.set('mb_passcode_unlocked', true);

        setTimeout(() => {
          gateEl.classList.add('gate-fade-out');
          if (appEl) appEl.classList.remove('blurred-locked');
          setTimeout(() => {
            gateEl.style.display = 'none';
            onUnlock();
          }, 600);
        }, 500);
      } else {
        // Wrong PIN
        inputs.forEach((i) => i.classList.add('pin-shake'));
        if (errorMsg) {
          errorMsg.textContent = "Access denied. Try Patrick Jane's favorite date...";
          errorMsg.classList.remove('success-text');
        }

        setTimeout(() => {
          inputs.forEach((i) => {
            i.classList.remove('pin-shake');
            i.value = '';
          });
          if (inputs[0]) inputs[0].focus();
        }, 800);
      }
    }
  }
}
