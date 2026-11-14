import {
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  ParticleSystem,
  PointLight,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import type { SimDisasterType } from "../types";

export interface BuildingInstance {
  mesh: Mesh;
  originalY: number;
  height: number;
  typeIndex: number;
}

export interface TreeInstance {
  trunk: Mesh;
  crowns: Mesh[];
  x: number;
  z: number;
  scale: number;
  distFromIgnition: number;
}

export interface DisasterSceneFeatures {
  water: Mesh;
  floodWater: Mesh;
  volcano: Mesh;
  craterMagma: Mesh;
  lavaFlow: Mesh;
  volcanoLight: PointLight;
  fireLight: PointLight;
  sun: DirectionalLight;
  hemi: HemisphericLight;
  volcanoParticles: ParticleSystem | null;
  fireParticles: ParticleSystem | null;
  buildings: BuildingInstance[];
  trees: TreeInstance[];
  faultCracks: Mesh[];
  mudLake: Mesh;
  nightMaterials: StandardMaterial[];
  updateNightMode: (isNight: boolean) => void;
}

// Helper for standard materials
function createStdMat(
  scene: Scene,
  name: string,
  diffuse: Color3,
  specular: Color3 = new Color3(0.15, 0.15, 0.15),
  emissive: Color3 = Color3.Black()
) {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = diffuse;
  m.specularColor = specular;
  m.emissiveColor = emissive;
  return m;
}

// Procedural Canvas Textures
function createRoadTexture(scene: Scene): DynamicTexture {
  const tex = new DynamicTexture("road-tex", { width: 128, height: 512 }, scene, false);
  const ctx = tex.getContext();
  // Dark asphalt
  ctx.fillStyle = "#22252a";
  ctx.fillRect(0, 0, 128, 512);

  // White edge lines
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(8, 0, 4, 512);
  ctx.fillRect(116, 0, 4, 512);

  // Yellow dashed center line
  ctx.fillStyle = "#f59e0b";
  for (let y = 0; y < 512; y += 48) {
    ctx.fillRect(62, y + 8, 4, 28);
  }
  tex.update();
  tex.wrapU = Texture.WRAP_ADDRESSMODE;
  tex.wrapV = Texture.WRAP_ADDRESSMODE;
  return tex;
}

function createWindowTexture(scene: Scene, isOffice: boolean): DynamicTexture {
  const tex = new DynamicTexture(`win-tex-${isOffice ? "off" : "res"}`, { width: 256, height: 512 }, scene, false);
  const ctx = tex.getContext();

  // Wall color
  ctx.fillStyle = isOffice ? "#334155" : "#64748b";
  ctx.fillRect(0, 0, 256, 512);

  const cols = isOffice ? 8 : 6;
  const rows = isOffice ? 16 : 12;
  const colWidth = 256 / cols;
  const rowHeight = 512 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const wx = c * colWidth + 4;
      const wy = r * rowHeight + 4;
      const ww = colWidth - 8;
      const wh = rowHeight - 8;

      // Window glass
      ctx.fillStyle = isOffice ? "#1e293b" : "#475569";
      ctx.fillRect(wx, wy, ww, wh);

      // Glass inner reflection
      const lit = (r * 7 + c * 11) % 4 === 0;
      ctx.fillStyle = lit ? (isOffice ? "#38bdf8" : "#94a3b8") : "#0f172a";
      ctx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
    }
  }
  tex.update();
  return tex;
}

function createParticleTexture(scene: Scene, color: string): DynamicTexture {
  const tex = new DynamicTexture("ptcl-tex", { width: 64, height: 64 }, scene, false);
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, color);
  grad.addColorStop(0.5, color.replace("1.0", "0.4").replace("1)", "0.4)"));
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  tex.update();
  return tex;
}

