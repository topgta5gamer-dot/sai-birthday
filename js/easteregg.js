/**
 * js/easteregg.js
 * Friendly Red John Smiley, Secret Keystroke ("red john"), DevTools Message & Confetti.
 */

export function initEasterEggs() {
  logDevToolsMessage();
  setupKeystrokeDetector();
  setupSmileyTrigger();
}

function logDevToolsMessage() {
  console.log(
    '%c☕ CBI Case File #1217: A Note from Patrick Jane',
    'color: #9B111E; font-family: Georgia, serif; font-size: 16px; font-weight: bold;'
  );
  console.log(
    "%cLooking behind the curtain? How predictably curious of you.\nAs Patrick Jane says: 'If you stop and look around once in a while, you might see it.'\nEverything is right on schedule. Tick tock...",
    'color: #2B1B1A; font-family: monospace; font-size: 12px; line-height: 1.5;'
  );
}

function setupKeystrokeDetector() {
  let keyBuffer = '';
  const targetCode1 = 'redjohn';
  const targetCode2 = 'red john';

  window.addEventListener('keydown', (e) => {
    // Ignore if typing inside input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    keyBuffer += e.key.toLowerCase();
    if (keyBuffer.length > 20) {
      keyBuffer = keyBuffer.slice(-20);
    }

    if (keyBuffer.endsWith(targetCode1) || keyBuffer.endsWith(targetCode2)) {
      triggerConfettiBurst();
      keyBuffer = '';
    }
  });
}

function setupSmileyTrigger() {
  const smiley = document.getElementById('friendly-smiley-egg');
  if (smiley) {
    smiley.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerConfettiBurst();
    });
  }
}

export function triggerConfettiBurst() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const colors = ['#9B111E', '#F4DAD6', '#B8964E', '#C98A3B', '#E8C3B9'];
  const particles = [];
  const particleCount = 75;

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: window.innerWidth * 0.5 + (Math.random() * 200 - 100),
      y: window.innerHeight * 0.45 + (Math.random() * 100 - 50),
      w: Math.random() * 8 + 4,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * -6 - 2,
      gravity: 0.15,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 8,
      opacity: 1
    });
  }

  let animationFrame;
  const startTime = Date.now();

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const elapsed = Date.now() - startTime;

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.rotation += p.vRot;
      p.opacity = Math.max(0, 1 - (elapsed / 3200));

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.opacity;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });

    if (elapsed < 3200) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrame);
    }
  }

  animate();
}
