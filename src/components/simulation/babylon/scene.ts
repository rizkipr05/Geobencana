import {
  Color3, DirectionalLight, HemisphericLight, MeshBuilder, PBRMaterial, Scene, StandardMaterial, Vector3,
} from "@babylonjs/core";
import type { SimDisasterType } from "../types";

const mat = (scene: Scene, name: string, color: Color3, roughness = 0.8) => {
  const m = new PBRMaterial(name, scene);
  m.albedoColor = color;
  m.metallic = 0.05;
  m.roughness = roughness;
  return m;
};

function box(scene: Scene, name: string, position: Vector3, size: Vector3, material: PBRMaterial | StandardMaterial) {
  const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, scene);
  mesh.position.copyFrom(position);
  mesh.material = material;
  mesh.receiveShadows = true;
  return mesh;
}

function addBuilding(scene: Scene, x: number, z: number, index: number, concrete: PBRMaterial, glass: PBRMaterial, roof: PBRMaterial) {
  const types = index % 5;
  const width = types === 0 ? 3.6 : 2.1 + (index % 3) * 0.3;
  const depth = types === 0 ? 3.4 : 2.2;
  const floors = types === 0 ? 4 + (index % 2) : types < 3 ? 9 + (index % 5) : 2;
  const height = floors * 0.72;
  const body = MeshBuilder.CreateBox(`building-${index}`, { width, height, depth }, scene);
  body.position.set(x, height / 2, z);
  body.material = types === 1 ? glass : concrete;
  body.receiveShadows = true;
  // Recessed facade bays and balconies are actual projecting elements, not a window texture.
  for (let floor = 0; floor < floors; floor++) {
    const y = 0.3 + floor * 0.72;
    const columns = types === 4 ? 1 : 2;
    for (let col = 0; col < columns; col++) {
      const wx = x + (col - (columns - 1) / 2) * (width * 0.42);
      box(scene, `window-${index}-${floor}-${col}`, new Vector3(wx, y, z - depth / 2 - 0.035), new Vector3(width * 0.22, 0.34, 0.07), glass);
      if (types === 0 && floor > 0) box(scene, `balcony-${index}-${floor}-${col}`, new Vector3(wx, y - 0.19, z - depth / 2 - 0.2), new Vector3(width * 0.3, 0.07, 0.38), roof);
    }
  }
  box(scene, `roof-${index}`, new Vector3(x, height + 0.12, z), new Vector3(width + 0.18, 0.24, depth + 0.18), roof);
  if (types === 4) {
    const gable = MeshBuilder.CreateCylinder(`house-roof-${index}`, { diameterTop: 0, diameterBottom: width * 1.5, height: 1.1, tessellation: 4 }, scene);
    gable.position.set(x, height + 0.65, z);
    gable.rotation.y = Math.PI / 4;
    gable.material = roof;
  }
}

function addTree(scene: Scene, x: number, z: number, i: number, trunkMat: PBRMaterial, leafMat: PBRMaterial) {
  const trunk = MeshBuilder.CreateCylinder(`trunk-${i}`, { height: 1.8, diameterTop: 0.2, diameterBottom: 0.34, tessellation: 7 }, scene);
  trunk.position.set(x, 0.9, z); trunk.material = trunkMat;
  const crown = MeshBuilder.CreateSphere(`crown-${i}`, { diameter: 1, segments: 7 }, scene);
  crown.scaling.set(0.75 + (i % 3) * 0.12, 1.0 + (i % 4) * 0.16, 0.72 + (i % 2) * 0.2);
  crown.position.set(x, 2.0 + (i % 3) * 0.18, z); crown.material = leafMat;
}

