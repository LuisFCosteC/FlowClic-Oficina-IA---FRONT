import * as THREE from 'three';

function finalizeColorTexture(
  canvas: HTMLCanvasElement,
  maxAnisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createLabFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0d1524';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle metallic tile grain
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      const shade = (i + j) % 2 === 0 ? '#0f1829' : '#0c1422';
      ctx.fillStyle = shade;
      ctx.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
    }
  }

  // Hairline architectural seams
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= 512; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  // Subtle corner intersections
  ctx.fillStyle = 'rgba(6, 182, 212, 0.35)';
  for (let x = 0; x <= 512; x += 128) {
    for (let y = 0; y <= 512; y += 128) {
      ctx.fillRect(x - 3, y - 3, 6, 6);
    }
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 5, 5);
}

export function createWoodFloorTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3b281c';
  ctx.fillRect(0, 0, 512, 512);

  const plankHeight = 64;
  const palette = ['#442d1f', '#3d281b', '#4b3222', '#372318'];
  for (let row = 0; row < 8; row++) {
    const y = row * plankHeight;
    const offset = (row % 2) * 140;
    for (let col = -1; col < 3; col++) {
      const x = col * 256 + offset;
      ctx.fillStyle = palette[(row + col + 4) % palette.length];
      ctx.fillRect(x + 2, y + 2, 252, plankHeight - 4);

      // Subtle wood grain streaks
      ctx.strokeStyle = 'rgba(20, 10, 5, 0.25)';
      ctx.lineWidth = 1;
      for (let g = 8; g < plankHeight - 6; g += 10) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + g);
        ctx.bezierCurveTo(
          x + 80,
          y + g + 2,
          x + 170,
          y + g - 2,
          x + 248,
          y + g
        );
        ctx.stroke();
      }
    }
  }

  return finalizeColorTexture(canvas, maxAnisotropy, 3, 3);
}