export function createDisasterScene(scene: Scene, disaster: SimDisasterType): DisasterSceneFeatures {
  // Clear color default day sky
  scene.clearColor = new Color4(0.58, 0.74, 0.86, 1.0);

  // Lighting
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.diffuse = new Color3(0.92, 0.96, 1.0);
  hemi.groundColor = new Color3(0.32, 0.36, 0.3);
  hemi.intensity = 0.95;

  const sun = new DirectionalLight("sun", new Vector3(-0.6, -1.0, 0.45).normalize(), scene);
  sun.position = new Vector3(35, 60, -30);
  sun.intensity = 1.6;

  // Materials
  const soilMat = createStdMat(scene, "soilMat", new Color3(0.32, 0.44, 0.28), new Color3(0.05, 0.05, 0.05));
  const sandMat = createStdMat(scene, "sandMat", new Color3(0.78, 0.72, 0.54), new Color3(0.1, 0.1, 0.1));
  const rockMat = createStdMat(scene, "rockMat", new Color3(0.42, 0.45, 0.46), new Color3(0.15, 0.15, 0.15));
  const snowMat = createStdMat(scene, "snowMat", new Color3(0.95, 0.98, 1.0), new Color3(0.4, 0.4, 0.4));
  const concMat = createStdMat(scene, "concMat", new Color3(0.68, 0.7, 0.72), new Color3(0.2, 0.2, 0.2));
  const darkMetalMat = createStdMat(scene, "darkMetalMat", new Color3(0.25, 0.28, 0.32), new Color3(0.5, 0.5, 0.5));
  const cableMat = createStdMat(scene, "cableMat", new Color3(0.85, 0.88, 0.92), new Color3(0.8, 0.8, 0.8));

  const roadTex = createRoadTexture(scene);
  const roadMat = new StandardMaterial("roadMat", scene);
  roadMat.diffuseTexture = roadTex;
  roadMat.specularColor = new Color3(0.2, 0.2, 0.2);

  const officeWinTex = createWindowTexture(scene, true);
  const officeMat = new StandardMaterial("officeMat", scene);
  officeMat.diffuseTexture = officeWinTex;
  officeMat.specularColor = new Color3(0.35, 0.38, 0.45);

  const resWinTex = createWindowTexture(scene, false);
  const resMat = new StandardMaterial("resMat", scene);
  resMat.diffuseTexture = resWinTex;
  resMat.specularColor = new Color3(0.2, 0.2, 0.2);

  const glassTowerMat = createStdMat(scene, "glassTowerMat", new Color3(0.2, 0.42, 0.55), new Color3(0.8, 0.9, 1.0));
  glassTowerMat.alpha = 0.92;

  const roofMat = createStdMat(scene, "roofMat", new Color3(0.3, 0.33, 0.36), new Color3(0.1, 0.1, 0.1));
  const redTileMat = createStdMat(scene, "redTileMat", new Color3(0.65, 0.26, 0.18), new Color3(0.1, 0.1, 0.1));

  // Trunk & leaf materials
  const woodMat = createStdMat(scene, "woodMat", new Color3(0.32, 0.22, 0.14), new Color3(0.05, 0.05, 0.05));
  const leafMat1 = createStdMat(scene, "leafMat1", new Color3(0.18, 0.42, 0.2), new Color3(0.08, 0.08, 0.08));
  const leafMat2 = createStdMat(scene, "leafMat2", new Color3(0.26, 0.52, 0.25), new Color3(0.08, 0.08, 0.08));
  const leafMat3 = createStdMat(scene, "leafMat3", new Color3(0.14, 0.34, 0.16), new Color3(0.08, 0.08, 0.08));

  // Water material
  const waterMat = new StandardMaterial("waterMat", scene);
  waterMat.diffuseColor = new Color3(0.06, 0.38, 0.52);
  waterMat.specularColor = new Color3(0.9, 0.95, 1.0);
  waterMat.specularPower = 64;
  waterMat.alpha = 0.88;

  const floodMat = new StandardMaterial("floodMat", scene);
  floodMat.diffuseColor = new Color3(0.12, 0.35, 0.45);
  floodMat.specularColor = new Color3(0.7, 0.8, 0.9);
  floodMat.alpha = 0.85;

  // Volcano Lava Materials
  const lavaMat = new StandardMaterial("lavaMat", scene);
  lavaMat.diffuseColor = new Color3(1.0, 0.28, 0.05);
  lavaMat.emissiveColor = new Color3(0.95, 0.3, 0.05);
  lavaMat.specularColor = new Color3(1.0, 0.6, 0.2);

  const basaltMat = createStdMat(scene, "basaltMat", new Color3(0.22, 0.2, 0.2), new Color3(0.1, 0.1, 0.1));

  // Night Mode Tracking
  const nightMaterials = [officeMat, resMat, glassTowerMat];
  const updateNightMode = (isNight: boolean) => {
    if (isNight) {
      scene.clearColor = new Color4(0.04, 0.07, 0.12, 1.0);
      hemi.intensity = 0.28;
      hemi.diffuse = new Color3(0.3, 0.4, 0.6);
      sun.intensity = 0.35;
      officeMat.emissiveColor = new Color3(0.55, 0.48, 0.32);
      resMat.emissiveColor = new Color3(0.48, 0.4, 0.25);
    } else {
      scene.clearColor = new Color4(0.58, 0.74, 0.86, 1.0);
      hemi.intensity = 0.95;
      hemi.diffuse = new Color3(0.92, 0.96, 1.0);
      sun.intensity = 1.6;
      officeMat.emissiveColor = Color3.Black();
      resMat.emissiveColor = Color3.Black();
    }
  };

  // --------------------------------------------------------------------------
  // 1. TERRAIN & ENVIRONMENT
  // --------------------------------------------------------------------------
  // Mainland Plateau (West side: X -26 to 2)
  const mainland = MeshBuilder.CreateBox("mainland", { width: 28, height: 1.6, depth: 38 }, scene);
  mainland.position.set(-12, -0.8, 0);
  mainland.material = soilMat;

  // Sandy Beach Along Coastline (X = 2.5)
  const beach = MeshBuilder.CreateBox("beach", { width: 2.2, height: 1.5, depth: 38 }, scene);
  beach.position.set(2.6, -0.82, 0);
  beach.material = sandMat;

  // Coastal seawall / embankment promenade
  const seawall = MeshBuilder.CreateBox("seawall", { width: 0.8, height: 1.7, depth: 38 }, scene);
  seawall.position.set(1.5, -0.75, 0);
  seawall.material = concMat;

  // Seabed (East side: X 4 to 34)
  const seabed = MeshBuilder.CreateBox("seabed", { width: 30, height: 5, depth: 40 }, scene);
  seabed.position.set(18, -4.5, 0);
  seabed.material = rockMat;

  // Ocean Surface (Strait)
  const water = MeshBuilder.CreateGround("oceanWater", { width: 32, height: 42, subdivisions: 48 }, scene);
  water.position.set(18, -0.32, 0);
  water.material = waterMat;

  // Tsunami Floodwater Sheet (Initially scaled near zero)
  const floodWater = MeshBuilder.CreateBox("floodWater", { width: 22, height: 1.4, depth: 38 }, scene);
  floodWater.position.set(-4, -0.25, 0);
  floodWater.scaling.x = 0.001;
  floodWater.material = floodMat;

  // --------------------------------------------------------------------------
  // 2. BACKGROUND MOUNTAIN RANGE (North-West: Z: -15 to -22)
  // --------------------------------------------------------------------------
  const mountainData = [
    { x: -24, z: -17, r: 6.5, h: 9.5 },
    { x: -18, z: -18, r: 5.8, h: 8.2 },
    { x: -12, z: -17.5, r: 5.2, h: 7.5 },
    { x: -6, z: -18, r: 4.8, h: 6.8 },
    { x: 0, z: -17, r: 4.2, h: 5.8 },
  ];

  mountainData.forEach((mt, idx) => {
    const mountain = MeshBuilder.CreateCylinder(`mt-${idx}`, {
      diameterTop: 0.2,
      diameterBottom: mt.r * 2,
      height: mt.h,
      tessellation: 16,
    }, scene);
    mountain.position.set(mt.x, mt.h / 2 - 0.8, mt.z);
    mountain.material = rockMat;

    // Snow Cap on High Peaks
    if (mt.h > 7.0) {
      const snow = MeshBuilder.CreateCylinder(`snow-${idx}`, {
        diameterTop: 0.1,
        diameterBottom: mt.r * 0.75,
        height: mt.h * 0.32,
        tessellation: 16,
      }, scene);
      snow.position.set(mt.x, mt.h - mt.h * 0.16 - 0.8, mt.z);
      snow.material = snowMat;
    }
  });

  // Forested Ridge Hill (South-West: X -22 to -14, Z -10 to -2)
  const forestHill = MeshBuilder.CreateSphere("forestHill", { diameter: 1, segments: 16 }, scene);
  forestHill.scaling.set(12, 3.8, 16);
  forestHill.position.set(-18, 0.4, -6);
  forestHill.material = soilMat;

  // --------------------------------------------------------------------------
  // 3. URBAN ROAD NETWORK & BLOCKS
  // --------------------------------------------------------------------------
  // North-South Avenues
  [-20, -14, -8, -2].forEach((x) => {
    const ave = MeshBuilder.CreatePlane(`ave-${x}`, { width: 2.2, height: 34 }, scene);
    ave.rotation.x = Math.PI / 2;
    ave.position.set(x, 0.02, 0);
    ave.material = roadMat;

    // Sidewalks on both sides of avenue
    [-1.25, 1.25].forEach((offset) => {
      const sw = MeshBuilder.CreateBox(`sw-${x}-${offset}`, { width: 0.6, height: 0.08, depth: 34 }, scene);
      sw.position.set(x + offset, 0.03, 0);
      sw.material = concMat;
    });
  });

  // East-West Cross Streets
  [-12, -4, 4, 12].forEach((z) => {
    const street = MeshBuilder.CreatePlane(`street-${z}`, { width: 22, height: 2.0 }, scene);
    street.rotation.x = Math.PI / 2;
    street.position.set(-11, 0.025, z);
    street.material = roadMat;
  });

  // --------------------------------------------------------------------------
  // 4. REALISTIC BUILDINGS WITH ARCHITECTURAL DETAIL
  // --------------------------------------------------------------------------
  const buildings: BuildingInstance[] = [];
  let bIdx = 0;

  // City parcel blocks: 4 columns x 3 rows of blocks
  const blockCentersX = [-17, -11, -5];
  const blockCentersZ = [-8, 0, 8];

  blockCentersX.forEach((cx, colIdx) => {
    blockCentersZ.forEach((cz, rowIdx) => {
      // 4 buildings per block quadrant
      const subOffsets = [
        { dx: -1.4, dz: -1.4 },
        { dx: 1.4, dz: -1.4 },
        { dx: -1.4, dz: 1.4 },
        { dx: 1.4, dz: 1.4 },
      ];

      subOffsets.forEach(({ dx, dz }, subIdx) => {
        const bx = cx + dx;
        const bz = cz + dz;
        const typeIndex = (colIdx * 4 + rowIdx * 2 + subIdx) % 5;
        bIdx++;

        let w = 2.0;
        let d = 2.0;
        let h = 4.0;
        let mat = officeMat;

        if (typeIndex === 0) {
          // Modern Skyscraper / Glass Office Tower
          w = 2.4;
          d = 2.4;
          h = 7.5 + (bIdx % 3) * 1.8;
          mat = glassTowerMat;
        } else if (typeIndex === 1) {
          // Mid-rise Commercial / Corporate Office
          w = 2.2;
          d = 2.0;
          h = 5.0 + (bIdx % 2) * 1.5;
          mat = officeMat;
        } else if (typeIndex === 2) {
          // Residential Apartment Block with Balconies
          w = 2.2;
          d = 2.2;
          h = 4.2 + (bIdx % 3) * 0.9;
          mat = resMat;
        } else if (typeIndex === 3) {
          // Stepped Corporate Building
          w = 2.6;
          d = 2.2;
          h = 6.2;
          mat = concMat;
        } else {
          // Urban Villa / Townhouse with Pitch Roof
          w = 1.8;
          d = 1.8;
          h = 2.2;
          mat = concMat;
        }

        const bBody = MeshBuilder.CreateBox(`bldg-${bIdx}`, { width: w, height: h, depth: d }, scene);
        bBody.position.set(bx, h / 2, bz);
        bBody.material = mat;

        // Rooftop Details
        if (typeIndex < 4) {
          // Flat roof with parapet rim
          const roofTrim = MeshBuilder.CreateBox(`bldg-rf-${bIdx}`, { width: w + 0.1, height: 0.15, depth: d + 0.1 }, scene);
          roofTrim.position.set(bx, h + 0.08, bz);
          roofTrim.material = roofMat;
          roofTrim.parent = bBody;

          // Rooftop HVAC unit
          const hvac = MeshBuilder.CreateBox(`bldg-hvac-${bIdx}`, { width: w * 0.45, height: 0.5, depth: d * 0.4 }, scene);
          hvac.position.set(bx + (dx > 0 ? -0.3 : 0.3), h + 0.35, bz + (dz > 0 ? -0.3 : 0.3));
          hvac.material = darkMetalMat;
          hvac.parent = bBody;

          // Communication antenna on tall towers
          if (h > 6.0) {
            const mast = MeshBuilder.CreateCylinder(`bldg-mast-${bIdx}`, { diameter: 0.08, height: 2.2 }, scene);
            mast.position.set(bx, h + 1.1, bz);
            mast.material = cableMat;
            mast.parent = bBody;
          }
        } else {
          // Pitched Gabled Roof on suburban houses
          const roofGable = MeshBuilder.CreateCylinder(`bldg-gable-${bIdx}`, {
            diameterTop: 0,
            diameterBottom: w * 1.45,
            height: 1.1,
            tessellation: 4,
          }, scene);
          roofGable.position.set(bx, h + 0.55, bz);
          roofGable.rotation.y = Math.PI / 4;
          roofGable.material = redTileMat;
          roofGable.parent = bBody;
        }

        // Balconies on residential apartments
        if (typeIndex === 2) {
          const floors = Math.floor(h / 1.1);
          for (let f = 1; f < floors; f++) {
            const by = f * 1.1;
            const balcony = MeshBuilder.CreateBox(`balc-${bIdx}-${f}`, { width: w * 0.65, height: 0.12, depth: 0.4 }, scene);
            balcony.position.set(bx, by, bz + d / 2 + 0.2);
            balcony.material = darkMetalMat;
            balcony.parent = bBody;
          }
        }

        buildings.push({
          mesh: bBody,
          originalY: h / 2,
          height: h,
          typeIndex,
        });
      });
    });
  });

  // --------------------------------------------------------------------------
  // 5. REALISTIC SUSPENSION BRIDGE ACROSS STRAIT
  // --------------------------------------------------------------------------
  const bridgeZ = 4.0;
  const bridgeStartX = 1.5;
  const bridgeEndX = 18.5;
  const bridgeLength = bridgeEndX - bridgeStartX;
  const bridgeMidX = (bridgeStartX + bridgeEndX) / 2;
  const bridgeDeckY = 1.6;

  // Deck
  const deck = MeshBuilder.CreateBox("bridgeDeck", { width: bridgeLength, height: 0.35, depth: 2.4 }, scene);
  deck.position.set(bridgeMidX, bridgeDeckY, bridgeZ);
  deck.material = roadMat;

  // Guardrails
  [-1.15, 1.15].forEach((oz) => {
    const rail = MeshBuilder.CreateBox(`bridgeRail-${oz}`, { width: bridgeLength, height: 0.45, depth: 0.08 }, scene);
    rail.position.set(bridgeMidX, bridgeDeckY + 0.35, bridgeZ + oz);
    rail.material = concMat;
  });

  // Bridge Pylons (Tower 1 at X=6.5, Tower 2 at X=13.5)
  const pylonXPositions = [6.5, 13.5];
  pylonXPositions.forEach((px, pIdx) => {
    // Underwater caisson foundation pier
    const pier = MeshBuilder.CreateBox(`pylonPier-${pIdx}`, { width: 1.8, height: 3.5, depth: 3.6 }, scene);
    pier.position.set(px, -0.6, bridgeZ);
    pier.material = concMat;

    // Dual vertical concrete legs
    [-1.3, 1.3].forEach((pz) => {
      const leg = MeshBuilder.CreateBox(`pylonLeg-${pIdx}-${pz}`, { width: 0.55, height: 5.8, depth: 0.55 }, scene);
      leg.position.set(px, bridgeDeckY + 2.7, bridgeZ + pz);
      leg.material = concMat;
    });

    // Horizontal cross-beams connecting pylon legs
    [bridgeDeckY + 2.2, bridgeDeckY + 5.2].forEach((by, bIdx) => {
      const beam = MeshBuilder.CreateBox(`pylonBeam-${pIdx}-${bIdx}`, { width: 0.65, height: 0.35, depth: 2.7 }, scene);
      beam.position.set(px, by, bridgeZ);
      beam.material = concMat;
    });
  });

  // Main Suspension Cables (Parabolic Catenary Curve)
  [-1.3, 1.3].forEach((cz) => {
    const cablePoints: Vector3[] = [];
    const numPoints = 24;
    for (let i = 0; i <= numPoints; i++) {
      const u = i / numPoints;
      const x = bridgeStartX + u * bridgeLength;
      // Parabolic drape between pylons
      let y = bridgeDeckY + 0.4;
      if (x < 6.5) {
        const t = (x - bridgeStartX) / (6.5 - bridgeStartX);
        y = bridgeDeckY + 0.4 + t * 4.8;
      } else if (x <= 13.5) {
        const t = (x - 6.5) / (13.5 - 6.5);
        y = bridgeDeckY + 5.2 - Math.sin(t * Math.PI) * 3.8;
      } else {
        const t = (x - 13.5) / (bridgeEndX - 13.5);
        y = bridgeDeckY + 5.2 - t * 4.8;
      }
      cablePoints.push(new Vector3(x, y, bridgeZ + cz));
    }

    const mainCable = MeshBuilder.CreateTube(`mainCable-${cz}`, {
      path: cablePoints,
      radius: 0.045,
      tessellation: 8,
    }, scene);
    mainCable.material = cableMat;

    // Vertical Hanger Cables dropping to deck
    for (let k = 1; k < cablePoints.length - 1; k += 2) {
      const pt = cablePoints[k];
      if (pt.y > bridgeDeckY + 0.6) {
        const hangerHeight = pt.y - (bridgeDeckY + 0.2);
        const hanger = MeshBuilder.CreateCylinder(`hanger-${cz}-${k}`, {
          diameter: 0.02,
          height: hangerHeight,
          tessellation: 6,
        }, scene);
        hanger.position.set(pt.x, bridgeDeckY + 0.2 + hangerHeight / 2, bridgeZ + cz);
        hanger.material = cableMat;
      }
    }
  });

  // --------------------------------------------------------------------------
  // 6. VOLCANO ISLAND IN THE STRAIT (X: 22, Z: -6)
  // --------------------------------------------------------------------------
  const vx = 22;
  const vz = -6;

  // Island base rock shelf
  const vIsland = MeshBuilder.CreateCylinder("vIsland", {
    diameterTop: 11,
    diameterBottom: 14,
    height: 1.5,
    tessellation: 24,
  }, scene);
  vIsland.position.set(vx, -0.2, vz);
  vIsland.material = basaltMat;

  // Main Volcanic Cone
  const volcano = MeshBuilder.CreateCylinder("volcanoCone", {
    diameterTop: 3.2,
    diameterBottom: 10.5,
    height: 6.2,
    tessellation: 32,
  }, scene);
  volcano.position.set(vx, 3.1, vz);
  volcano.material = basaltMat;

  // Crater Rim Magma Chamber Lake
  const craterMagma = MeshBuilder.CreateCylinder("craterMagma", {
    diameterTop: 2.8,
    diameterBottom: 2.4,
    height: 0.3,
    tessellation: 24,
  }, scene);
  craterMagma.position.set(vx, 6.15, vz);
  craterMagma.material = lavaMat;

  // Lava Flow Path down flank
  const lavaPath = [
    new Vector3(vx, 6.1, vz + 0.8),
    new Vector3(vx - 0.8, 5.0, vz + 1.8),
    new Vector3(vx - 1.6, 3.4, vz + 2.8),
    new Vector3(vx - 2.8, 1.8, vz + 3.8),
    new Vector3(vx - 4.2, 0.2, vz + 4.5),
  ];
  const lavaFlow = MeshBuilder.CreateTube("lavaFlow", {
    path: lavaPath,
    radius: 0.32,
    tessellation: 8,
  }, scene);
  lavaFlow.material = lavaMat;

  // Volcano Crater Point Light
  const volcanoLight = new PointLight("volcanoLight", new Vector3(vx, 7.5, vz), scene);
  volcanoLight.diffuse = new Color3(1.0, 0.45, 0.1);
  volcanoLight.specular = new Color3(1.0, 0.6, 0.2);
  volcanoLight.range = 28;
  volcanoLight.intensity = disaster === "VOLCANO" ? 2.8 : 0.8;

  // --------------------------------------------------------------------------
  // 7. VEGETATION & FORESTRY (Western Hillside & Streets)
  // --------------------------------------------------------------------------
  const trees: TreeInstance[] = [];
  const ignitionPoint = { x: -22, z: -12 };
  let tIdx = 0;

  // Forest trees on the western ridge
  for (let i = 0; i < 48; i++) {
    const tx = -24 + (i % 7) * 1.8 + (Math.sin(i * 3.7) * 0.4);
    const tz = -14 + Math.floor(i / 7) * 1.6 + (Math.cos(i * 2.3) * 0.4);
    tIdx++;

    const trunkH = 1.2 + (i % 3) * 0.2;
    const trunk = MeshBuilder.CreateCylinder(`tree-tr-${tIdx}`, {
      diameterTop: 0.14,
      diameterBottom: 0.24,
      height: trunkH,
      tessellation: 6,
    }, scene);
    trunk.position.set(tx, trunkH / 2, tz);
    trunk.material = woodMat;

    // Multi-tiered evergreen cone canopy
    const crowns: Mesh[] = [];
    const numTiers = 3;
    const lMat = i % 3 === 0 ? leafMat1 : i % 3 === 1 ? leafMat2 : leafMat3;

    for (let tier = 0; tier < numTiers; tier++) {
      const crw = MeshBuilder.CreateCylinder(`tree-cr-${tIdx}-${tier}`, {
        diameterTop: 0,
        diameterBottom: 1.6 - tier * 0.35,
        height: 1.0,
        tessellation: 7,
      }, scene);
      crw.position.set(tx, trunkH + 0.45 + tier * 0.65, tz);
      crw.material = lMat;
      crowns.push(crw);
    }

    const dx = tx - ignitionPoint.x;
    const dz = tz - ignitionPoint.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    trees.push({
      trunk,
      crowns,
      x: tx,
      z: tz,
      scale: 1.0,
      distFromIgnition: dist,
    });
  }

  // Street Trees along boulevards
  [-17, -11, -5].forEach((sx) => {
    [-10, -2, 6, 14].forEach((sz) => {
      tIdx++;
      const trunk = MeshBuilder.CreateCylinder(`tree-tr-${tIdx}`, {
        diameterTop: 0.12,
        diameterBottom: 0.2,
        height: 1.4,
        tessellation: 6,
      }, scene);
      trunk.position.set(sx + 2.5, 0.7, sz);
      trunk.material = woodMat;

      const canopy = MeshBuilder.CreateSphere(`tree-can-${tIdx}`, { diameter: 1.4, segments: 7 }, scene);
      canopy.position.set(sx + 2.5, 1.8, sz);
      canopy.material = leafMat2;

      trees.push({
        trunk,
        crowns: [canopy],
        x: sx + 2.5,
        z: sz,
        scale: 1.0,
        distFromIgnition: 25,
      });
    });
  });

  // Dynamic Wildfire Point Light
  const fireLight = new PointLight("fireLight", new Vector3(-20, 3, -10), scene);
  fireLight.diffuse = new Color3(1.0, 0.35, 0.05);
  fireLight.range = 24;
  fireLight.intensity = 0;

  // --------------------------------------------------------------------------
  // 8. FAULT CRACKS & LIQUEFACTION MUD
  // --------------------------------------------------------------------------
  const faultCracks: Mesh[] = [];
  for (let i = 0; i < 8; i++) {
    const crack = MeshBuilder.CreateBox(`crack-${i}`, {
      width: 0.15,
      height: 0.06,
      depth: 3.2 + (i % 3) * 1.2,
    }, scene);
    crack.position.set(-11.5 + (i % 2 === 0 ? 0.3 : -0.3), 0.04, -12 + i * 3.4);
    crack.rotation.y = 0.12 * (i % 3 - 1);
    crack.scaling.x = 0.001;
    crack.material = createStdMat(scene, `crackMat-${i}`, new Color3(0.08, 0.06, 0.05));
    faultCracks.push(crack);
  }

  // Mud Lake for Liquefaction
  const mudLake = MeshBuilder.CreateGround("mudLake", { width: 14, height: 16, subdivisions: 8 }, scene);
  mudLake.position.set(-12, 0.035, 0);
  const mudMat = createStdMat(scene, "mudMat", new Color3(0.38, 0.32, 0.24));
  mudMat.alpha = 0;
  mudLake.material = mudMat;

  // --------------------------------------------------------------------------
  // 9. PARTICLE SYSTEMS (Volcano Smoke & Wildfire Fire/Smoke)
  // --------------------------------------------------------------------------
  let volcanoParticles: ParticleSystem | null = null;
  let fireParticles: ParticleSystem | null = null;

  try {
    if (typeof document !== "undefined") {
      const vParticleTex = createParticleTexture(scene, "rgba(255, 120, 20, 1.0)");
      volcanoParticles = new ParticleSystem("volcanoParticles", 400, scene);
      volcanoParticles.particleTexture = vParticleTex;
      volcanoParticles.emitter = new Vector3(vx, 6.3, vz);
      volcanoParticles.minEmitBox = new Vector3(-0.6, 0, -0.6);
      volcanoParticles.maxEmitBox = new Vector3(0.6, 0, 0.6);
      volcanoParticles.color1 = new Color4(1.0, 0.45, 0.1, 0.9);
      volcanoParticles.color2 = new Color4(0.3, 0.3, 0.3, 0.6);
      volcanoParticles.colorDead = new Color4(0.1, 0.1, 0.1, 0.0);
      volcanoParticles.minSize = 0.4;
      volcanoParticles.maxSize = 2.4;
      volcanoParticles.minLifeTime = 1.5;
      volcanoParticles.maxLifeTime = 3.5;
      volcanoParticles.emitRate = 90;
      volcanoParticles.direction1 = new Vector3(-1.0, 5.0, -1.0);
      volcanoParticles.direction2 = new Vector3(1.0, 8.0, 1.0);
      volcanoParticles.minEmitPower = 2.5;
      volcanoParticles.maxEmitPower = 5.0;
      volcanoParticles.gravity = new Vector3(0, 0.8, 0);
      volcanoParticles.start();

      const fParticleTex = createParticleTexture(scene, "rgba(255, 80, 10, 1.0)");
      fireParticles = new ParticleSystem("fireParticles", 350, scene);
      fireParticles.particleTexture = fParticleTex;
      fireParticles.emitter = new Vector3(-20, 1.5, -10);
      fireParticles.minEmitBox = new Vector3(-2.0, 0, -2.0);
      fireParticles.maxEmitBox = new Vector3(2.0, 0, 2.0);
      fireParticles.color1 = new Color4(1.0, 0.35, 0.05, 0.9);
      fireParticles.color2 = new Color4(0.25, 0.25, 0.25, 0.6);
      fireParticles.colorDead = new Color4(0.1, 0.1, 0.1, 0.0);
      fireParticles.minSize = 0.3;
      fireParticles.maxSize = 1.8;
      fireParticles.minLifeTime = 0.8;
      fireParticles.maxLifeTime = 2.2;
      fireParticles.emitRate = 0; // Activated during wildfire
      fireParticles.direction1 = new Vector3(-0.5, 3.0, -0.5);
      fireParticles.direction2 = new Vector3(0.5, 5.0, 0.5);
      fireParticles.minEmitPower = 1.5;
      fireParticles.maxEmitPower = 3.2;
      fireParticles.gravity = new Vector3(0, 0.4, 0);
      fireParticles.start();
    }
  } catch (e) {
    console.warn("Particle system initialization skipped:", e);
  }

  return {
    water,
    floodWater,
    volcano,
    craterMagma,
    lavaFlow,
    volcanoLight,
    fireLight,
    sun,
    hemi,
    volcanoParticles,
    fireParticles,
    buildings,
    trees,
    faultCracks,
    mudLake,
    nightMaterials,
    updateNightMode,
  };
}
