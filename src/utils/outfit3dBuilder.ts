import * as THREE from 'three';
import type { CharacterOutfit, FaceShapeId, OutfitGender } from '../types/outfit';
import type { ProceduralTexturePack } from './outfitTextures';

export interface CharacterRig {
  root: THREE.Group;
  gender: OutfitGender;
  torsoGroup: THREE.Group;
  headGroup: THREE.Group;
  leftArmGroup: THREE.Group;
  rightArmGroup: THREE.Group;
  leftLegGroup: THREE.Group;
  rightLegGroup: THREE.Group;
  eyeLeftGroup: THREE.Group;
  eyeRightGroup: THREE.Group;
  baseHeightOffset: number;
}

function makeLathe(
  points: Array<[number, number]>,
  segments = 28,
  phiStart = 0,
  phiLength = Math.PI * 2
): THREE.LatheGeometry {
  const vecs = points.map(([r, y]) => new THREE.Vector2(Math.max(0.0001, r), y));
  const geo = new THREE.LatheGeometry(vecs, segments, phiStart, phiLength);
  geo.computeVertexNormals();
  return geo;
}

function makeSculptedHeadGeometry(faceShape: FaceShapeId): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.132, 36, 28);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // Elongate skull slightly front-to-back, gentle vertical oval
    v.z *= 1.06;
    v.y *= 1.12;

    // Normalize vertical factor (-1 chin to +1 crown)
    const ny = v.y / (0.132 * 1.12);

    if (faceShape === 'sharp') {
      if (ny < 0) {
        const taper = 1 - Math.abs(ny) * 0.28;
        v.x *= taper;
        v.z *= 1 - Math.abs(ny) * 0.14;
      }
      v.y *= 1.03;
    } else if (faceShape === 'round') {
      v.x *= 1.07;
      v.y *= 0.94;
      if (ny < -0.2) {
        v.x *= 1 + (ny + 0.2) * 0.12;
      }
    } else if (faceShape === 'chubby') {
      v.x *= 1.08;
      if (ny < 0.05 && ny > -0.75) {
        // Fuller lower cheeks
        v.x *= 1.09;
        if (v.z > 0) v.z *= 1.07;
      }
    } else {
      // oval
      if (ny < -0.15) {
        v.x *= 1 - Math.abs(ny + 0.15) * 0.16;
      }
    }

    // Subtle brow & cheekbone contour on front face
    if (v.z > 0.06 && ny > -0.25 && ny < 0.35) {
      v.z *= 0.97;
    }

    pos.setXYZ(i, v.x, v.y, v.z);
  }

  geo.computeVertexNormals();
  return geo;
}

function createBodyLimbGeometry(
  topR: number,
  midR: number,
  botR: number,
  length: number
): THREE.LatheGeometry {
  return makeLathe(
    [
      [0.001, 0],
      [botR * 0.88, 0.015],
      [botR, length * 0.12],
      [midR, length * 0.52],
      [topR * 0.94, length * 0.88],
      [topR, length * 0.97],
      [0.001, length],
    ],
    22
  );
}

function setShadowFlags(obj: THREE.Object3D, cast = true, receive = true): void {
  obj.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
}

export function disposeObject3D(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();

  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.geometry) geometries.add(mesh.geometry);
    if (mesh.material) {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => materials.add(m));
      } else {
        materials.add(mesh.material);
      }
    }
  });

  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => m.dispose());
}

