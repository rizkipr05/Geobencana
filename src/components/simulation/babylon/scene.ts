import {
  Color3,
  Color4,
  DirectionalLight,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PointLight,
  Scene,
  StandardMaterial,
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
  buildings: BuildingInstance[];
  trees: TreeInstance[];
  faultCracks: Mesh[];
  mudLake: Mesh;
  updateNightMode: (isNight: boolean) => void;
}

function createMat(
  scene: Scene,
  name: string,
  diffuse: Color3,
  specular: Color3 = new Color3(0.12, 0.12, 0.12),
  emissive: Color3 = Color3.Black()
): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  m.diffuseColor = diffuse;
  m.specularColor = specular;
  m.emissiveColor = emissive;
  m.backFaceCulling = false;
  return m;
}

export function createDisasterScene(scene: Scene, disaster: SimDisasterType): DisasterSceneFeatures {
  // Clear color default day sky
  scene.clearColor = new Color4(0.58, 0.76, 0.88, 1.0);

  // Bright, rich lighting
  const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), scene);
  hemi.diffuse = new Color3(0.96, 0.98, 1.0);
  hemi.groundColor = new Color3(0.42, 0.44, 0.38);
  hemi.intensity = 1.15;

  const sun = new DirectionalLight("sun", new Vector3(-0.6, -1.0, 0.45).normalize(), scene);
  sun.position = new Vector3(35, 60, -30);
  sun.diffuse = new Color3(1.0, 0.98, 0.92);
  sun.intensity = 1.45;

  // --------------------------------------------------------------------------
  // MATERIALS
  // --------------------------------------------------------------------------
  const soilMat = createMat(scene, "soilMat", new Color3(0.38, 0.54, 0.32));
  if (disaster === "WILDFIRE") soilMat.diffuseColor = new Color3(0.25, 0.35, 0.24);
  if (disaster === "VOLCANO") soilMat.diffuseColor = new Color3(0.25, 0.23, 0.22);
  if (disaster === "LIQUEFACTION") soilMat.diffuseColor = new Color3(0.48, 0.43, 0.32);
  const sandMat = createMat(scene, "sandMat", new Color3(0.85, 0.78, 0.58));
  const rockMat = createMat(scene, "rockMat", new Color3(0.48, 0.5, 0.52));
  const snowMat = createMat(scene, "snowMat", new Color3(0.96, 0.98, 1.0), new Color3(0.5, 0.5, 0.5));
  const concMat = createMat(scene, "concMat", new Color3(0.72, 0.74, 0.76));
  const roadMat = createMat(scene, "roadMat", new Color3(0.24, 0.26, 0.28));
  const roadLineMat = createMat(scene, "roadLineMat", new Color3(0.95, 0.72, 0.15), Color3.Black(), new Color3(0.4, 0.3, 0.05));
  const darkMetalMat = createMat(scene, "darkMetalMat", new Color3(0.28, 0.32, 0.36), new Color3(0.4, 0.4, 0.4));
  const cableMat = createMat(scene, "cableMat", new Color3(0.88, 0.9, 0.94), new Color3(0.6, 0.6, 0.6));

  // Building Materials
  const glassTowerMat = createMat(scene, "glassTowerMat", new Color3(0.22, 0.48, 0.62), new Color3(0.8, 0.9, 1.0));
  glassTowerMat.alpha = 0.92;

  const officeMat = createMat(scene, "officeMat", new Color3(0.68, 0.7, 0.74), new Color3(0.3, 0.3, 0.3));
  const resMat = createMat(scene, "resMat", new Color3(0.76, 0.72, 0.65), new Color3(0.2, 0.2, 0.2));
  const corporateMat = createMat(scene, "corporateMat", new Color3(0.55, 0.62, 0.68), new Color3(0.35, 0.35, 0.35));
  const houseWallMat = createMat(scene, "houseWallMat", new Color3(0.86, 0.84, 0.78));
  const redTileMat = createMat(scene, "redTileMat", new Color3(0.75, 0.32, 0.22));
  const windowGlassMat = createMat(scene, "windowGlassMat", new Color3(0.18, 0.32, 0.45), new Color3(0.6, 0.7, 0.8));

  // Trees Materials
  const woodMat = createMat(scene, "woodMat", new Color3(0.36, 0.25, 0.16));
  const leafMat1 = createMat(scene, "leafMat1", new Color3(0.22, 0.48, 0.25));
  const leafMat2 = createMat(scene, "leafMat2", new Color3(0.3, 0.58, 0.28));
  const leafMat3 = createMat(scene, "leafMat3", new Color3(0.16, 0.4, 0.2));

  // Water Material
  const waterMat = createMat(scene, "waterMat", new Color3(0.08, 0.42, 0.58), new Color3(0.9, 0.95, 1.0));
  waterMat.specularPower = 64;
  waterMat.alpha = 0.88;

  const floodMat = createMat(scene, "floodMat", new Color3(0.14, 0.38, 0.48), new Color3(0.6, 0.7, 0.8));
  floodMat.alpha = 0.85;

  // Volcano Lava Materials
  const basaltMat = createMat(scene, "basaltMat", new Color3(0.24, 0.22, 0.22));
  const lavaMat = createMat(
    scene,
    "lavaMat",
    new Color3(1.0, 0.32, 0.05),
    new Color3(1.0, 0.6, 0.2),
    new Color3(0.95, 0.3, 0.05)
  );

  // Night Mode Handler
  const updateNightMode = (isNight: boolean) => {
    if (isNight) {
      scene.clearColor = new Color4(0.05, 0.08, 0.15, 1.0);
      hemi.intensity = 0.32;
      hemi.diffuse = new Color3(0.35, 0.45, 0.65);
      sun.intensity = 0.4;
      windowGlassMat.emissiveColor = new Color3(0.85, 0.72, 0.35); // Warm windows at night
      officeMat.emissiveColor = new Color3(0.2, 0.18, 0.1);
      resMat.emissiveColor = new Color3(0.22, 0.19, 0.12);
    } else {
      scene.clearColor = new Color4(0.58, 0.76, 0.88, 1.0);
      hemi.intensity = 1.15;
      hemi.diffuse = new Color3(0.96, 0.98, 1.0);
      sun.intensity = 1.45;
      windowGlassMat.emissiveColor = Color3.Black();
      officeMat.emissiveColor = Color3.Black();
      resMat.emissiveColor = Color3.Black();
    }
  };

  // --------------------------------------------------------------------------
  // 1. TERRAIN & ENVIRONMENT
  // --------------------------------------------------------------------------
  // Mainland Plateau (West: X -26 to 4, Z -19 to 19)
  const mainland = MeshBuilder.CreateBox("mainland", { width: 30, height: 1.8, depth: 38 }, scene);
  mainland.position.set(-11, -0.9, 0);
  mainland.material = soilMat;

  // Sandy Beach Along Coastline (X = 4.5)
  const beach = MeshBuilder.CreateBox("beach", { width: 3.2, height: 1.7, depth: 38 }, scene);
  beach.position.set(4.6, -0.92, 0);
  beach.material = sandMat;

  // Coastal Promenade Embankment (X = 3.2)
  const promenade = MeshBuilder.CreateBox("promenade", { width: 1.2, height: 1.9, depth: 38 }, scene);
  promenade.position.set(3.2, -0.85, 0);
  promenade.material = concMat;

  // Seabed (East: X 6 to 34)
  const seabed = MeshBuilder.CreateBox("seabed", { width: 30, height: 5.5, depth: 40 }, scene);
  seabed.position.set(20, -4.5, 0);
  seabed.material = rockMat;

  // Ocean Surface (Strait)
  const water = MeshBuilder.CreateGround("oceanWater", { width: 32, height: 42, subdivisions: 32 }, scene);
  water.position.set(25, -0.28, 0);
  water.material = waterMat;

  // Tsunami Floodwater Sheet
  const floodWater = MeshBuilder.CreateBox("floodWater", { width: 22, height: 1.4, depth: 38 }, scene);
  floodWater.position.set(-3, -0.22, 0);
  floodWater.scaling.x = 0.001;
  floodWater.material = floodMat;

  // --------------------------------------------------------------------------
  // 2. BACKGROUND MOUNTAIN RANGE (North: Z -16 to -24)
  // --------------------------------------------------------------------------
  const mountainData = [
    { x: -24, z: -18, r: 6.8, h: 10.5 },
    { x: -17, z: -19, r: 6.0, h: 9.0 },
    { x: -10, z: -18.5, r: 5.5, h: 8.2 },
    { x: -3, z: -19, r: 5.0, h: 7.2 },
    { x: 4, z: -18, r: 4.5, h: 6.2 },
  ];

  mountainData.forEach((mt, idx) => {
    const mountain = MeshBuilder.CreateCylinder(`mt-${idx}`, {
      diameterTop: 0.3,
      diameterBottom: mt.r * 2,
      height: mt.h,
      tessellation: 16,
    }, scene);
    mountain.position.set(mt.x, mt.h / 2 - 0.9, mt.z);
    mountain.material = rockMat;

    // Snow Cap on High Peaks
    if (mt.h > 7.5) {
      const snow = MeshBuilder.CreateCylinder(`snow-${idx}`, {
        diameterTop: 0.1,
        diameterBottom: mt.r * 0.7,
        height: mt.h * 0.35,
        tessellation: 16,
      }, scene);
      snow.position.set(mt.x, mt.h - mt.h * 0.175 - 0.9, mt.z);
      snow.material = snowMat;
    }
  });

  // Forest Hill Ridge (South-West: X -20 to -12, Z -10 to -2)
  const forestHill = MeshBuilder.CreateSphere("forestHill", { diameter: 1, segments: 16 }, scene);
  forestHill.scaling.set(13, 3.8, 16);
  forestHill.position.set(-17, 0.4, -6);
  forestHill.material = soilMat;

  // --------------------------------------------------------------------------
  // 3. URBAN ROAD NETWORK & MARKINGS
  // --------------------------------------------------------------------------
  // North-South Avenues
  [-20, -14, -8, -2].forEach((x) => {
    const ave = MeshBuilder.CreatePlane(`ave-${x}`, { width: 2.2, height: 34 }, scene);
    ave.rotation.x = Math.PI / 2;
    ave.position.set(x, 0.02, 0);
    ave.material = roadMat;

    // Yellow centerline
    const line = MeshBuilder.CreatePlane(`aveLine-${x}`, { width: 0.12, height: 34 }, scene);
    line.rotation.x = Math.PI / 2;
    line.position.set(x, 0.025, 0);
    line.material = roadLineMat;

    // Sidewalks
    [-1.25, 1.25].forEach((offset) => {
      const sw = MeshBuilder.CreateBox(`sw-${x}-${offset}`, { width: 0.55, height: 0.08, depth: 34 }, scene);
      sw.position.set(x + offset, 0.035, 0);
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
  // 4. REALISTIC BUILDINGS WITH WINDOWS & DETAILS
  // --------------------------------------------------------------------------
  const buildings: BuildingInstance[] = [];
  let bIdx = 0;

  const blockCentersX = [-17, -11, -5];
  const blockCentersZ = [-8, 0, 8];

  blockCentersX.forEach((cx, colIdx) => {
    blockCentersZ.forEach((cz, rowIdx) => {
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
          // Modern Skyscraper (Glass & Steel)
          w = 2.4;
          d = 2.4;
          h = 7.5 + (bIdx % 3) * 1.8;
          mat = glassTowerMat;
        } else if (typeIndex === 1) {
          // Mid-rise Corporate Tower
          w = 2.2;
          d = 2.0;
          h = 5.2 + (bIdx % 2) * 1.4;
          mat = corporateMat;
        } else if (typeIndex === 2) {
          // Residential Apartment Block
          w = 2.2;
          d = 2.2;
          h = 4.2 + (bIdx % 3) * 0.8;
          mat = resMat;
        } else if (typeIndex === 3) {
          // Modern Commercial Center
          w = 2.5;
          d = 2.2;
          h = 3.6;
          mat = officeMat;
        } else {
          // Suburban Residential House
          w = 1.8;
          d = 1.8;
          h = 2.2;
          mat = houseWallMat;
        }

        const bBody = MeshBuilder.CreateBox(`bldg-${bIdx}`, { width: w, height: h, depth: d }, scene);
        bBody.position.set(bx, h / 2, bz);
        bBody.material = mat;

        // Window Panels along Facade
        if (typeIndex < 4) {
          const floors = Math.floor(h / 0.9);
          for (let f = 0; f < floors; f++) {
            const wy = -h / 2 + 0.45 + f * 0.9;
            // Front & Back Windows
            [-d / 2 - 0.015, d / 2 + 0.015].forEach((wz) => {
              const win = MeshBuilder.CreatePlane(`win-${bIdx}-${f}-${wz}`, { width: w * 0.75, height: 0.42 }, scene);
              win.position.set(0, wy, wz);
              if (wz < 0) win.rotation.y = Math.PI;
              win.material = windowGlassMat;
              win.parent = bBody; // PROPER LOCAL COORDINATES!
            });
          }

          // Rooftop Parapet Rim
          const roofTrim = MeshBuilder.CreateBox(`rfTrim-${bIdx}`, { width: w + 0.1, height: 0.15, depth: d + 0.1 }, scene);
          roofTrim.position.set(0, h / 2 + 0.08, 0);
          roofTrim.material = concMat;
          roofTrim.parent = bBody;

          // Rooftop HVAC Unit
          const hvac = MeshBuilder.CreateBox(`hvac-${bIdx}`, { width: w * 0.4, height: 0.45, depth: d * 0.4 }, scene);
          hvac.position.set(0.2, h / 2 + 0.28, 0);
          hvac.material = darkMetalMat;
          hvac.parent = bBody;

          // Communication Mast on Tall Towers
          if (h > 6.0) {
            const mast = MeshBuilder.CreateCylinder(`mast-${bIdx}`, { diameter: 0.08, height: 2.2 }, scene);
            mast.position.set(0, h / 2 + 1.15, 0);
            mast.material = cableMat;
            mast.parent = bBody;
          }
        } else {
          // Gabled Roof for Residential House
          const roofGable = MeshBuilder.CreateCylinder(`gable-${bIdx}`, {
            diameterTop: 0,
            diameterBottom: w * 1.45,
            height: 1.1,
            tessellation: 4,
          }, scene);
          roofGable.position.set(0, h / 2 + 0.55, 0);
          roofGable.rotation.y = Math.PI / 4;
          roofGable.material = redTileMat;
          roofGable.parent = bBody;
        }

        // Balconies for Residential Apartments
        if (typeIndex === 2) {
          const floors = Math.floor(h / 1.0);
          for (let f = 1; f < floors; f++) {
            const by = -h / 2 + f * 1.0;
            const balc = MeshBuilder.CreateBox(`balc-${bIdx}-${f}`, { width: w * 0.65, height: 0.12, depth: 0.35 }, scene);
            balc.position.set(0, by, d / 2 + 0.18);
            balc.material = darkMetalMat;
            balc.parent = bBody;
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
  const bridgeZ = 3.5;
  const bridgeStartX = 3.2;
  const bridgeEndX = 19.5;
  const bridgeLength = bridgeEndX - bridgeStartX;
  const bridgeMidX = (bridgeStartX + bridgeEndX) / 2;
  const bridgeDeckY = 1.7;

  // Bridge Deck
  const deck = MeshBuilder.CreateBox("bridgeDeck", { width: bridgeLength, height: 0.35, depth: 2.4 }, scene);
  deck.position.set(bridgeMidX, bridgeDeckY, bridgeZ);
  deck.material = roadMat;

  // Deck Yellow Median Strip
  const deckLine = MeshBuilder.CreatePlane("deckLine", { width: bridgeLength, height: 0.12 }, scene);
  deckLine.rotation.x = Math.PI / 2;
  deckLine.position.set(bridgeMidX, bridgeDeckY + 0.18, bridgeZ);
  deckLine.material = roadLineMat;

  // Guardrails
  [-1.15, 1.15].forEach((oz) => {
    const rail = MeshBuilder.CreateBox(`bridgeRail-${oz}`, { width: bridgeLength, height: 0.45, depth: 0.08 }, scene);
    rail.position.set(bridgeMidX, bridgeDeckY + 0.35, bridgeZ + oz);
    rail.material = concMat;
  });

  // Bridge Pylons (Twin Towers at X=7.5 and X=15.0)
  const pylonXPositions = [7.5, 15.0];
  pylonXPositions.forEach((px, pIdx) => {
    // Foundation Caisson Pier
    const pier = MeshBuilder.CreateBox(`pylonPier-${pIdx}`, { width: 1.8, height: 3.5, depth: 3.6 }, scene);
    pier.position.set(px, -0.6, bridgeZ);
    pier.material = concMat;

    // Dual Concrete Legs
    [-1.3, 1.3].forEach((pz) => {
      const leg = MeshBuilder.CreateBox(`pylonLeg-${pIdx}-${pz}`, { width: 0.55, height: 5.8, depth: 0.55 }, scene);
      leg.position.set(px, bridgeDeckY + 2.7, bridgeZ + pz);
      leg.material = concMat;
    });

    // Cross Beams
    [bridgeDeckY + 2.2, bridgeDeckY + 5.2].forEach((by, bIdx) => {
      const beam = MeshBuilder.CreateBox(`pylonBeam-${pIdx}-${bIdx}`, { width: 0.65, height: 0.35, depth: 2.7 }, scene);
      beam.position.set(px, by, bridgeZ);
      beam.material = concMat;
    });
  });

  // Parabolic Main Suspension Cables
  [-1.3, 1.3].forEach((cz) => {
    const cablePoints: Vector3[] = [];
    const numPoints = 24;
    for (let i = 0; i <= numPoints; i++) {
      const u = i / numPoints;
      const x = bridgeStartX + u * bridgeLength;
      let y = bridgeDeckY + 0.4;
      if (x < 7.5) {
        const t = (x - bridgeStartX) / (7.5 - bridgeStartX);
        y = bridgeDeckY + 0.4 + t * 4.8;
      } else if (x <= 15.0) {
        const t = (x - 7.5) / (15.0 - 7.5);
        y = bridgeDeckY + 5.2 - Math.sin(t * Math.PI) * 3.8;
      } else {
        const t = (x - 15.0) / (bridgeEndX - 15.0);
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

    // Vertical Hangers
    for (let k = 1; k < cablePoints.length - 1; k += 2) {
      const pt = cablePoints[k];
      if (pt.y > bridgeDeckY + 0.6) {
        const hgHeight = pt.y - (bridgeDeckY + 0.2);
        const hg = MeshBuilder.CreateCylinder(`hanger-${cz}-${k}`, {
          diameter: 0.02,
          height: hgHeight,
          tessellation: 6,
        }, scene);
        hg.position.set(pt.x, bridgeDeckY + 0.2 + hgHeight / 2, bridgeZ + cz);
        hg.material = cableMat;
      }
    }
  });

  // --------------------------------------------------------------------------
  // 6. VOLCANO ISLAND IN THE STRAIT (X: 23, Z: -6)
  // --------------------------------------------------------------------------
  // Volcano island is deliberately placed well beyond the bridge landing.
  const vx = 48;
  const vz = -14;

  // Island Base Shelf
  const vIsland = MeshBuilder.CreateCylinder("vIsland", {
    diameterTop: 12,
    diameterBottom: 15,
    height: 1.6,
    tessellation: 24,
  }, scene);
  vIsland.position.set(vx, -0.2, vz);
  vIsland.material = basaltMat;
  if (disaster !== "VOLCANO") { vIsland.isVisible = false; }

  // Main Volcanic Cone
  const volcano = MeshBuilder.CreateCylinder("volcanoCone", {
    diameterTop: 3.4,
    diameterBottom: 11.5,
    height: 6.8,
    tessellation: 32,
  }, scene);
  volcano.position.set(vx, 3.4, vz);
  volcano.material = basaltMat;
  if (disaster !== "VOLCANO") volcano.isVisible = false;

  // Crater Rim Magma Chamber Lake
  const craterMagma = MeshBuilder.CreateCylinder("craterMagma", {
    diameterTop: 3.0,
    diameterBottom: 2.6,
    height: 0.35,
    tessellation: 24,
  }, scene);
  craterMagma.position.set(vx, 6.75, vz);
  craterMagma.material = lavaMat;
  if (disaster !== "VOLCANO") craterMagma.isVisible = false;

  // Lava Flow Path down flank
  const lavaPath = [
    new Vector3(vx, 6.7, vz + 0.8),
    new Vector3(vx - 0.9, 5.4, vz + 1.8),
    new Vector3(vx - 1.8, 3.8, vz + 2.9),
    new Vector3(vx - 3.0, 2.0, vz + 4.0),
    new Vector3(vx - 4.5, 0.25, vz + 4.8),
  ];
  const lavaFlow = MeshBuilder.CreateTube("lavaFlow", {
    path: lavaPath,
    radius: 0.35,
    tessellation: 8,
  }, scene);
  lavaFlow.material = lavaMat;
  if (disaster !== "VOLCANO") lavaFlow.isVisible = false;

  // Dynamic Crater Point Light
  const volcanoLight = new PointLight("volcanoLight", new Vector3(vx, 7.8, vz), scene);
  volcanoLight.diffuse = new Color3(1.0, 0.45, 0.1);
  volcanoLight.range = 30;
  volcanoLight.intensity = disaster === "VOLCANO" ? 2.8 : 0.8;
  volcanoLight.setEnabled(disaster === "VOLCANO");

  // --------------------------------------------------------------------------
  // 7. TREES & FORESTRY (Western Ridge & Streets)
  // --------------------------------------------------------------------------
  const trees: TreeInstance[] = [];
  const ignitionPoint = { x: -22, z: -12 };
  let tIdx = 0;

  for (let i = 0; i < 42; i++) {
    const tx = -23 + (i % 7) * 1.8 + Math.sin(i * 3.7) * 0.4;
    const tz = -13 + Math.floor(i / 7) * 1.6 + Math.cos(i * 2.3) * 0.4;
    tIdx++;

    const trunkH = 1.2 + (i % 3) * 0.2;
    const trunk = MeshBuilder.CreateCylinder(`treeTr-${tIdx}`, {
      diameterTop: 0.14,
      diameterBottom: 0.24,
      height: trunkH,
      tessellation: 6,
    }, scene);
    trunk.position.set(tx, trunkH / 2, tz);
    trunk.material = woodMat;

    const crowns: Mesh[] = [];
    const lMat = i % 3 === 0 ? leafMat1 : i % 3 === 1 ? leafMat2 : leafMat3;
    for (let tier = 0; tier < 3; tier++) {
      const crw = MeshBuilder.CreateCylinder(`treeCr-${tIdx}-${tier}`, {
        diameterTop: 0,
        diameterBottom: 1.5 - tier * 0.35,
        height: 0.95,
        tessellation: 7,
      }, scene);
      crw.position.set(tx, trunkH + 0.4 + tier * 0.6, tz);
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

  // Boulevard Street Trees
  [-17, -11, -5].forEach((sx) => {
    [-10, -2, 6, 14].forEach((sz) => {
      tIdx++;
      const trunk = MeshBuilder.CreateCylinder(`streetTr-${tIdx}`, {
        diameterTop: 0.12,
        diameterBottom: 0.2,
        height: 1.4,
        tessellation: 6,
      }, scene);
      trunk.position.set(sx + 2.5, 0.7, sz);
      trunk.material = woodMat;

      const canopy = MeshBuilder.CreateSphere(`streetCan-${tIdx}`, { diameter: 1.4, segments: 7 }, scene);
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
    crack.material = createMat(scene, `crackMat-${i}`, new Color3(0.08, 0.06, 0.05));
    faultCracks.push(crack);
  }

  // Mud Lake for Liquefaction
  const mudLake = MeshBuilder.CreateGround("mudLake", { width: 14, height: 16, subdivisions: 8 }, scene);
  mudLake.position.set(-11, 0.035, 0);
  const mudMat = createMat(scene, "mudMat", new Color3(0.38, 0.32, 0.24));
  mudMat.alpha = 0;
  mudLake.material = mudMat;

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
    buildings,
    trees,
    faultCracks,
    mudLake,
    updateNightMode,
  };
}