export function createBbtRugTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d')!;

  // Warm terracotta / rust / navy geometric apartment rug
  ctx.fillStyle = '#5c2c20';
  ctx.fillRect(0, 0, 512, 384);

  ctx.strokeStyle = '#c27d43';
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, 472, 344);

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 6;
  ctx.strokeRect(42, 42, 428, 300);

  // Geometric diamonds
  ctx.fillStyle = '#8c442c';
  for (let x = 96; x < 440; x += 80) {
    for (let y = 96; y < 310; y += 96) {
      ctx.beginPath();
      ctx.moveTo(x, y - 28);
      ctx.lineTo(x + 28, y);
      ctx.lineTo(x, y + 28);
      ctx.lineTo(x - 28, y);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#d99a5b';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8c442c';
    }
  }

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createMonitorScreenTexture(
  variant: number,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#060c18';
  ctx.fillRect(0, 0, 512, 288);

  // Top chrome bar
  ctx.fillStyle = '#0f1b2e';
  ctx.fillRect(0, 0, 512, 24);
  ctx.fillStyle = '#06b6d4';
  ctx.fillRect(10, 9, 44, 6);
  ctx.fillStyle = '#334155';
  ctx.fillRect(62, 9, 90, 6);

  if (variant % 3 === 0) {
    // Code editor view
    const colors = ['#38bdf8', '#10b981', '#a855f7', '#f59e0b', '#94a3b8'];
    for (let i = 0; i < 14; i++) {
      const y = 38 + i * 16;
      const indent = (i % 4) * 16;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(12, y, 16, 7);
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(38 + indent, y, 60 + ((i * 37) % 140), 7);
      ctx.fillStyle = '#475569';
      ctx.fillRect(110 + indent + ((i * 23) % 90), y, 50 + ((i * 19) % 100), 7);
    }
    // Right minimap panel
    ctx.fillStyle = '#0b1322';
    ctx.fillRect(370, 24, 142, 264);
    ctx.strokeStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(370, 24);
    ctx.lineTo(370, 288);
    ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.fillRect(386, 44, 108, 12);
    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(386, 68, 84, 8);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(386, 86, 96, 8);
  } else if (variant % 3 === 1) {
    // Telemetry & waveform chart
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 1;
    for (let x = 24; x < 490; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 36);
      ctx.lineTo(x, 264);
      ctx.stroke();
    }
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 24; x <= 488; x += 16) {
      const y = 160 - Math.sin(x * 0.03 + variant) * 48 - Math.cos(x * 0.07) * 18;
      if (x === 24) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 24; x <= 488; x += 16) {
      const y = 205 - Math.cos(x * 0.04 + variant) * 32;
      if (x === 24) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else {
    // Node architecture diagram
    const nodes = [
      { x: 90, y: 110, c: '#06b6d4' },
      { x: 250, y: 80, c: '#10b981' },
      { x: 250, y: 190, c: '#f59e0b' },
      { x: 410, y: 135, c: '#a855f7' },
    ];
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(90, 110);
    ctx.lineTo(250, 80);
    ctx.lineTo(410, 135);
    ctx.moveTo(90, 110);
    ctx.lineTo(250, 190);
    ctx.lineTo(410, 135);
    ctx.stroke();

    nodes.forEach((n) => {
      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = n.c;
      ctx.lineWidth = 3;
      ctx.fillRect(n.x - 36, n.y - 22, 72, 44);
      ctx.strokeRect(n.x - 36, n.y - 22, 72, 44);
      ctx.fillStyle = n.c;
      ctx.fillRect(n.x - 22, n.y - 4, 44, 8);
    });
  }

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createSheldonWhiteboardTexture(
  variant: 'main' | 'left' | 'right',
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Clean off-white porcelain whiteboard surface
  ctx.fillStyle = '#edf2f7';
  ctx.fillRect(0, 0, 1024, 512);

  // Faint drafting grid
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 1024; x += 32) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  if (variant === 'main') {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 34px "JetBrains Mono", monospace';
    ctx.fillText('FLOWCLIC CTO REVIEW — OFICINA IA', 48, 66);

    // Blue marker equations
    ctx.fillStyle = '#1d4ed8';
    ctx.font = '600 28px "JetBrains Mono", monospace';
    ctx.fillText('L = ∫ d⁴x [ -¼ F_μν F^μν + ψ̄(iγ^μ D_μ - m)ψ ]', 48, 134);
    ctx.fillText('Router(t) = argmin_m [ α·Cost(m) + β·Lat(m) ]', 48, 186);

    // Architecture boxes
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 4;
    ctx.strokeRect(56, 234, 210, 94);
    ctx.strokeRect(380, 234, 240, 94);
    ctx.strokeRect(736, 234, 224, 94);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('CLAUDE OPUS', 80, 276);
    ctx.fillText('SHELDON GATE', 404, 276);
    ctx.fillText('PROD / CEO', 776, 276);
    ctx.font = '20px monospace';
    ctx.fillStyle = '#0369a1';
    ctx.fillText('Fallback: Gemini Pro', 68, 308);
    ctx.fillText('Zero-Defect Proof', 404, 308);
    ctx.fillText('Human-in-Loop', 776, 308);

    // Arrows
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(266, 281);
    ctx.lineTo(372, 281);
    ctx.moveTo(620, 281);
    ctx.lineTo(728, 281);
    ctx.stroke();

    // Red circle emphasis + note
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.ellipse(500, 412, 165, 48, -0.04, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 26px "JetBrains Mono", monospace';
    ctx.fillText('IDLE = REPOSO !', 376, 421);
  } else if (variant === 'left') {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.fillText('ERP BANCARIO — LEDGER PROOF', 48, 66);

    // Feynman-style diagram
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(90, 140);
    ctx.lineTo(240, 250);
    ctx.lineTo(90, 360);
    ctx.moveTo(520, 140);
    ctx.lineTo(370, 250);
    ctx.lineTo(520, 360);
    ctx.stroke();

    // Wavy boson propagator
    ctx.strokeStyle = '#d97706';
    ctx.beginPath();
    for (let x = 240; x <= 370; x += 6) {
      const y = 250 + Math.sin((x - 240) * 0.28) * 18;
      if (x === 240) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = '24px "JetBrains Mono", monospace';
    ctx.fillText('Σ Debit - Σ Credit = 0', 600, 180);
    ctx.fillText('ACID · Isolation: SERIALIZABLE', 580, 240);
    ctx.fillStyle = '#047857';
    ctx.fillText('TPS Target >= 15,000', 600, 310);
  } else {
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 30px "JetBrains Mono", monospace';
    ctx.fillText('AKINOAI — MEMORIA EFÍMERA', 48, 66);

    ctx.strokeStyle = '#0f766e';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(220 + i * 260, 240, 82, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('ACTIVO', 174, 248);
    ctx.fillText('RESUMEN', 424, 248);
    ctx.fillText('PURGA 0KB', 674, 248);

    ctx.fillStyle = '#475569';
    ctx.font = '22px "JetBrains Mono", monospace';
    ctx.fillText('Token Savings Δ = -42.8% / mes', 180, 420);
  }

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createTvScreenTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 288);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(0.5, '#1e1b4b');
  grad.addColorStop(1, '#083344');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 288);

  // Retro sci-fi starfield & planet horizon
  ctx.fillStyle = '#f8fafc';
  for (let i = 0; i < 45; i++) {
    const x = (i * 97) % 500 + 6;
    const y = (i * 53) % 180 + 8;
    ctx.fillRect(x, y, 2, 2);
  }

  // Glowing planet
  const planetGrad = ctx.createRadialGradient(350, 112, 10, 350, 112, 62);
  planetGrad.addColorStop(0, '#fde047');
  planetGrad.addColorStop(0.6, '#f97316');
  planetGrad.addColorStop(1, '#7c2d12');
  ctx.fillStyle = planetGrad;
  ctx.beginPath();
  ctx.arc(350, 112, 54, 0, Math.PI * 2);
  ctx.fill();

  // Orbital ring
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.8)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(350, 112, 92, 22, -0.25, 0, Math.PI * 2);
  ctx.stroke();

  // Subtle caption
  ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
  ctx.font = 'bold 20px "JetBrains Mono", monospace';
  ctx.fillText('FLOWCLIC LOUNGE · STANDBY STREAM', 28, 256);

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createServerRackTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#090e18';
  ctx.fillRect(0, 0, 256, 512);

  for (let i = 0; i < 12; i++) {
    const y = 16 + i * 40;
    ctx.fillStyle = '#131d2e';
    ctx.fillRect(14, y, 228, 32);

    // Ventilation slits
    ctx.fillStyle = '#070b12';
    for (let s = 0; s < 10; s++) {
      ctx.fillRect(24 + s * 14, y + 8, 8, 16);
    }

    // Status LEDs
    ctx.fillStyle = i % 4 === 0 ? '#f59e0b' : '#06b6d4';
    ctx.fillRect(192, y + 11, 10, 10);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(212, y + 11, 10, 10);
  }

  return finalizeColorTexture(canvas, maxAnisotropy);
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.24)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}