export function buildCharacterRig(
  gender: OutfitGender,
  outfit: CharacterOutfit,
  textures: ProceduralTexturePack,
  isSoftwareGl: boolean
): CharacterRig {
  const isFemale = gender === 'female';
  const hasHijab = outfit.hijabStyle !== 'none';

  const root = new THREE.Group();
  root.userData.gender = gender;

  // Height & silhouette proportions
  const hipR = isFemale ? 0.132 : 0.126;
  const waistR = isFemale ? 0.095 : 0.118;
  const chestR = isFemale ? 0.124 : 0.142;
  const shoulderHalf = isFemale ? 0.156 : 0.184;
  const torsoScaleX = 1.14;
  const torsoScaleZ = 0.78;

  // --- Shared Calibrated PBR Materials ---
  const skinMat = new THREE.MeshPhysicalMaterial({
    color: outfit.skinTone,
    roughness: 0.58,
    metalness: 0.0,
    sheen: 0.28,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color('#FFB6C1'),
    clearcoat: 0.05,
  });

  const innerBaseMat = new THREE.MeshStandardMaterial({
    color: '#292938',
    roughness: 0.85,
    metalness: 0.02,
  });

  const hairMat = new THREE.MeshPhysicalMaterial({
    color: outfit.hairColor,
    roughness: 0.36,
    metalness: 0.06,
    bumpMap: textures.hairBump,
    bumpScale: 0.008,
    clearcoat: 0.25,
    clearcoatRoughness: 0.42,
  });

  const hijabMat = new THREE.MeshPhysicalMaterial({
    color: outfit.hijabColor,
    roughness: 0.68,
    metalness: 0.0,
    sheen: 0.85,
    sheenRoughness: 0.5,
    sheenColor: new THREE.Color(outfit.hijabColor).lerp(new THREE.Color('#FFFFFF'), 0.45),
    side: THREE.DoubleSide,
  });

  const goldMat = new THREE.MeshStandardMaterial({
    color: '#F5D06B',
    roughness: 0.18,
    metalness: 0.92,
  });

  const roseMetalMat = new THREE.MeshStandardMaterial({
    color: '#F472B6',
    roughness: 0.2,
    metalness: 0.82,
  });

  const darkOutlineMat = new THREE.MeshStandardMaterial({
    color: '#1A1624',
    roughness: 0.45,
    metalness: 0.05,
  });

  // --- Ground Contact Shadow ---
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.68, 0.68),
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.72,
    })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.003;
  root.add(shadowPlane);

  // --- Articulated Lower Body (Hips & Legs at y = 0.79) ---
  const hipPivotY = 0.80;
  const legSepX = isFemale ? 0.072 : 0.078;

  const leftLegGroup = new THREE.Group();
  leftLegGroup.position.set(-legSepX, hipPivotY, 0);
  const rightLegGroup = new THREE.Group();
  rightLegGroup.position.set(legSepX, hipPivotY, 0);

  const buildLeg = (legGroup: THREE.Group, isLeft: boolean) => {
    // Upper thigh + calf sculpted down from y=0 (hip) to y=-0.73 (ankle)
    const legGeo = makeLathe(
      [
        [0.001, -0.735],
        [0.033, -0.72], // ankle
        [0.044, -0.58],
        [0.052, -0.46], // calf muscle
        [0.045, -0.35], // knee
        [0.058, -0.20], // mid thigh
        [0.068, -0.05], // upper thigh
        [0.064, 0.02],
        [0.001, 0.03],
      ],
      22
    );
    const legMesh = new THREE.Mesh(legGeo, skinMat);
    legMesh.userData.gender = gender;
    legGroup.add(legMesh);

    // Pants / Skirt Leg Covering
    if (outfit.pantsStyle !== 'none' && outfit.pantsStyle !== 'pleated_skirt') {
      const isDenim = outfit.pantsStyle === 'jeans';
      const isCargo = outfit.pantsStyle === 'cargo';
      const isCulottes = outfit.pantsStyle === 'culottes';
      const isShorts = outfit.pantsStyle === 'shorts';
      const pantMat = new THREE.MeshPhysicalMaterial({
        color: outfit.pantsColor,
        map: isDenim ? textures.denimColorOverlay : null,
        bumpMap: isDenim ? textures.denimBump : null,
        bumpScale: isDenim ? 0.01 : 0,
        roughness: isDenim ? 0.88 : 0.74,
        metalness: 0.02,
        sheen: isDenim ? 0.25 : 0.5,
      });

      const bottomY = isShorts ? -0.24 : -0.705;
      const flare = isCulottes ? 0.088 : isCargo ? 0.066 : 0.052;
      const thighFlare = isCulottes ? 0.082 : isCargo ? 0.078 : 0.075;

      const pantLegGeo = makeLathe(
        [
          [0.001, bottomY],
          [flare * 0.96, bottomY + 0.01],
          [flare, bottomY + 0.05],
          [isShorts ? thighFlare : 0.058, -0.35],
          [thighFlare, -0.04],
          [0.073, 0.03],
          [0.001, 0.04],
        ],
        22
      );
      const pantLeg = new THREE.Mesh(pantLegGeo, pantMat);
      pantLeg.userData.gender = gender;
      legGroup.add(pantLeg);

      // Cargo 3D side utility pocket
      if (isCargo) {
        const pocket = new THREE.Mesh(
          new THREE.BoxGeometry(0.028, 0.095, 0.075),
          pantMat
        );
        pocket.position.set(isLeft ? -0.066 : 0.066, -0.24, 0.006);
        pocket.rotation.z = isLeft ? 0.06 : -0.06;
        legGroup.add(pocket);
      }
    }

    // Footwear or Bare Anatomical Foot (at y = -0.73 down to -0.80 = ground 0.0)
    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.735, 0.018);

    if (outfit.shoesStyle === 'none') {
      const bareFootGeo = new THREE.SphereGeometry(0.044, 18, 14);
      bareFootGeo.scale(0.86, 0.65, 1.65);
      const foot = new THREE.Mesh(bareFootGeo, skinMat);
      foot.position.set(0, -0.032, 0.022);
      footGroup.add(foot);
    } else {
      const shoeMat = new THREE.MeshPhysicalMaterial({
        color: outfit.shoesColor,
        roughness: outfit.shoesStyle === 'loafers' || outfit.shoesStyle === 'maryjane' ? 0.28 : 0.56,
        metalness: 0.05,
        clearcoat: outfit.shoesStyle === 'loafers' || outfit.shoesStyle === 'maryjane' ? 0.5 : 0.1,
      });
      const soleMat = new THREE.MeshStandardMaterial({
        color: outfit.shoesStyle === 'sneakers' ? '#F8FAFC' : '#1E1B24',
        roughness: 0.85,
      });

      if (outfit.shoesStyle === 'slippers') {
        const sole = new THREE.Mesh(new THREE.BoxGeometry(0.082, 0.022, 0.165), soleMat);
        sole.position.set(0, -0.052, 0.024);
        const strap = new THREE.Mesh(
          new THREE.TorusGeometry(0.042, 0.015, 10, 20, Math.PI),
          shoeMat
        );
        strap.position.set(0, -0.042, 0.035);
        strap.rotation.y = Math.PI / 2;
        footGroup.add(sole, strap);
      } else {
        // Sculpted Rubber Outsole
        const soleGeo = new THREE.CapsuleGeometry(0.041, 0.088, 8, 16);
        soleGeo.rotateX(Math.PI / 2);
        soleGeo.scale(1.0, 0.52, 1.0);
        const sole = new THREE.Mesh(soleGeo, soleMat);
        sole.position.set(0, -0.046, 0.024);
        footGroup.add(sole);

        // Upper Shoe Shell
        const upperGeo = new THREE.SphereGeometry(0.046, 20, 14);
        upperGeo.scale(0.92, 0.86, 1.62);
        const upper = new THREE.Mesh(upperGeo, shoeMat);
        upper.position.set(0, -0.024, 0.022);
        footGroup.add(upper);

        // Collar / Ankle Boot Shaft
        if (outfit.shoesStyle === 'boots') {
          const shaft = new THREE.Mesh(
            makeLathe(
              [
                [0.042, -0.02],
                [0.047, 0.09],
                [0.051, 0.155],
                [0.043, 0.155],
              ],
              20
            ),
            shoeMat
          );
          shaft.position.set(0, 0, -0.014);
          footGroup.add(shaft);
        } else if (outfit.shoesStyle === 'maryjane') {
          const mjStrap = new THREE.Mesh(
            new THREE.TorusGeometry(0.039, 0.008, 8, 20, Math.PI),
            shoeMat
          );
          mjStrap.position.set(0, -0.008, 0.015);
          const buckle = new THREE.Mesh(new THREE.SphereGeometry(0.008, 10, 10), goldMat);
          buckle.position.set(isLeft ? -0.038 : 0.038, -0.008, 0.015);
          footGroup.add(mjStrap, buckle);
        } else if (outfit.shoesStyle === 'sneakers') {
          // Crisp sneaker laces & tongue detail
          const tongue = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.034, 0.025), shoeMat);
          tongue.position.set(0, 0.004, 0.024);
          tongue.rotation.x = -0.38;
          footGroup.add(tongue);
          for (let l = 0; l < 3; l++) {
            const lace = new THREE.Mesh(
              new THREE.CapsuleGeometry(0.0035, 0.034, 4, 8),
              soleMat
            );
            lace.rotation.z = Math.PI / 2;
            lace.position.set(0, -0.005 + l * 0.008, 0.048 - l * 0.012);
            footGroup.add(lace);
          }
        } else {
          // Loafers penny saddle
          const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.012, 0.034), goldMat);
          saddle.position.set(0, 0.002, 0.03);
          footGroup.add(saddle);
        }
      }
    }
    legGroup.add(footGroup);
  };

  buildLeg(leftLegGroup, true);
  buildLeg(rightLegGroup, false);
  root.add(leftLegGroup, rightLegGroup);

  // --- Torso Group (pivots from pelvis at y = 0.78) ---
  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.78, 0);
  root.add(torsoGroup);

  // Pelvis + Waist + Chest Lathe Body (local y = -0.04 .. 0.60 -> world y = 0.74 .. 1.38)
  const torsoProfile: Array<[number, number]> = [
    [0.001, -0.05],
    [hipR * 0.76, -0.03],
    [hipR, 0.05],
    [hipR * 0.94, 0.14],
    [waistR, 0.25],
    [chestR * 0.96, 0.39],
    [chestR, 0.48],
    [shoulderHalf * 0.76, 0.56],
    [0.048, 0.61],
    [0.001, 0.62],
  ];
  const torsoMesh = new THREE.Mesh(makeLathe(torsoProfile, 28), skinMat);
  torsoMesh.scale.set(torsoScaleX, 1, torsoScaleZ);
  torsoMesh.userData.gender = gender;
  torsoGroup.add(torsoMesh);

  // Sculpted Neck
  const neckGeo = makeLathe(
    [
      [0.056, 0.57],
      [0.045, 0.64],
      [0.044, 0.70],
      [0.001, 0.71],
    ],
    22
  );
  const neckMesh = new THREE.Mesh(neckGeo, skinMat);
  torsoGroup.add(neckMesh);

  // Modest Studio Innerwear Shorts (always present at pelvis; covered when wearing pants/skirt)
  if (outfit.pantsStyle === 'none') {
    const innerShortsGeo = makeLathe(
      [
        [0.001, -0.06],
        [hipR * 1.05, -0.04],
        [hipR * 1.06, 0.08],
        [waistR * 1.04, 0.17],
        [0.001, 0.18],
      ],
      24
    );
    const innerShorts = new THREE.Mesh(innerShortsGeo, innerBaseMat);
    innerShorts.scale.set(torsoScaleX * 1.02, 1, torsoScaleZ * 1.04);
    torsoGroup.add(innerShorts);
  } else if (outfit.pantsStyle === 'pleated_skirt') {
    const skirtMat = new THREE.MeshPhysicalMaterial({
      color: outfit.pantsColor,
      roughness: 0.72,
      sheen: 0.55,
      side: THREE.DoubleSide,
    });
    // Waistband
    const waistband = new THREE.Mesh(
      makeLathe(
        [
          [waistR * 1.04, 0.14],
          [waistR * 1.08, 0.21],
          [waistR * 1.02, 0.21],
        ],
        28
      ),
      skirtMat
    );
    waistband.scale.set(torsoScaleX * 1.04, 1, torsoScaleZ * 1.06);
    torsoGroup.add(waistband);

    // Fluted Pleated Skirt Body
    const skirtGeo = new THREE.CylinderGeometry(
      waistR * 1.05,
      hipR * 1.56,
      0.38,
      28,
      1,
      false
    );
    const sPos = skirtGeo.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      const x = sPos.getX(i);
      const y = sPos.getY(i);
      const z = sPos.getZ(i);
      const angle = Math.atan2(z, x);
      const pleat = y < 0.05 ? Math.sin(angle * 14) * 0.014 : 0;
      const r = Math.hypot(x, z);
      if (r > 0.001) {
        sPos.setX(i, (x / r) * (r + pleat));
        sPos.setZ(i, (z / r) * (r + pleat));
      }
    }
    skirtGeo.computeVertexNormals();
    const skirtMesh = new THREE.Mesh(skirtGeo, skirtMat);
    skirtMesh.scale.set(torsoScaleX * 1.02, 1, torsoScaleZ * 1.06);
    skirtMesh.position.y = -0.01;
    torsoGroup.add(skirtMesh);
  } else {
    // Waistband & pelvis bridge of pants
    const isDenim = outfit.pantsStyle === 'jeans';
    const pantTopMat = new THREE.MeshPhysicalMaterial({
      color: outfit.pantsColor,
      map: isDenim ? textures.denimColorOverlay : null,
      bumpMap: isDenim ? textures.denimBump : null,
      bumpScale: isDenim ? 0.01 : 0,
      roughness: isDenim ? 0.88 : 0.74,
      sheen: 0.35,
    });
    const pelvisGeo = makeLathe(
      [
        [0.001, -0.04],
        [hipR * 1.06, -0.01],
        [hipR * 1.07, 0.09],
        [waistR * 1.08, 0.21],
        [0.001, 0.22],
      ],
      26
    );
    const pelvisMesh = new THREE.Mesh(pelvisGeo, pantTopMat);
    pelvisMesh.scale.set(torsoScaleX * 1.03, 1, torsoScaleZ * 1.05);
    torsoGroup.add(pelvisMesh);

    if (isDenim) {
      // Belt & metallic buckle accent
      const belt = new THREE.Mesh(
        new THREE.TorusGeometry(waistR * 1.09, 0.013, 10, 28),
        darkOutlineMat
      );
      belt.rotation.x = Math.PI / 2;
      belt.scale.set(torsoScaleX * 1.04, torsoScaleZ * 1.08, 1);
      belt.position.y = 0.20;
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.026, 0.014), goldMat);
      buckle.position.set(0, 0.20, waistR * torsoScaleZ * 1.15);
      torsoGroup.add(belt, buckle);
    }
  }

  // --- Top Clothing Layer 1: Modest Innerwear or Baju ---
  if (outfit.shirtStyle === 'none') {
    const innerTop = new THREE.Mesh(
      makeLathe(
        [
          [0.001, 0.16],
          [waistR * 1.02, 0.18],
          [chestR * 1.03, 0.48],
          [chestR * 0.75, 0.55],
          [0.001, 0.56],
        ],
        24
      ),
      innerBaseMat
    );
    innerTop.scale.set(torsoScaleX * 1.01, 1, torsoScaleZ * 1.02);
    torsoGroup.add(innerTop);
  } else {
    const isTurtleneck = outfit.shirtStyle === 'turtleneck';
    const isOversize = outfit.shirtStyle === 'oversize';
    const shirtMat = new THREE.MeshPhysicalMaterial({
      color: outfit.shirtColor,
      bumpMap: isTurtleneck ? textures.knitBump : null,
      bumpScale: isTurtleneck ? 0.01 : 0,
      roughness: 0.78,
      sheen: 0.55,
      sheenRoughness: 0.6,
    });
    const extra = isOversize ? 0.022 : 0.011;
    const hemY = isOversize ? 0.10 : 0.16;
    const shirtMesh = new THREE.Mesh(
      makeLathe(
        [
          [0.001, hemY],
          [hipR * (isOversize ? 1.06 : 0.96), hemY + 0.01],
          [waistR + extra * 1.2, 0.25],
          [chestR + extra, 0.48],
          [shoulderHalf * 0.8 + extra, 0.565],
          [0.056, 0.60],
          [0.001, 0.605],
        ],
        26
      ),
      shirtMat
    );
    shirtMesh.scale.set(torsoScaleX * 1.02, 1, torsoScaleZ * 1.03);
    torsoGroup.add(shirtMesh);

    if (isTurtleneck) {
      const collarRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.054, 0.058, 0.068, 22),
        shirtMat
      );
      collarRing.position.y = 0.63;
      torsoGroup.add(collarRing);
    } else if (outfit.shirtStyle === 'polo') {
      const poloCollar = new THREE.Mesh(
        new THREE.TorusGeometry(0.058, 0.014, 10, 22),
        shirtMat
      );
      poloCollar.rotation.x = Math.PI / 2 + 0.15;
      poloCollar.position.set(0, 0.59, 0.006);
      torsoGroup.add(poloCollar);
    } else if (outfit.shirtStyle === 'blouse') {
      const bowNeck = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.012, 10, 22), shirtMat);
      bowNeck.rotation.x = Math.PI / 2 + 0.18;
      bowNeck.position.set(0, 0.578, 0.008);
      torsoGroup.add(bowNeck);
    }
  }

  // --- Top Clothing Layer 2: Kemeja ---
  if (outfit.kemejaStyle !== 'none') {
    const isFlannel = outfit.kemejaStyle === 'flannel';
    const isOpen = outfit.kemejaStyle === 'open';
    const kemejaMat = new THREE.MeshPhysicalMaterial({
      color: outfit.kemejaColor,
      map: isFlannel ? textures.flannelPattern : null,
      roughness: 0.72,
      sheen: 0.45,
      side: THREE.DoubleSide,
    });

    if (isOpen) {
      // Open back + two front lapel sides leaving center shirt visible!
      const openShell = new THREE.Mesh(
        makeLathe(
          [
            [waistR + 0.025, 0.14],
            [chestR + 0.024, 0.48],
            [shoulderHalf * 0.8 + 0.022, 0.57],
            [0.06, 0.60],
          ],
          24,
          Math.PI * 0.66,
          Math.PI * 1.68
        ),
        kemejaMat
      );
      openShell.scale.set(torsoScaleX * 1.03, 1, torsoScaleZ * 1.04);
      torsoGroup.add(openShell);
    } else {
      const kemejaMesh = new THREE.Mesh(
        makeLathe(
          [
            [0.001, 0.14],
            [waistR + 0.024, 0.16],
            [waistR + 0.022, 0.25],
            [chestR + 0.024, 0.48],
            [shoulderHalf * 0.8 + 0.02, 0.57],
            [0.059, 0.60],
            [0.001, 0.605],
          ],
          26
        ),
        kemejaMat
      );
      kemejaMesh.scale.set(torsoScaleX * 1.03, 1, torsoScaleZ * 1.04);
      torsoGroup.add(kemejaMesh);

      // Pearl shirt buttons
      const buttonMat = new THREE.MeshStandardMaterial({
        color: '#FFFFFF',
        roughness: 0.22,
        metalness: 0.15,
      });
      for (let b = 0; b < 4; b++) {
        const btn = new THREE.Mesh(new THREE.SphereGeometry(0.007, 10, 10), buttonMat);
        btn.position.set(0, 0.24 + b * 0.085, (chestR + 0.027) * torsoScaleZ);
        torsoGroup.add(btn);
      }
    }

    // Crisp Folded Shirt Collar Flaps
    for (const side of [-1, 1]) {
      const flap = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.032, 0.02), kemejaMat);
      flap.position.set(side * 0.042, 0.59, 0.042);
      flap.rotation.set(0.55, side * -0.35, side * 0.35);
      torsoGroup.add(flap);
    }
  }

  // --- Top Clothing Layer 3: Cardigan / Vest / Zip Hoodie ---
  if (outfit.cardiganStyle !== 'none') {
    const isHoodie = outfit.cardiganStyle === 'zip_hoodie';
    const isLong = outfit.cardiganStyle === 'long_cardigan';
    const isVest = outfit.cardiganStyle === 'vest';
    const cardiMat = new THREE.MeshPhysicalMaterial({
      color: outfit.cardiganColor,
      bumpMap: !isHoodie ? textures.knitBump : null,
      bumpScale: !isHoodie ? 0.014 : 0,
      roughness: isHoodie ? 0.82 : 0.88,
      sheen: 0.85,
      sheenRoughness: 0.65,
      side: THREE.DoubleSide,
    });

    const bottomHem = isLong ? -0.14 : 0.13;
    if (isHoodie || isVest) {
      const outerMesh = new THREE.Mesh(
        makeLathe(
          [
            [0.001, bottomHem],
            [waistR + 0.036, bottomHem + 0.02],
            [chestR + 0.035, 0.48],
            [shoulderHalf * 0.78 + 0.03, 0.57],
            [0.064, 0.60],
            [0.001, 0.605],
          ],
          26
        ),
        cardiMat
      );
      outerMesh.scale.set(torsoScaleX * 1.04, 1, torsoScaleZ * 1.06);
      torsoGroup.add(outerMesh);

      if (isHoodie) {
        // Metallic zipper strip + resting hood at back of neck
        const zipper = new THREE.Mesh(
          new THREE.BoxGeometry(0.012, 0.40, 0.012),
          goldMat
        );
        zipper.position.set(0, 0.36, (chestR + 0.036) * torsoScaleZ * 1.04);
        const hood = new THREE.Mesh(
          new THREE.TorusGeometry(0.082, 0.032, 12, 22, Math.PI * 1.25),
          cardiMat
        );
        hood.position.set(0, 0.585, -0.055);
        hood.rotation.set(0.85, 0, Math.PI * 0.87);
        torsoGroup.add(zipper, hood);
      }
    } else {
      // Open cardigan leaving front open!
      const openCardi = new THREE.Mesh(
        makeLathe(
          [
            [hipR + 0.038, bottomHem],
            [waistR + 0.035, 0.25],
            [chestR + 0.035, 0.48],
            [shoulderHalf * 0.78 + 0.03, 0.57],
            [0.064, 0.60],
          ],
          24,
          Math.PI * 0.68,
          Math.PI * 1.64
        ),
        cardiMat
      );
      openCardi.scale.set(torsoScaleX * 1.04, 1, torsoScaleZ * 1.06);
      torsoGroup.add(openCardi);
    }
  }

  // --- Torso Accessories: Necklace & Crossbody Bag ---
  const accSet = new Set(outfit.accessories);
  if (accSet.has('necklace')) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.0055, 10, 26), goldMat);
    chain.rotation.x = Math.PI / 2 + 0.32;
    chain.position.set(0, 0.568, 0.022);
    const pendant = new THREE.Mesh(new THREE.OctahedronGeometry(0.014, 0), roseMetalMat);
    pendant.position.set(0, 0.525, 0.088);
    torsoGroup.add(chain, pendant);
  }

  if (accSet.has('bag')) {
    const strapMat = darkOutlineMat;
    const bagMat = new THREE.MeshPhysicalMaterial({
      color: '#F472B6',
      roughness: 0.36,
      metalness: 0.08,
      clearcoat: 0.28,
    });
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.085, 0.58, 0.02),
      new THREE.Vector3(0.02, 0.36, chestR * torsoScaleZ + 0.035),
      new THREE.Vector3(hipR * torsoScaleX + 0.04, 0.08, 0.03),
      new THREE.Vector3(0.01, 0.34, -(chestR * torsoScaleZ + 0.035)),
      new THREE.Vector3(-0.085, 0.58, -0.02),
    ]);
    const strap = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.009, 8, true), strapMat);
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.115, 0.125), bagMat);
    pouch.position.set(hipR * torsoScaleX + 0.055, 0.06, 0.025);
    pouch.rotation.z = -0.14;
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.018, 0.022), goldMat);
    clasp.position.set(hipR * torsoScaleX + 0.086, 0.065, 0.025);
    torsoGroup.add(strap, pouch, clasp);
  }

  // --- Articulated Arms + Sleeves + Watch ---
  const leftArmGroup = new THREE.Group();
  leftArmGroup.position.set(-(shoulderHalf * torsoScaleX * 0.94), 0.54, 0);
  const rightArmGroup = new THREE.Group();
  rightArmGroup.position.set(shoulderHalf * torsoScaleX * 0.94, 0.54, 0);

  const buildArm = (armGroup: THREE.Group, isLeft: boolean) => {
    const dir = isLeft ? -1 : 1;
    // Upper arm + forearm down to y = -0.46
    const armMesh = new THREE.Mesh(
      createBodyLimbGeometry(0.044, 0.038, 0.029, 0.45),
      skinMat
    );
    armMesh.position.set(dir * 0.018, -0.45, 0);
    armMesh.rotation.z = dir * 0.05;
    armGroup.add(armMesh);

    // Sculpted Hand + Thumb
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.034, 16, 14), skinMat);
    hand.scale.set(0.76, 1.25, 0.62);
    hand.position.set(dir * 0.028, -0.48, 0.008);
    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.009, 0.024, 4, 8), skinMat);
    thumb.position.set(dir * 0.012, -0.47, 0.026);
    thumb.rotation.x = 0.5;
    armGroup.add(hand, thumb);

    // Determine sleeve outer layer priority: cardigan (unless vest) > kemeja > baju
    const cardiHasSleeves =
      outfit.cardiganStyle !== 'none' && outfit.cardiganStyle !== 'vest';
    const kemejaShort = outfit.kemejaStyle === 'short_sleeve';
    const bajuLong =
      outfit.shirtStyle === 'oversize' ||
      outfit.shirtStyle === 'blouse' ||
      outfit.shirtStyle === 'turtleneck';

    const addSleeve = (
      colorHex: string,
      isLong: boolean,
      radiusOffset: number,
      bump: THREE.Texture | null,
      mapTex: THREE.Texture | null
    ) => {
      const len = isLong ? 0.41 : 0.18;
      const sleeveGeo = createBodyLimbGeometry(
        0.048 + radiusOffset,
        0.043 + radiusOffset,
        (isLong ? 0.035 : 0.043) + radiusOffset,
        len
      );
      const sMat = new THREE.MeshPhysicalMaterial({
        color: colorHex,
        map: mapTex,
        bumpMap: bump,
        bumpScale: bump ? 0.01 : 0,
        roughness: 0.78,
        sheen: 0.55,
      });
      const sleeve = new THREE.Mesh(sleeveGeo, sMat);
      sleeve.position.set(dir * 0.018, -len - 0.01, 0);
      sleeve.rotation.z = dir * 0.05;
      armGroup.add(sleeve);
    };

    if (outfit.shirtStyle !== 'none') {
      addSleeve(
        outfit.shirtColor,
        bajuLong,
        0.004,
        outfit.shirtStyle === 'turtleneck' ? textures.knitBump : null,
        null
      );
    }
    if (outfit.kemejaStyle !== 'none') {
      addSleeve(
        outfit.kemejaColor,
        !kemejaShort,
        0.009,
        null,
        outfit.kemejaStyle === 'flannel' ? textures.flannelPattern : null
      );
    }
    if (cardiHasSleeves) {
      addSleeve(
        outfit.cardiganColor,
        true,
        0.014,
        outfit.cardiganStyle !== 'zip_hoodie' ? textures.knitBump : null,
        null
      );
    }

    // Watch on left wrist
    if (isLeft && accSet.has('watch')) {
      const watchBand = new THREE.Mesh(
        new THREE.TorusGeometry(0.034, 0.007, 8, 18),
        roseMetalMat
      );
      watchBand.rotation.x = Math.PI / 2;
      watchBand.position.set(dir * 0.027, -0.415, 0);
      const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.008, 16), goldMat);
      dial.rotation.z = Math.PI / 2;
      dial.position.set(-0.06, -0.415, 0.006);
      armGroup.add(watchBand, dial);
    }
  };

  buildArm(leftArmGroup, true);
  buildArm(rightArmGroup, false);
  torsoGroup.add(leftArmGroup, rightArmGroup);

  // --- Sculpted Head & Facial Rig (local y = 0.70 above pelvis -> world y ~ 1.48) ---
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 0.70, 0);
  torsoGroup.add(headGroup);

  const headCenterY = 0.14;
  const headGeo = makeSculptedHeadGeometry(outfit.faceShape);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = headCenterY;
  headMesh.userData.gender = gender;
  headGroup.add(headMesh);

  // Cheek Blush Decals
  if (accSet.has('blush')) {
    const blushMat = new THREE.MeshBasicMaterial({
      color: '#FB7185',
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    for (const side of [-1, 1]) {
      const blush = new THREE.Mesh(new THREE.SphereGeometry(0.025, 14, 10), blushMat);
      blush.scale.set(1.2, 0.72, 0.3);
      blush.position.set(side * 0.066, headCenterY - 0.022, 0.114);
      blush.rotation.y = side * 0.36;
      headGroup.add(blush);
    }
  }

  // Ears
  if (!hasHijab && outfit.ears !== 'hidden') {
    const earScale = outfit.ears === 'small' ? 0.76 : 1.0;
    const earX = outfit.faceShape === 'round' || outfit.faceShape === 'chubby' ? 0.136 : 0.128;
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 14), skinMat);
      ear.scale.set(0.45 * earScale, 1.08 * earScale, 0.72 * earScale);
      ear.position.set(side * earX, headCenterY - 0.005, -0.008);
      headGroup.add(ear);

      if (outfit.ears === 'pierced') {
        const stud = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 12), roseMetalMat);
        stud.position.set(side * (earX + 0.004), headCenterY - 0.028, -0.004);
        headGroup.add(stud);
      }
    }
  }

  // Eyes (with glossy clearcoat cornea catchlights & articulated blink groups!)
  const eyeLeftGroup = new THREE.Group();
  const eyeRightGroup = new THREE.Group();
  eyeLeftGroup.position.set(-0.044, headCenterY + 0.006, 0.124);
  eyeRightGroup.position.set(0.044, headCenterY + 0.006, 0.124);

  const scleraMat = new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.25 });
  const irisMat = new THREE.MeshPhysicalMaterial({
    color: '#2A1B2E',
    roughness: 0.08,
    metalness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: outfit.hairColor,
    roughness: 0.65,
  });

  const buildEye = (eg: THREE.Group, side: -1 | 1) => {
    const isHappyArc = outfit.eyes === 'happy' || (outfit.eyes === 'wink' && side === 1);
    const isWide = outfit.eyes === 'wide';
    const isCool = outfit.eyes === 'cool';

    // Eyebrow arch
    const brow = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.0042, 0.028, 4, 8),
      browMat
    );
    brow.rotation.z = Math.PI / 2 + (isCool ? side * -0.14 : side * 0.06);
    brow.position.set(0, 0.032, 0.004);
    eg.add(brow);

    if (isHappyArc) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(0.017, 0.0038, 8, 16, Math.PI),
        darkOutlineMat
      );
      arc.position.set(0, -0.004, 0.008);
      eg.add(arc);
      return;
    }

    const eyeH = isCool ? 0.68 : isWide ? 1.18 : 1.0;
    const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 14), scleraMat);
    sclera.scale.set(1.05, eyeH, 0.48);
    eg.add(sclera);

    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 16, 14), irisMat);
    iris.scale.set(1.0, eyeH, 0.52);
    iris.position.set(0, 0, 0.005);
    eg.add(iris);

    const catchlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.0038, 10, 10),
      new THREE.MeshBasicMaterial({ color: '#FFFFFF' })
    );
    catchlight.position.set(-0.0045, 0.0055, 0.0115);
    eg.add(catchlight);

    // Upper Eyelid / Lash Curve
    const lash = new THREE.Mesh(
      new THREE.TorusGeometry(0.0185, 0.0032, 8, 16, Math.PI),
      darkOutlineMat
    );
    lash.position.set(0, 0.002 * eyeH, 0.006);
    eg.add(lash);
  };

  buildEye(eyeLeftGroup, -1);
  buildEye(eyeRightGroup, 1);
  headGroup.add(eyeLeftGroup, eyeRightGroup);

  // Nose
  const noseMesh = (() => {
    const noseMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(outfit.skinTone).lerp(new THREE.Color('#D99B82'), 0.18),
      roughness: 0.55,
    });
    if (outfit.nose === 'slim') {
      const m = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.032, 14), noseMat);
      m.rotation.x = Math.PI / 2 - 0.35;
      m.position.set(0, headCenterY - 0.016, 0.142);
      return m;
    }
    if (outfit.nose === 'line') {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.005, 0.022, 6, 10), noseMat);
      m.position.set(0, headCenterY - 0.015, 0.137);
      return m;
    }
    const m = new THREE.Mesh(new THREE.SphereGeometry(outfit.nose === 'button' ? 0.012 : 0.01, 14, 12), noseMat);
    m.scale.set(1.05, 0.85, 0.95);
    m.position.set(0, headCenterY - 0.018, 0.139);
    return m;
  })();
  headGroup.add(noseMesh);

  // Mouth
  const lipMat = new THREE.MeshPhysicalMaterial({
    color: isFemale ? '#E06C88' : '#C87E78',
    roughness: 0.42,
    clearcoat: 0.2,
  });
  const mouthGroup = new THREE.Group();
  mouthGroup.position.set(0, headCenterY - 0.056, 0.128);
  if (outfit.mouth === 'o_cute') {
    const oLip = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0042, 10, 18), lipMat);
    const inner = new THREE.Mesh(new THREE.SphereGeometry(0.009, 12, 10), darkOutlineMat);
    inner.scale.set(1, 1, 0.4);
    mouthGroup.add(oLip, inner);
  } else if (outfit.mouth === 'grin') {
    const teeth = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 12, 0, Math.PI * 2, Math.PI * 0.4, Math.PI * 0.45),
      scleraMat
    );
    teeth.scale.set(1.15, 0.55, 0.45);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.023, 0.0038, 8, 18, Math.PI),
      lipMat
    );
    rim.rotation.z = Math.PI;
    mouthGroup.add(teeth, rim);
  } else {
    const curve =
      outfit.mouth === 'calm'
        ? 0.003
        : outfit.mouth === 'smirk'
          ? 0.006
          : 0.016;
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.02, 0.0042, 10, 18, Math.PI * 0.85),
      lipMat
    );
    smile.rotation.z = Math.PI + 0.24 + (outfit.mouth === 'smirk' ? 0.22 : 0);
    smile.position.y = curve * 0.4;
    mouthGroup.add(smile);
    if (outfit.mouth === 'tongue') {
      const tongue = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 12, 10),
        new THREE.MeshStandardMaterial({ color: '#FB7185', roughness: 0.35 })
      );
      tongue.scale.set(0.95, 1.15, 0.55);
      tongue.position.set(0, -0.011, 0.004);
      mouthGroup.add(tongue);
    }
  }
  headGroup.add(mouthGroup);

  // --- Sculpted 3D Hair OR Hijab ---
  if (hasHijab) {
    // 3D Hijab Hood Wrap + Chin Frame + Drape
    const outerHood = new THREE.Mesh(
      new THREE.SphereGeometry(0.146, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.72),
      hijabMat
    );
    outerHood.position.set(0, headCenterY + 0.008, -0.01);
    outerHood.rotation.x = -0.32;
    headGroup.add(outerHood);

    // Chin/Face Scarf Frame
    const frameRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.122, 0.024, 14, 28),
      hijabMat
    );
    frameRing.position.set(0, headCenterY + 0.004, 0.036);
    frameRing.scale.set(1.06, 1.16, 0.85);
    headGroup.add(frameRing);

    // Chest / Shoulder Scarf Drape (attached to torso so head turns smoothly!)
    const drapeHeight =
      outfit.hijabStyle === 'syari'
        ? 0.34
        : outfit.hijabStyle === 'pashmina'
          ? 0.24
          : 0.19;
    const drapeGeo = makeLathe(
      [
        [0.088, 0.68],
        [0.146, 0.60],
        [0.185, 0.60 - drapeHeight * 0.5],
        [0.175, 0.60 - drapeHeight],
      ],
      28
    );
    const drape = new THREE.Mesh(drapeGeo, hijabMat);
    drape.scale.set(torsoScaleX * 1.02, 1, torsoScaleZ * 1.12);
    torsoGroup.add(drape);
  } else if (outfit.hairStyle !== 'none') {
    const hs = outfit.hairStyle;
    // Skull Cap Base
    const capGeo = new THREE.SphereGeometry(
      hs === 'buzz' ? 0.136 : 0.143,
      30,
      22,
      0,
      Math.PI * 2,
      0,
      Math.PI * 0.64
    );
    capGeo.scale(1.04, 1.11, 1.1);
    const capMesh = new THREE.Mesh(capGeo, hairMat);
    capMesh.position.set(0, headCenterY + 0.005, -0.012);
    capMesh.rotation.x = -0.28;
    headGroup.add(capMesh);

    const addLock = (pts: Array<[number, number, number]>, r = 0.028) => {
      const curve = new THREE.CatmullRomCurve3(
        pts.map(([x, y, z]) => new THREE.Vector3(x, headCenterY + y, z))
      );
      const lock = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, r, 10, false), hairMat);
      headGroup.add(lock);
    };

    if (hs === 'long_straight' || hs === 'wavy') {
      const waveAmp = hs === 'wavy' ? 0.026 : 0.006;
      for (let i = -3; i <= 3; i++) {
        const bx = i * 0.042;
        const bz = -0.085 - (1 - Math.abs(i) / 4) * 0.055;
        addLock(
          [
            [bx * 0.6, 0.12, bz + 0.04],
            [bx * 1.05, -0.02, bz],
            [bx * 1.15 + waveAmp, -0.22, bz - 0.015],
            [bx * 1.1 - waveAmp, -0.44, bz - 0.02],
          ],
          0.036
        );
      }
      // Side framing bangs
      addLock([[-0.11, 0.08, 0.04], [-0.13, -0.08, 0.06], [-0.12, -0.24, 0.03]], 0.028);
      addLock([[0.11, 0.08, 0.04], [0.13, -0.08, 0.06], [0.12, -0.24, 0.03]], 0.028);
    } else if (hs === 'bob') {
      for (let i = -3; i <= 3; i++) {
        const bx = i * 0.044;
        const bz = -0.08 - (1 - Math.abs(i) / 4) * 0.055;
        addLock(
          [
            [bx * 0.6, 0.11, bz + 0.03],
            [bx * 1.08, -0.02, bz],
            [bx * 0.96, -0.17, bz + 0.015],
          ],
          0.038
        );
      }
      addLock([[-0.11, 0.09, 0.05], [-0.12, -0.04, 0.075], [-0.10, -0.14, 0.06]], 0.028);
      addLock([[0.11, 0.09, 0.05], [0.12, -0.04, 0.075], [0.10, -0.14, 0.06]], 0.028);
    } else if (hs === 'bun') {
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.068, 22, 18), hairMat);
      bun.position.set(0, headCenterY + 0.19, -0.035);
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.011, 10, 22), roseMetalMat);
      band.rotation.x = Math.PI / 2;
      band.position.set(0, headCenterY + 0.155, -0.03);
      headGroup.add(bun, band);
    } else if (hs === 'twintails') {
      for (const side of [-1, 1]) {
        const tie = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.009, 8, 16), roseMetalMat);
        tie.position.set(side * 0.14, headCenterY + 0.075, -0.025);
        tie.rotation.y = side * 0.9;
        headGroup.add(tie);
        addLock(
          [
            [side * 0.14, 0.075, -0.025],
            [side * 0.21, -0.04, -0.04],
            [side * 0.22, -0.21, -0.05],
            [side * 0.19, -0.34, -0.04],
          ],
          0.04
        );
      }
    } else if (hs === 'comma') {
      // K-pop comma hair bangs & voluminous crown
      addLock([[-0.03, 0.14, 0.08], [-0.08, 0.09, 0.135], [-0.045, 0.025, 0.138]], 0.026);
      addLock([[0.01, 0.145, 0.08], [0.06, 0.10, 0.132], [0.095, 0.03, 0.11]], 0.025);
    } else if (hs === 'twoblock') {
      for (let i = -2; i <= 2; i++) {
        addLock(
          [
            [i * 0.032, 0.14, 0.06],
            [i * 0.038, 0.095, 0.13],
            [i * 0.034, 0.045, 0.135],
          ],
          0.025
        );
      }
    } else if (hs === 'curly') {
      for (let a = 0; a < 14; a++) {
        const theta = (a / 14) * Math.PI * 1.4 - Math.PI * 0.2;
        const puff = new THREE.Mesh(new THREE.SphereGeometry(0.044, 14, 12), hairMat);
        puff.position.set(
          Math.cos(theta) * 0.118,
          headCenterY + 0.105 + Math.sin(a * 2.1) * 0.035,
          Math.sin(theta) * 0.105 - 0.02
        );
        headGroup.add(puff);
      }
    } else if (hs === 'sidepart') {
      addLock([[-0.07, 0.145, 0.06], [0.02, 0.12, 0.135], [0.11, 0.065, 0.105]], 0.03);
    }
  }

  // --- Head Accessories: Glasses, Cap, Hair Ribbon ---
  if (accSet.has('glasses_round') || accSet.has('glasses_square')) {
    const isRound = accSet.has('glasses_round');
    const frameMat = isRound ? goldMat : darkOutlineMat;
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF',
      transparent: true,
      opacity: isSoftwareGl ? 0.25 : 0.92,
      transmission: isSoftwareGl ? 0 : 0.88,
      roughness: 0.05,
      ior: 1.5,
      clearcoat: 1.0,
    });
    for (const side of [-1, 1]) {
      if (isRound) {
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.0036, 10, 24), frameMat);
        rim.position.set(side * 0.045, headCenterY + 0.006, 0.145);
        const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 20), glassMat);
        lens.position.set(side * 0.045, headCenterY + 0.006, 0.145);
        headGroup.add(rim, lens);
      } else {
        const rim = new THREE.Mesh(new THREE.BoxGeometry(0.064, 0.048, 0.006), frameMat);
        rim.position.set(side * 0.045, headCenterY + 0.006, 0.145);
        const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.054, 0.038), glassMat);
        lens.position.set(side * 0.045, headCenterY + 0.006, 0.149);
        headGroup.add(rim, lens);
      }
      // Temple Arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.005, 0.13), frameMat);
      arm.position.set(side * 0.078, headCenterY + 0.009, 0.08);
      headGroup.add(arm);
    }
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.004, 0.005), frameMat);
    bridge.position.set(0, headCenterY + 0.008, 0.146);
    headGroup.add(bridge);
  }

  if (accSet.has('ribbon')) {
    const bowGroup = new THREE.Group();
    bowGroup.position.set(0.095, headCenterY + 0.118, 0.055);
    bowGroup.rotation.set(0.2, -0.35, -0.35);
    const wingL = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.044, 12), roseMetalMat);
    wingL.rotation.z = -Math.PI / 2;
    wingL.scale.set(0.6, 1, 0.45);
    wingL.position.x = -0.022;
    const wingR = wingL.clone();
    wingR.rotation.z = Math.PI / 2;
    wingR.position.x = 0.022;
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 12), goldMat);
    bowGroup.add(wingL, wingR, knot);
    headGroup.add(bowGroup);
  }

  if (accSet.has('cap')) {
    const capCrownMat = new THREE.MeshPhysicalMaterial({
      color: '#201E2B',
      roughness: 0.8,
      sheen: 0.4,
    });
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.148, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
      capCrownMat
    );
    capDome.scale.set(1.04, 1.02, 1.08);
    capDome.position.set(0, headCenterY + 0.03, 0);
    const visor = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.14, 0.012, 24, 1, false, -Math.PI * 0.42, Math.PI * 0.84),
      roseMetalMat
    );
    visor.position.set(0, headCenterY + 0.044, 0.068);
    visor.rotation.x = 0.18;
    headGroup.add(capDome, visor);
  }

  setShadowFlags(root, true, true);
  shadowPlane.castShadow = false;

  return {
    root,
    gender,
    torsoGroup,
    headGroup,
    leftArmGroup,
    rightArmGroup,
    leftLegGroup,
    rightLegGroup,
    eyeLeftGroup,
    eyeRightGroup,
    baseHeightOffset: isFemale ? 0 : 0.04,
  };
}