export function createDisasterScene(scene: Scene, disaster: SimDisasterType) {
  scene.clearColor.set(0.67, 0.76, 0.79, 1);
  new HemisphericLight("sky-fill", new Vector3(0.1, 1, 0.2), scene).intensity = 0.72;
  const sun = new DirectionalLight("sun", new Vector3(-0.55, -1, 0.35), scene);
  sun.position.set(25, 45, -20); sun.intensity = 1.9;

  const land = mat(scene, "coastal-soil", new Color3(0.32, 0.38, 0.29));
  const grass = mat(scene, "vegetation", new Color3(0.22, 0.34, 0.22));
  const road = mat(scene, "asphalt", new Color3(0.12, 0.14, 0.15), 0.94);
  const concrete = mat(scene, "warm-concrete", new Color3(0.58, 0.56, 0.51));
  const glass = mat(scene, "blue-glass", new Color3(0.16, 0.31, 0.38), 0.18);
  const roof = mat(scene, "roof-metal", new Color3(0.24, 0.27, 0.28), 0.48);
  const wood = mat(scene, "tree-trunk", new Color3(0.25, 0.17, 0.1));
  const canopy = mat(scene, "tree-canopy", new Color3(0.14, 0.26, 0.16));

  // Main land mass, with the open water kept to the eastern edge.
  box(scene, "mainland", new Vector3(-5, -0.65, 0), new Vector3(52, 1.3, 44), land);
  const seabed = mat(scene, "shallow-seabed", new Color3(0.11, 0.24, 0.27));
  box(scene, "seabed", new Vector3(29, -1.8, 0), new Vector3(18, 0.9, 44), seabed);
  const water = new StandardMaterial("coastal-water", scene);
  water.diffuseColor = new Color3(0.08, 0.34, 0.42); water.specularColor = new Color3(0.72, 0.82, 0.86); water.alpha = 0.82;
  const sea = MeshBuilder.CreateGround("sea", { width: 22, height: 44, subdivisions: 48 }, scene);
  sea.position.set(29, -0.62, 0); sea.material = water; sea.receiveShadows = true;

  // Connected orthogonal street grid forms blocks; buildings sit on parcels beside streets.
  for (const x of [-20, -11, -2, 7, 16]) box(scene, `avenue-${x}`, new Vector3(x, 0.015, 0), new Vector3(1.35, 0.05, 39), road);
  for (const z of [-15, -5, 5, 15]) box(scene, `cross-street-${z}`, new Vector3(-3, 0.02, z), new Vector3(44, 0.06, 1.35), road);
  let buildingIndex = 0;
  for (const x of [-16, -7, 2, 11]) for (const z of [-10, 0, 10]) {
    addBuilding(scene, x + 2, z + 2, buildingIndex++, concrete, glass, roof);
  }

  // Bridge runs east from a road on the mainland to a small, low island with a road landing.
  const island = mat(scene, "island-ground", new Color3(0.37, 0.39, 0.29));
  box(scene, "bridge-island", new Vector3(39.5, -0.45, 0), new Vector3(5.5, 1.1, 10), island);
  box(scene, "bridge-deck", new Vector3(24, 0.85, 0), new Vector3(13, 0.45, 4.2), road);
  box(scene, "bridge-road-landing", new Vector3(18, 0.08, 0), new Vector3(3.5, 0.08, 4.2), road);
  for (const z of [-1.9, 1.9]) box(scene, `bridge-rail-${z}`, new Vector3(24, 1.45, z), new Vector3(13, 0.75, 0.16), roof);
  for (const x of [21, 27]) {
    const pier = MeshBuilder.CreateCylinder(`bridge-pier-${x}`, { height: 1.6, diameter: 0.7, tessellation: 10 }, scene);
    pier.position.set(x, 0, 0); pier.material = concrete;
  }
  box(scene, "island-road", new Vector3(39.5, 0.12, 0), new Vector3(5.5, 0.06, 2.2), road);

  // Beach transition and coastal promenade.
  const sand = mat(scene, "beach-sand", new Color3(0.62, 0.55, 0.39));
  box(scene, "beach", new Vector3(22.5, -0.04, 0), new Vector3(2.2, 0.16, 36), sand);
  box(scene, "promenade", new Vector3(19.8, 0.12, 0), new Vector3(1.1, 0.12, 30), concrete);

  // Distant island volcano lives outside bridge alignment, with a visible crater rim and lava channel.
  const volcanic = mat(scene, "volcanic-ash", new Color3(0.22, 0.2, 0.18));
  const lavaMat = new StandardMaterial("lava", scene); lavaMat.diffuseColor = new Color3(1, 0.2, 0.035); lavaMat.emissiveColor = new Color3(0.9, 0.1, 0.01);
  const cone = MeshBuilder.CreateCylinder("volcano-cone", { height: 10, diameterTop: 5.8, diameterBottom: 18, tessellation: 32 }, scene);
  cone.position.set(49, 4.4, -15); cone.material = volcanic;
  const crater = MeshBuilder.CreateCylinder("crater", { height: 0.25, diameterTop: 5.5, diameterBottom: 4.2, tessellation: 32 }, scene);
  crater.position.set(49, 9.1, -15); crater.material = lavaMat;
  const lava = MeshBuilder.CreateTube("lava-flow", { path: [new Vector3(49, 7.8, -14), new Vector3(50, 6, -11), new Vector3(52, 3, -9), new Vector3(53, 0.3, -7)], radius: 0.24, tessellation: 8 }, scene);
  lava.material = lavaMat;

  for (let i = 0; i < 64; i++) {
    const x = -23 + (i * 17 % 39), z = -20 + (i * 29 % 40);
    if (Math.abs(x % 9) < 1.3 || Math.abs(z % 10) < 1.4) continue;
    addTree(scene, x, z, i, wood, canopy);
  }
  // Forested slope on the western edge provides an independent wildfire landscape.
  const hill = MeshBuilder.CreateSphere("forested-ridge", { diameter: 1, segments: 20 }, scene);
  hill.scaling.set(9, 4.5, 17); hill.position.set(-27, 1.4, -3); hill.material = grass;
  for (let i = 0; i < 24; i++) addTree(scene, -31 + (i % 4) * 2.1, -15 + Math.floor(i / 4) * 3.4, 100 + i, wood, canopy);

  // Low-rise public facilities are marked as campus blocks beside the connected street grid.
  const facility = mat(scene, "public-facility", new Color3(0.67, 0.65, 0.58));
  for (const [x, z, label] of [[-18, 17, "hospital"], [4, 17, "school"]] as const) {
    const block = MeshBuilder.CreateBox(label, { width: 5.5, height: 2.7, depth: 4.5 }, scene);
    block.position.set(x, 1.35, z); block.material = facility;
    box(scene, `${label}-wing`, new Vector3(x + 3.2, 0.9, z + 0.3), new Vector3(1.1, 1.8, 3.4), concrete);
  }

  // Scene variants emphasize their terrain while keeping shared, navigable geography intact.
  if (disaster === "WILDFIRE") { grass.albedoColor = new Color3(0.25, 0.32, 0.2); }
  if (disaster === "LIQUEFACTION") {
    const crackMat = mat(scene, "soft-soil-cracks", new Color3(0.17, 0.2, 0.18));
    for (let i = 0; i < 6; i++) {
      const crack = MeshBuilder.CreateBox(`ground-fissure-${i}`, { width: 0.12, height: 0.03, depth: 8 + (i % 3) * 2 }, scene);
      crack.position.set(-14 + i * 3, 0.04, (i % 2 ? 1 : -1) * 3); crack.rotation.y = 0.18 * (i % 3); crack.material = crackMat;
    }
  }
  return { water: sea, volcano: cone, lava };
}
