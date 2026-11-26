import * as THREE from 'three';

export interface ProceduralTexturePack {
  denimColorOverlay: THREE.CanvasTexture;
  denimBump: THREE.CanvasTexture;
  knitBump: THREE.CanvasTexture;
  flannelPattern: THREE.CanvasTexture;
  hairBump: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [canvas, ctx];
}

export function createOutfitTexturePack(maxAnisotropy: number): ProceduralTexturePack {
  const aniso = Math.max(1, Math.min(maxAnisotropy, 8));

  // 1. Subtle Denim Twill Overlay (grayscale subtle weave so multiplying by tint keeps hue crisp)
  const [denimCanvas, dCtx] = makeCanvas(256);
  dCtx.fillStyle = '#EAEAEA';
  dCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    for (let x = 0; x < 256; x += 2) {
      const diag = ((x + y) % 8 === 0) ? 210 : ((x + y) % 4 === 0 ? 235 : 248);
      const jitter = ((x * 13 + y * 29) % 14) - 7;
      const v = Math.max(180, Math.min(255, diag + jitter));
      dCtx.fillStyle = `rgb(${v},${v},${v})`;
      dCtx.fillRect(x, y, 2, 2);
    }
  }
  const denimColorOverlay = new THREE.CanvasTexture(denimCanvas);
  denimColorOverlay.colorSpace = THREE.SRGBColorSpace;
  denimColorOverlay.wrapS = THREE.RepeatWrapping;
  denimColorOverlay.wrapT = THREE.RepeatWrapping;
  denimColorOverlay.repeat.set(3, 3);
  denimColorOverlay.anisotropy = aniso;

  // 2. Denim Bump Map (Linear)
  const denimBump = new THREE.CanvasTexture(denimCanvas);
  denimBump.wrapS = THREE.RepeatWrapping;
  denimBump.wrapT = THREE.RepeatWrapping;
  denimBump.repeat.set(4, 4);
  denimBump.anisotropy = aniso;

  // 3. Ribbed Knit Bump Map (for Cardigans / Turtlenecks / Vests)
  const [knitCanvas, kCtx] = makeCanvas(256);
  kCtx.fillStyle = '#808080';
  kCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    const grad = kCtx.createLinearGradient(x, 0, x + 16, 0);
    grad.addColorStop(0, '#4A4A4A');
    grad.addColorStop(0.5, '#EFEFEF');
    grad.addColorStop(1, '#4A4A4A');
    kCtx.fillStyle = grad;
    kCtx.fillRect(x, 0, 16, 256);
  }
  kCtx.strokeStyle = 'rgba(20,20,20,0.22)';
  kCtx.lineWidth = 2;
  for (let y = 0; y < 256; y += 14) {
    kCtx.beginPath();
    for (let x = 0; x <= 256; x += 8) {
      const py = y + ((x / 8) % 2 === 0 ? 4 : -4);
      if (x === 0) kCtx.moveTo(x, py);
      else kCtx.lineTo(x, py);
    }
    kCtx.stroke();
  }
  const knitBump = new THREE.CanvasTexture(knitCanvas);
  knitBump.wrapS = THREE.RepeatWrapping;
  knitBump.wrapT = THREE.RepeatWrapping;
  knitBump.repeat.set(6, 6);
  knitBump.anisotropy = aniso;

  // 4. Flannel Plaid Pattern (multiplicative tintable plaid overlay)
  const [flannelCanvas, fCtx] = makeCanvas(256);
  fCtx.fillStyle = '#FFFFFF';
  fCtx.fillRect(0, 0, 256, 256);
  fCtx.fillStyle = 'rgba(30, 30, 42, 0.34)';
  fCtx.fillRect(0, 24, 256, 28);
  fCtx.fillRect(0, 148, 256, 28);
  fCtx.fillRect(24, 0, 28, 256);
  fCtx.fillRect(148, 0, 28, 256);
  fCtx.fillStyle = 'rgba(255, 255, 255, 0.45)';
  fCtx.fillRect(0, 92, 256, 8);
  fCtx.fillRect(92, 0, 8, 256);
  fCtx.fillStyle = 'rgba(20, 20, 28, 0.55)';
  fCtx.fillRect(0, 212, 256, 6);
  fCtx.fillRect(212, 0, 6, 256);
  const flannelPattern = new THREE.CanvasTexture(flannelCanvas);
  flannelPattern.colorSpace = THREE.SRGBColorSpace;
  flannelPattern.wrapS = THREE.RepeatWrapping;
  flannelPattern.wrapT = THREE.RepeatWrapping;
  flannelPattern.repeat.set(3, 3);
  flannelPattern.anisotropy = aniso;

  // 5. Hair Strand Fine Flow Bump Map (Linear)
  const [hairCanvas, hCtx] = makeCanvas(256);
  hCtx.fillStyle = '#888888';
  hCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 3) {
    const shade = 100 + ((x * 37) % 120);
    hCtx.fillStyle = `rgb(${shade},${shade},${shade})`;
    hCtx.fillRect(x, 0, 2, 256);
  }
  const hairBump = new THREE.CanvasTexture(hairCanvas);
  hairBump.wrapS = THREE.RepeatWrapping;
  hairBump.wrapT = THREE.RepeatWrapping;
  hairBump.repeat.set(4, 2);
  hairBump.anisotropy = aniso;

  // 6. Soft Radial Contact Shadow for grounded studio footing
  const [shadowCanvas, sCtx] = makeCanvas(256);
  const rad = sCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
  rad.addColorStop(0, 'rgba(20, 16, 28, 0.42)');
  rad.addColorStop(0.55, 'rgba(20, 16, 28, 0.16)');
  rad.addColorStop(1, 'rgba(20, 16, 28, 0.0)');
  sCtx.fillStyle = rad;
  sCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  return {
    denimColorOverlay,
    denimBump,
    knitBump,
    flannelPattern,
    hairBump,
    contactShadow,
    dispose: () => {
      denimColorOverlay.dispose();
      denimBump.dispose();
      knitBump.dispose();
      flannelPattern.dispose();
      hairBump.dispose();
      contactShadow.dispose();
    },
  };
}