export function createGamingScreenTexture(
  maxAnisotropy: number,
  theme: 'racing' | 'adventure' | 'space' = 'racing'
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 288;
  const ctx = canvas.getContext('2d')!;

  if (theme === 'racing') {
    // Retro synthwave racing game
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 160);
    skyGrad.addColorStop(0, '#312e81');
    skyGrad.addColorStop(0.5, '#db2777');
    skyGrad.addColorStop(1, '#f59e0b');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 512, 160);

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(256, 120, 44, Math.PI, 0, false);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.moveTo(0, 288);
    ctx.lineTo(210, 160);
    ctx.lineTo(302, 160);
    ctx.lineTo(512, 288);
    ctx.fill();

    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(256, 160);
    ctx.lineTo(256, 288);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SPEED: 260 KM/H', 24, 38);
    ctx.fillText('POS: 1 / 12', 340, 38);
    ctx.fillStyle = '#10b981';
    ctx.fillText('LAP 3/3', 24, 68);
  } else if (theme === 'adventure') {
    // Platformer adventure game
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 288);
    bgGrad.addColorStop(0, '#042f2e');
    bgGrad.addColorStop(0.6, '#0f766e');
    bgGrad.addColorStop(1, '#115e59');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 288);

    ctx.fillStyle = '#334155';
    ctx.fillRect(60, 180, 140, 24);
    ctx.fillRect(260, 140, 160, 24);
    ctx.fillStyle = '#10b981';
    ctx.fillRect(60, 176, 140, 6);
    ctx.fillRect(260, 136, 160, 6);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('★ COINS: 99', 24, 38);
    ctx.fillStyle = '#ef4444';
    ctx.fillText('❤ ❤ ❤', 390, 38);
    ctx.fillStyle = '#38bdf8';
    ctx.font = '16px monospace';
    ctx.fillText('STAGE 4 - BOSS FIGHT', 24, 68);
  } else {
    // Space combat simulator
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 512, 288);

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 37) % 512;
      const sy = (i * 59) % 288;
      ctx.fillRect(sx, sy, 2, 2);
    }

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 3;
    ctx.strokeRect(216, 104, 80, 80);
    ctx.beginPath();
    ctx.arc(256, 144, 28, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#06b6d4';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('SHIELD: 100%', 24, 38);
    ctx.fillStyle = '#f43f5e';
    ctx.fillText('TARGET LOCKED', 310, 38);
    ctx.fillStyle = '#a855f7';
    ctx.font = '16px monospace';
    ctx.fillText('SCORE: 58,400', 24, 68);
  }

  return finalizeColorTexture(canvas, maxAnisotropy);
}
