"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Camera,
  Play,
  RotateCcw,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Activity,
  Maximize2,
  Minimize2,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  playEarthquakeRumble,
  playVolcanoBlast,
  playTsunamiSurge,
  playTransformerSparks,
  startEmergencySiren,
  stopEmergencySiren,
} from "@/lib/emergency-siren";

export type DisasterMode = "EARTHQUAKE" | "TSUNAMI" | "VOLCANO" | "LIQUEFACTION";
export type CameraPreset = "orbit" | "city" | "coast" | "crater" | "fault";

interface SimulationParams {
  magnitude: number;
  depthKm: number;
  slipMeters: number;
  isTsunamiActive: boolean;
  isSimulating: boolean;
  mechanism?: "SUBDUCTION" | "STRIKE_SLIP" | "NORMAL";
  disasterType?: DisasterMode;
  onDisasterTypeChange?: (mode: DisasterMode) => void;
  onSimulatingChange?: (running: boolean) => void;
}

// Camera presets calibrated for the strait, volcanic island, and mainland bridge
const CAMERA_PRESETS: Record<CameraPreset, [[number, number, number], [number, number, number]]> = {
  orbit: [
    [26, 25, 28],
    [0, 2, 0],
  ],
  city: [
    [-6, 9, 14],
    [-12, 3, 0],
  ],
  coast: [
    [-1, 6, 13],
    [6, 2, 3],
  ],
  crater: [
    [17, 9, 8],
    [13, 5, 0],
  ],
  fault: [
    [-12, -2, 22],
    [-12, -1, 0],
  ],
};

export function ThreeEarthquakeCanvas({
  magnitude,
  depthKm,
  slipMeters,
  isTsunamiActive,
  isSimulating,
  mechanism = "SUBDUCTION",
  disasterType = "EARTHQUAKE",
  onDisasterTypeChange,
  onSimulatingChange,
}: SimulationParams) {
  const mountRef = useRef<HTMLDivElement>(null);
  const seismoCanvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // Local state
  const [activeDisaster, setActiveDisaster] = useState<DisasterMode>(disasterType);
  const [cameraView, setCameraView] = useState<CameraPreset>("coast");
  const [isNight, setIsNight] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [warningBanner, setWarningBanner] = useState<string>("");
  const [pgaDisplay, setPgaDisplay] = useState<string>("0.00");
  const [simTime, setSimTime] = useState<number>(0);

  // Sync internal disaster type with prop
  useEffect(() => {
    if (disasterType) {
      setActiveDisaster(disasterType);
    }
  }, [disasterType]);

  // Sync camera preset when disaster type changes
  useEffect(() => {
    if (disasterType === "TSUNAMI") setCameraView("coast");
    else if (disasterType === "VOLCANO") setCameraView("crater");
    else if (disasterType === "LIQUEFACTION") setCameraView("city");
    else if (disasterType === "EARTHQUAKE") setCameraView("city");
  }, [disasterType]);

  // Handle disaster mode change
  const handleSelectMode = (mode: DisasterMode) => {
    setActiveDisaster(mode);
    onDisasterTypeChange?.(mode);
  };

  // State refs for animation loop
  const stateRef = useRef({
    mw: magnitude,
    depth: depthKm,
    slip: slipMeters,
    mech: mechanism === "SUBDUCTION" ? "megathrust" : mechanism === "NORMAL" ? "normal" : "strike",
    mode: disasterType.toLowerCase(),
    cam: cameraView,
    run: isSimulating,
    night: isNight,
    t: 0,
  });

  // Keep stateRef in sync with props and state
  useEffect(() => {
    stateRef.current.mw = magnitude;
    stateRef.current.depth = depthKm;
    stateRef.current.slip = slipMeters;
    stateRef.current.mech =
      mechanism === "SUBDUCTION" ? "megathrust" : mechanism === "NORMAL" ? "normal" : "strike";
    stateRef.current.mode = activeDisaster === "EARTHQUAKE" ? "quake" : activeDisaster.toLowerCase();
    stateRef.current.run = isSimulating;
    stateRef.current.night = isNight;
    stateRef.current.cam = cameraView;
  }, [magnitude, depthKm, slipMeters, mechanism, activeDisaster, isSimulating, isNight, cameraView]);

  // Target camera lerping
  const targetCamPos = useRef(new THREE.Vector3(...CAMERA_PRESETS.coast[0]));
  const targetCamLook = useRef(new THREE.Vector3(...CAMERA_PRESETS.coast[1]));
  const camLerpWeight = useRef(0);

  const switchCamera = useCallback((k: CameraPreset) => {
    setCameraView(k);
    stateRef.current.cam = k;
    targetCamPos.current.set(...CAMERA_PRESETS[k][0]);
    targetCamLook.current.set(...CAMERA_PRESETS[k][1]);
    camLerpWeight.current = 2.5;
  }, []);

  // Update camera on preset change
  useEffect(() => {
    switchCamera(cameraView);
  }, [cameraView, switchCamera]);

  // Sound triggers based on simulation state
  useEffect(() => {
    if (!isSimulating || !soundEnabled) {
      stopEmergencySiren();
      return;
    }

    if (activeDisaster === "VOLCANO") {
      playVolcanoBlast(5.0);
    } else if (activeDisaster === "TSUNAMI" || isTsunamiActive) {
      playTsunamiSurge(6.5);
      playEarthquakeRumble(5.0);
      startEmergencySiren();
    } else if (activeDisaster === "EARTHQUAKE") {
      playEarthquakeRumble(5.0);
      setTimeout(() => playTransformerSparks(), 1400);
      if (magnitude >= 7.0) startEmergencySiren();
    } else if (activeDisaster === "LIQUEFACTION") {
      playEarthquakeRumble(6.0);
    }

    return () => {
      stopEmergencySiren();
    };
  }, [isSimulating, activeDisaster, isTsunamiActive, soundEnabled, magnitude]);

  // Main Three.js Scene Setup
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 300);
    camera.position.set(...CAMERA_PRESETS.coast[0]);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.02;
    controls.minDistance = 6;
    controls.maxDistance = 150;
    controls.target.set(...CAMERA_PRESETS.coast[1]);
    controlsRef.current = controls;

    // Lighting
    const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 0.85);
    const sun = new THREE.DirectionalLight(0xffffff, 0.95);
    sun.position.set(15, 25, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 80 });
    sun.shadow.bias = -0.0004;
    scene.add(hemi, sun);

    const world = new THREE.Group();
    scene.add(world);

    // Helpers
    const mat = (c: THREE.ColorRepresentation, o: THREE.MeshStandardMaterialParameters = {}) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
    const box = (w: number, h: number, d: number, m: THREE.Material) =>
      new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);

    // Procedural Grass Texture
    const gk = document.createElement("canvas");
    gk.width = gk.height = 128;
    const gx = gk.getContext("2d")!;
    gx.fillStyle = "#8ea862";
    gx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 2400; i++) {
      const v = (140 + Math.random() * 110) | 0;
      gx.fillStyle = `rgb(${v - 25},${v},${v - 40})`;
      gx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    const gt = new THREE.CanvasTexture(gk);
    gt.wrapS = gt.wrapT = THREE.RepeatWrapping;
    gt.repeat.set(5, 5);
    gt.colorSpace = THREE.SRGBColorSpace;

    // 1. DARATAN KOTA UTAMA (Sisi Barat X: -22 s/d -2.5)
    const ground = box(19.5, 1, 30, mat(0x8aa860, { map: gt }));
    ground.receiveShadow = true;
    ground.position.set(-12.25, -0.5, 0);
    world.add(ground);

    const sandBeach = box(0.8, 0.96, 30, mat(0xd6c59b));
    sandBeach.position.set(-2.4, -0.52, 0);
    world.add(sandBeach);

    const layer = box(19.5, 1.2, 30, mat(0xb3202f));
    layer.position.set(-12.25, -1.6, 0);
    world.add(layer);

    const base = box(19.5, 6, 30, mat(0x3b3f46));
    base.position.set(-12.25, -5.2, 0);
    world.add(base);

    const seabed = box(32, 5, 32, mat(0x1a2634));
    seabed.position.set(13.5, -4.5, 0);
    world.add(seabed);

    // 2. GEDUNG KOTA DI DARATAN BARAT
    const N = 56;
    interface BuildingData {
      x: number;
      z: number;
      w: number;
      h: number;
      ph: number;
    }
    const Bd: BuildingData[] = [];
    for (let i = 0; i < N; i++) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      Bd.push({
        x: -18.2 + col * 1.85 + Math.random() * 0.35,
        z: -6.5 + row * 1.9 + Math.random() * 0.35,
        w: 0.85 + Math.random() * 0.5,
        h: 1.2 + Math.random() * 3.8,
        ph: Math.random() * 6.28,
      });
    }

    const bg = new THREE.BoxGeometry(1, 1, 1);
    bg.translate(0, 0.5, 0);

    function createWinTexture(lit: boolean) {
      const k = document.createElement("canvas");
      k.width = 64;
      k.height = 128;
      const x = k.getContext("2d")!;
      x.fillStyle = lit ? "#000000" : "#aab3ba";
      x.fillRect(0, 0, 64, 128);
      for (let r = 0; r < 8; r++) {
        for (let q = 0; q < 4; q++) {
          const on = (r * 7 + q * 13) % 5 < 3;
          x.fillStyle = lit ? (on ? "#ffd27a" : "#000000") : "#27394a";
          x.fillRect(5 + q * 15, 6 + r * 15, 9, 10);
        }
      }
      const t = new THREE.CanvasTexture(k);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    const bm = mat(0xffffff, {
      map: createWinTexture(false),
      emissive: 0xffffff,
      emissiveMap: createWinTexture(true),
      emissiveIntensity: 0,
    });
    const roof = mat(0x7d8790);
    const city = new THREE.InstancedMesh(bg, [bm, bm, roof, roof, bm, bm], N);
    city.castShadow = true;
    city.receiveShadow = true;
    world.add(city);

    const cc = new THREE.Color();
    Bd.forEach((_, i) => city.setColorAt(i, cc.setHSL(0.55, 0.08, 0.6 + Math.random() * 0.25)));
    city.instanceColor!.needsUpdate = true;
    const dm = new THREE.Object3D();

    // 3. POHON DI DARATAN KOTA
    const NT = 60;
    const trGeom = new THREE.CylinderGeometry(0.06, 0.09, 0.6, 5);
    trGeom.translate(0, 0.3, 0);
    const tcGeom = new THREE.ConeGeometry(0.45, 1.4, 7);
    tcGeom.translate(0, 1.2, 0);
    const tr = new THREE.InstancedMesh(trGeom, mat(0x5a3d26), NT);
    const tc = new THREE.InstancedMesh(tcGeom, mat(0x2f6b3a), NT);
    const td = new THREE.Object3D();
    let tn = 0;
    for (let i = 0; tn < NT && i < 2000; i++) {
      const x = -21 + Math.random() * 17.5;
      const z = -13 + Math.random() * 26;
      if (x > -16.5 && x < -4.5 && z > -7.5 && z < 4.5) continue;
      const s = 0.7 + Math.random() * 0.8;
      td.position.set(x, 0, z);
      td.rotation.set(0, Math.random() * 6, 0);
      td.scale.set(s, s, s);
      td.updateMatrix();
      tr.setMatrixAt(tn, td.matrix);
      tc.setMatrixAt(tn++, td.matrix);
    }
    tr.count = tc.count = tn;
    tc.castShadow = tr.castShadow = true;
    world.add(tr, tc);

    // 4. PEGUNUNGAN LATAR BELAKANG DARATAN KOTA
    [
      [-20, -13.5, 5.2, 7.2],
      [-15, -13.8, 4.5, 5.8],
      [-10, -13.2, 4.2, 6.2],
      [-6, -13.6, 3.6, 4.8],
    ].forEach((a) => {
      const m = new THREE.Mesh(new THREE.ConeGeometry(a[2], a[3], 6), mat(0x5f6f63));
      m.position.set(a[0], a[3] / 2, a[1]);
      world.add(m);
    });

    // 5. PULAU GUNUNG BERAPI DI TENGAH LAUT (X = 13, Z = 0)
    const islandBase = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 7.8, 1.2, 32), mat(0x3d352e));
    islandBase.position.set(13, -0.1, 0);
    islandBase.receiveShadow = true;
    world.add(islandBase);

    const islandSlope = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 6.2, 0.8, 32), mat(0x22262a));
    islandSlope.position.set(13, 0.4, 0);
    world.add(islandSlope);

    // Kerucut kawah prosedural
    const vm = mat(0xffffff, { emissive: 0xff4a00, emissiveIntensity: 0 });
    const vg = new THREE.CylinderGeometry(1.0, 3.8, 5.0, 48, 16, true);
    const vp = vg.attributes.position;
    const vcl = new Float32Array(vp.count * 3);
    for (let i = 0; i < vp.count; i++) {
      const x = vp.getX(i);
      const y = vp.getY(i);
      const z = vp.getZ(i);
      const n = Math.sin(x * 2.8 + z * 2.2) * Math.sin(z * 3.5 - y * 1.8) + 0.5 * Math.sin(x * 6 + y * 4.5);
      const r = 1 + n * 0.08;
      vp.setX(i, x * r);
      vp.setZ(i, z * r);
      const t0 = (y + 2.5) / 5.0;
      const st = Math.sin(Math.atan2(z, x) * 6 + y * 2) > 0.65 && t0 > 0.4 ? 1 : 0;
      const gv = 0.15 + n * 0.04 + t0 * 0.06;
      vcl[i * 3] = gv + st * 0.55;
      vcl[i * 3 + 1] = gv * 0.8 + st * 0.12;
      vcl[i * 3 + 2] = gv * 0.75;
    }
    vg.setAttribute("color", new THREE.BufferAttribute(vcl, 3));
    vg.computeVertexNormals();
    vm.vertexColors = true;
    vm.flatShading = true;
    const vol = new THREE.Mesh(vg, vm);
    vol.position.set(13, 2.5, 0);
    vol.castShadow = vol.receiveShadow = true;
    world.add(vol);

    const lavaCircle = new THREE.CircleGeometry(1.05, 32);
    lavaCircle.rotateX(-Math.PI / 2);
    const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff6a1a });
    const lava = new THREE.Mesh(lavaCircle, lavaMat);
    lava.position.set(13, 4.95, 0);
    world.add(lava);

    const lavaStream = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 3.8, 0.15),
      mat(0xff4500, { emissive: 0xff2200, emissiveIntensity: 0.8 })
    );
    lavaStream.position.set(11.4, 2.3, 0.6);
    lavaStream.rotation.set(0.3, -0.5, -0.7);
    world.add(lavaStream);

    const vlight = new THREE.PointLight(0xff5a1a, 0, 28);
    vlight.position.set(13, 5.8, 0);
    world.add(vlight);

    // 6. JEMBATAN MEMBENTANG DARI KOTA MELINTASI SELAT AIR KE PULAU SEBERANG
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(2.0, 0, 5.0);
    world.add(bridgeGroup);

    // Abutment kota di barat jembatan
    const abCity = box(1.6, 1.3, 2.2, mat(0x4b5563));
    abCity.position.set(-5.6, 0.45, 0);
    bridgeGroup.add(abCity);

    // Abutment pulau seberang
    const abIsland = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, 1.4, 16), mat(0x334155));
    abIsland.position.set(5.6, 0.2, 0);
    bridgeGroup.add(abIsland);

    // Pilar penyangga menembus air
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.3, 16), mat(0x4b5563));
    p1.position.set(-2.8, 0.2, 0);
    bridgeGroup.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 2.3, 16), mat(0x4b5563));
    p2.position.set(2.8, 0.2, 0);
    bridgeGroup.add(p2);

    // Pylon jembatan gantung di tengah bentang selat
    const pylonBase = box(1.2, 2.2, 2.4, mat(0x4b5563));
    pylonBase.position.set(0, -0.1, 0);
    bridgeGroup.add(pylonBase);

    const py1 = box(0.35, 3.6, 0.35, mat(0xf3f4f6));
    py1.position.set(0, 2.6, 0.9);
    bridgeGroup.add(py1);

    const py2 = box(0.35, 3.6, 0.35, mat(0xf3f4f6));
    py2.position.set(0, 2.6, -0.9);
    bridgeGroup.add(py2);

    const pyTop = box(0.4, 0.3, 2.1, mat(0xf3f4f6));
    pyTop.position.set(0, 4.2, 0);
    bridgeGroup.add(pyTop);

    // Geladak jembatan di atas aliran air selat (Y = 1.35)
    const deck = box(11.2, 0.25, 1.6, mat(0x374151));
    deck.position.set(0, 1.35, 0);
    deck.castShadow = true;
    bridgeGroup.add(deck);

    // Marka jalan jembatan
    const lineDeckGeo = new THREE.PlaneGeometry(11.0, 0.08);
    lineDeckGeo.rotateX(-Math.PI / 2);
    const lineDeck = new THREE.Mesh(lineDeckGeo, new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    lineDeck.position.set(0, 0.13, 0);
    deck.add(lineDeck);

    // Railing pengaman kiri & kanan
    const r1 = box(11.2, 0.28, 0.06, mat(0xd1d5db, { metalness: 0.3, roughness: 0.5 }));
    r1.position.set(0, 0.25, 0.76);
    deck.add(r1);

    const r2 = box(11.2, 0.28, 0.06, mat(0xd1d5db, { metalness: 0.3, roughness: 0.5 }));
    r2.position.set(0, 0.25, -0.76);
    deck.add(r2);

    // Kabel-kabel baja suspensi simetris sempurna
    const cableMat = mat(0xe2e8f0, { metalness: 0.6, roughness: 0.3 });
    function addCable(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) {
      const v1 = new THREE.Vector3(x1, y1, z1);
      const v2 = new THREE.Vector3(x2, y2, z2);
      const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(v2, v1);
      const len = dir.length();
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, len, 6), cableMat);
      cyl.position.copy(mid);
      cyl.setRotationFromQuaternion(quat);
      deck.add(cyl);
    }

    [
      [1.4, 2.3],
      [2.8, 2.65],
      [4.2, 2.95],
    ].forEach(([dx, py]) => {
      addCable(-dx, 0.22, 0.76, 0, py, 0.88); // Barat Selatan
      addCable(dx, 0.22, 0.76, 0, py, 0.88); // Timur Selatan
      addCable(-dx, 0.22, -0.76, 0, py, -0.88); // Barat Utara
      addCable(dx, 0.22, -0.76, 0, py, -0.88); // Timur Utara
    });

    // 7. LAUT & SELAT AIR MENGALIR DI BAWAH JEMBATAN (Pusat X = 13.5, Z = 0)
    const sgeo = new THREE.PlaneGeometry(32, 32, 64, 64);
    sgeo.rotateX(-Math.PI / 2);
    sgeo.setAttribute("color", new THREE.BufferAttribute(new Float32Array(sgeo.attributes.position.count * 3), 3));
    const seaMat = mat(0xffffff, {
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      roughness: 0.15,
      metalness: 0.3,
    });
    const sea = new THREE.Mesh(sgeo, seaMat);
    sea.receiveShadow = true;
    sea.position.set(13.5, -0.3, 0);
    world.add(sea);

    const flood = box(14, 1.2, 30, mat(0x1a6b8c, { transparent: true, opacity: 0.75 }));
    flood.position.set(-2.5, -0.3, 0);
    flood.scale.x = 0.001;
    world.add(flood);

    // Lumpur likuifaksi & retakan patahan
    const mudCircle = new THREE.CircleGeometry(8, 32);
    mudCircle.rotateX(-Math.PI / 2);
    const mudMat = mat(0x6b4f33, { transparent: true, opacity: 0 });
    const mud = new THREE.Mesh(mudCircle, mudMat);
    mud.position.set(-11, 0.03, -2);
    world.add(mud);

    const ck: THREE.Mesh[] = [];
    for (let i = 0; i < 12; i++) {
      const k = box(1, 0.03, 0.1, mat(0x151210));
      k.position.set(-11 + (Math.random() - 0.5) * 3, 0.03, -9 + i * 1.6);
      k.rotation.y = Math.PI / 2 + (Math.random() - 0.5) * 1.1;
      k.scale.x = 0.001;
      k.userData.L = 1.5 + Math.random() * 2.2;
      world.add(k);
      ck.push(k);
    }

    // 8. PARTIKEL SISTEM DENGAN SHADER
    const NP = 700;
    const pp = new Float32Array(NP * 3).fill(-100);
    const pc = new Float32Array(NP * 3);
    const pv = new Float32Array(NP * 3);
    const pl = new Float32Array(NP);
    const pk = new Uint8Array(NP);
    let pi = 0;

    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3));
    pg.setAttribute("color", new THREE.BufferAttribute(pc, 3));
    const ps = new Float32Array(NP);
    const pa = new Float32Array(NP);
    const pL0 = new Float32Array(NP).fill(1);
    pg.setAttribute("sz", new THREE.BufferAttribute(ps, 1));
    pg.setAttribute("al", new THREE.BufferAttribute(pa, 1));

    const PU = { uS: { value: 800 } };
    const pts = new THREE.Points(
      pg,
      new THREE.ShaderMaterial({
        uniforms: PU,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        vertexShader: `
          attribute float sz;
          attribute float al;
          varying vec3 vc;
          varying float va;
          uniform float uS;
          void main() {
            vc = color;
            va = al;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = sz * uS / -mv.z;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          varying vec3 vc;
          varying float va;
          void main() {
            float d = length(gl_PointCoord - 0.5);
            float a = smoothstep(0.5, 0.1, d) * va;
            if (a < 0.01) discard;
            gl_FragColor = vec4(vc, a);
          }
        `,
      })
    );
    pts.frustumCulled = false;
    world.add(pts);

    function emit(k: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number) {
      const i = pi++ % NP;
      pp.set([x, y, z], i * 3);
      pv.set([vx, vy, vz], i * 3);
      pl[i] = pL0[i] = life;
      pk[i] = k;
    }

    // Sky Background Canvas Textures
    function makeSkyTexture(a: string, b: string, c: string) {
      const k = document.createElement("canvas");
      k.width = 2;
      k.height = 256;
      const x = k.getContext("2d")!;
      const g = x.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, a);
      g.addColorStop(0.6, b);
      g.addColorStop(1, c);
      x.fillStyle = g;
      x.fillRect(0, 0, 2, 256);
      const t = new THREE.CanvasTexture(k);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    const skyD = makeSkyTexture("#4a86b8", "#a9cde0", "#e7eef0");
    const skyN = makeSkyTexture("#02050c", "#0b1830", "#1b2c44");
    const nightC = new THREE.Color(0x07111e);
    const dayC = new THREE.Color(0xdce8ee);
    const bgc = new THREE.Color();
    scene.fog = new THREE.Fog(0xdce8ee, 50, 140);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      PU.uS.value = h * renderer.getPixelRatio() * 1.07;
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Compute physics function
    function computePhysics(s: typeof stateRef.current) {
      const e = Math.pow(10, 1.5 * s.mw + 4.8) / 4.184e15;
      const pga = Math.min(1.5, Math.pow(10, 0.5 * s.mw - 2.2) / (s.depth + 10));
      const th = s.mech === "megathrust" && s.depth < 70 ? s.slip * 0.4 * (s.mw / 8) * 0.25 : 0;
      const eta = th > 0 ? (150 / (Math.sqrt(9.8 * 3000) * 3.6)) * 60 : null;
      return {
        e,
        pga,
        th,
        eta,
        br: Math.min(100, pga * 75),
        pw: Math.min(100, pga * 82),
        hs: Math.min(100, pga * 88),
      };
    }

    // Seismograph trace history
    const seismoHist = new Array(260).fill(0);
    let seismoFrameCount = 0;

    // Clock
    const clock = new THREE.Clock();
    let tm = 0;
    let animId: number;

    // Animation Frame Loop
    const frame = () => {
      animId = requestAnimationFrame(frame);
      const dt = Math.min(clock.getDelta(), 0.05);
      tm += dt;

      const S = stateRef.current;
      if (S.run) S.t += dt;
      setSimTime(S.t);

      const t = S.t;
      const c = computePhysics(S);
      const m = S.mode;
      const run = S.run;
      const dur = 4 + (S.mw - 5) * 3;
      const shake = run && t < dur ? c.pga * (1 - (0.5 * t) / dur) * (m === "volcano" ? 0.3 : 1) : 0;
      const prog = Math.min(1, t / dur);

      // Display live PGA
      setPgaDisplay(c.pga.toFixed(2));

      // 1. World Shake
      world.position.set(
        (Math.random() - 0.5) * shake * 0.12,
        (Math.random() - 0.5) * shake * 0.06,
        (Math.random() - 0.5) * shake * 0.12
      );

      // 2. City Buildings: Sway, Collapse, Liquefaction
      const collapse = m === "quake" && run ? Math.max(0, Math.min(1, (c.pga - 0.6) / 0.9)) * prog : 0;
      const liq = m === "liquefaction" ? Math.min(1, t / 12) * Math.min(1, c.pga / 0.5) : 0;

      Bd.forEach((b, i) => {
        const sw = Math.sin(t * 20 + b.ph) * shake * 0.06;
        const cl = i % 3 === 0 ? collapse : 0;
        const lq = liq * (0.3 + (i % 4) * 0.25);
        dm.position.set(b.x + sw * b.h * 0.3, -lq - cl * b.h * 0.3, b.z);
        dm.rotation.set(
          cl * 0.5 * (i % 2 ? 1 : -1),
          0,
          sw + (lq ? lq * 0.18 * (i % 2 ? 1 : -1) : 0) + cl * 0.4 * (i % 2 ? -1 : 1)
        );
        dm.scale.set(b.w, b.h * (1 - cl * 0.4), b.w);
        dm.updateMatrix();
        city.setMatrixAt(i, dm.matrix);
      });
      city.instanceMatrix.needsUpdate = true;

      // 3. Ground & Geology
      (ground.material as THREE.MeshStandardMaterial).color.setHex(0x8aa860).lerp(cc.setHex(0x7a6a4a), liq);
      (mud.material as THREE.MeshStandardMaterial).opacity = liq * 0.7;
      layer.position.x = -12.25 + (m === "quake" && run ? Math.min(S.slip * 0.04, 1) * prog : 0);
      layer.position.z = m === "quake" && run ? Math.sin(t * 3) * shake * 0.03 : 0;

      // Fault cracks
      ck.forEach((k) => {
        const v =
          (m === "quake" || m === "liquefaction") && t > 0
            ? Math.min(1, t / dur) * Math.min(1, c.pga / 0.35)
            : 0;
        k.scale.x = Math.max(0.001, v * (k.userData.L as number));
      });

      // 4. Bridge Vibration & Breakage over the Strait
      const bk = m === "quake" && run ? Math.max(0, Math.min(1, (c.pga - 0.85) / 0.5)) * prog : 0;
      deck.position.y = 1.35 + Math.sin(t * 14) * shake * 0.08 - bk * 0.7;
      deck.rotation.z = bk * 0.35;

      // 5. Ocean Current & Tsunami Wave Front
      const eta = c.eta;
      const ts = m === "tsunami" && eta !== null;
      const fx = ts && run ? 26 - 28.5 * Math.min(1, t / eta) : 35;
      const hit = ts && run ? Math.max(0, Math.min(1, (t - eta) / 6)) : 0;
      const lvl = Math.min(c.th * 1.2, 4.5);
      const pos = sea.geometry.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const wx = 13.5 + x;
        let y = Math.sin(wx * 0.45 + tm * 1.8) * 0.08 + Math.cos(z * 0.4 + tm * 1.2) * 0.06;
        if (Math.abs(z - 5.0) < 3.0 && wx < 8.0) {
          y += Math.sin(wx * 1.2 - tm * 2.5) * 0.04;
        }
        if (ts && run) {
          const dist = wx - fx;
          const spread = dist < 0 ? 2.0 : 6.0;
          y +=
            lvl * 0.95 * Math.exp(-Math.pow(dist / spread, 2)) +
            (Math.abs(dist) < 3.5 ? Math.sin(wx * 4 + tm * 9) * 0.06 * lvl : 0);
        }
        pos.setY(i, y);

        const depthFactor = Math.min(1, Math.max(0, (wx + 2.5) / 25));
        const foam = Math.max(0, Math.min(1, (y - 0.12) / 0.5));
        sea.geometry.attributes.color.setXYZ(
          i,
          0.03 + depthFactor * 0.02 + foam * 0.9,
          0.35 + depthFactor * 0.15 + foam * 0.65,
          0.55 + depthFactor * 0.35 + foam * 0.45
        );
      }
      pos.needsUpdate = true;
      sea.geometry.attributes.color.needsUpdate = true;
      sea.geometry.computeVertexNormals();

      sea.position.y = -0.3 + lvl * 0.35 * hit;
      flood.scale.x = Math.max(0.001, hit);
      flood.position.x = -2.5 - 6.5 * hit;
      flood.scale.y = 1 + lvl * hit * 0.8;

      // 6. Volcano Island Crater in the Sea
      const er = m === "volcano" ? Math.min(1, t / 3) * Math.max(0.2, (S.mw - 4) / 4) : 0;
      (vm as THREE.MeshStandardMaterial).emissiveIntensity = m === "volcano" ? 0.06 + er * 0.22 : 0;
      lavaMat.color.setHSL(0.045, 1, m === "volcano" ? 0.38 + Math.random() * 0.15 : 0.08);
      (lavaStream.material as THREE.MeshStandardMaterial).emissiveIntensity =
        m === "volcano" ? 0.9 + Math.sin(t * 8) * 0.3 : 0.2;
      vlight.intensity = m === "volcano" ? (1.2 + er * 2.8) * (0.85 + Math.random() * 0.3) : 0;

      // 7. Particle Emissions
      if (m === "volcano" && run) {
        // Glowing magma bombs
        for (let k = 0; k < Math.floor(er * 7); k++) {
          emit(
            0,
            13 + (Math.random() - 0.5) * 0.9,
            5.1,
            (Math.random() - 0.5) * 0.9,
            (Math.random() - 0.5) * 3,
            5 + Math.random() * 5 * er,
            (Math.random() - 0.5) * 3,
            1.8
          );
        }
        // Billowing volcanic plume
        if (Math.random() < er * 1.6) {
          emit(
            1,
            13 + (Math.random() - 0.5),
            5.3,
            (Math.random() - 0.5),
            0.4 + Math.random() * 0.6,
            2.5 + Math.random() * 2.5,
            Math.random() - 0.5,
            6
          );
        }
        // Falling ash
        emit(2, -10 + Math.random() * 26, 14, -10 + Math.random() * 20, 0, -1.2, 0, 10);
      }

      // Building collapse rubble dust
      if (shake > 0.15 && Math.random() < shake) {
        const b = Bd[(Math.random() * N) | 0];
        emit(3, b.x, b.h, b.z, Math.random() - 0.5, 1.2, Math.random() - 0.5, 2);
      }

      // Particle physics update
      for (let i = 0; i < NP; i++) {
        if (pl[i] <= 0) continue;
        pl[i] -= dt;
        const j = i * 3;
        const k = pk[i];
        if (pl[i] <= 0) {
          pp[j + 1] = -100;
          continue;
        }
        pv[j + 1] -= (k === 0 ? 9 : k === 1 ? -0.8 : 0) * dt;
        pp[j] += pv[j] * dt;
        pp[j + 1] += pv[j + 1] * dt;
        pp[j + 2] += pv[j + 2] * dt;
        if (k === 0 && pp[j + 1] < -0.3) {
          pl[i] = 0;
          pp[j + 1] = -100;
        }
        const L = pl[i] / pL0[i];
        let r: number, g: number, b: number, s: number, a: number;
        if (k === 0) {
          r = 1;
          g = 0.35 + 0.45 * L;
          b = 0.08;
          s = 0.25;
          a = 1;
        } else if (k === 1) {
          r = g = b = 0.2 + 0.3 * (1 - L);
          s = 0.8 + (1 - L) * 2.6;
          a = 0.6 * L;
        } else if (k === 2) {
          r = g = b = 0.55;
          s = 0.22;
          a = 0.7 * Math.min(1, L * 3);
        } else {
          r = 0.72;
          g = 0.64;
          b = 0.52;
          s = 0.5 + (1 - L) * 2;
          a = 0.55 * L;
        }
        pc[j] = r;
        pc[j + 1] = g;
        pc[j + 2] = b;
        ps[i] = s;
        pa[i] = a;
      }
      pg.attributes.position.needsUpdate = true;
      pg.attributes.color.needsUpdate = true;
      pg.attributes.sz.needsUpdate = true;
      pg.attributes.al.needsUpdate = true;

      // 8. Day & Night Transition
      const n = S.night ? 1 : 0;
      bgc.copy(dayC).lerp(nightC, n);
      scene.background = S.night ? skyN : skyD;
      scene.fog!.color.copy(bgc);
      hemi.intensity = 0.85 - 0.6 * n;
      sun.intensity = 0.95 - 0.75 * n;
      (bm as THREE.MeshStandardMaterial).emissiveIntensity = 0.55 * n;

      // 9. Camera Smooth Lerp Transition
      if (camLerpWeight.current > 0) {
        camLerpWeight.current -= dt;
        camera.position.lerp(targetCamPos.current, 0.07);
        controls.target.lerp(targetCamLook.current, 0.07);
      }
      controls.update();
      renderer.render(scene, camera);

      // 10. Warning Banner Message
      let bannerMsg = "";
      if (run) {
        if (m === "quake" && c.pga > 0.6 && t < dur + 3) {
          bannerMsg = "🚨 KERUNTUHAN STRUKTUR: GETARAN SEISMIK EKSTREM (PGA > 0.6g)";
        } else if (m === "tsunami" && eta !== null) {
          bannerMsg =
            t < eta
              ? `🌊 PERINGATAN DINI: Tsunami tiba dalam ${(eta - t).toFixed(1)} menit!`
              : "🌊 TSUNAMI MENERJANG DARATAN & JEMBATAN KOTA!";
        } else if (m === "tsunami") {
          bannerMsg = "ℹ️ Tidak ada potensi tsunami destruktif (bukan subduksi megathrust dangkal)";
        } else if (m === "volcano") {
          bannerMsg = "🌋 ERUPSI GUNUNG BERAPI: Awan panas piroklastik & semburan magma!";
        } else if (m === "liquefaction" && liq > 0.2) {
          bannerMsg = "💧 LIKUIFAKSI TANAH: Tanah jenuh air mencair & fondasi kota amblas!";
        }
      }
      setWarningBanner(bannerMsg);

      // 11. Seismograph Drawing Engine
      seismoFrameCount++;
      if (seismoFrameCount % 2 === 0 && seismoCanvasRef.current) {
        const sctx = seismoCanvasRef.current.getContext("2d");
        if (sctx) {
          seismoHist.shift();
          seismoHist.push(run ? (Math.random() * 2 - 1) * Math.min(1, shake * 0.9 + 0.03) : (Math.random() - 0.5) * 0.04);
          sctx.clearRect(0, 0, 260, 52);

          // Grid line
          sctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
          sctx.lineWidth = 1;
          sctx.beginPath();
          sctx.moveTo(0, 26);
          sctx.lineTo(260, 26);
          sctx.stroke();

          // Waveform
          sctx.strokeStyle = c.pga > 0.6 ? "#ef4444" : c.pga > 0.3 ? "#f59e0b" : "#38bdf8";
          sctx.lineWidth = 1.6;
          sctx.beginPath();
          seismoHist.forEach((v, idx) => {
            if (idx === 0) sctx.moveTo(idx, 26);
            else sctx.lineTo(idx, 26 + v * 24);
          });
          sctx.stroke();
        }
      }
    };

    animId = requestAnimationFrame(frame);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      gt.dispose();
      skyD.dispose();
      skyN.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const toggleRun = () => {
    const nextState = !isSimulating;
    onSimulatingChange?.(nextState);
    stateRef.current.run = nextState;
  };

  const handleReset = () => {
    onSimulatingChange?.(false);
    stateRef.current.run = false;
    stateRef.current.t = 0;
    setSimTime(0);
    setWarningBanner("");
  };

  return (
    <div
      className={cn(
        "relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl transition-all duration-300 select-none",
        isFullscreen && "fixed inset-0 z-50 rounded-none border-none min-h-screen"
      )}
    >
      {/* 3D Canvas Mount Point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Warning Alert Banner (Top Center) */}
      {warningBanner && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-pulse">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600/95 text-white font-bold text-xs tracking-wide shadow-lg shadow-rose-600/50 backdrop-blur-md border border-rose-400/30">
            <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
            <span>{warningBanner}</span>
          </div>
        </div>
      )}

      {/* Top Left: HUD Status & Mode Selection */}
      <div className="absolute top-3 left-3 z-20 flex flex-col gap-2 max-w-[280px]">
        {/* Title badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-750/70 backdrop-blur-md text-slate-200">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="text-[11px] font-bold tracking-tight text-white uppercase font-mono">
            3D DISASTER SIMULATOR
          </span>
          <span className="text-[10px] text-slate-400 font-mono ml-auto">
            {simTime > 0 ? `${simTime.toFixed(1)}s` : "STANDBY"}
          </span>
        </div>

        {/* Disaster Mode Switcher */}
        <div className="p-1 rounded-xl bg-slate-900/85 border border-slate-800 backdrop-blur-md flex flex-wrap gap-1">
          {(
            [
              { id: "EARTHQUAKE", label: "⚡ Gempa" },
              { id: "TSUNAMI", label: "🌊 Tsunami" },
              { id: "VOLCANO", label: "🌋 Gunung Api" },
              { id: "LIQUEFACTION", label: "💧 Likuifaksi" },
            ] as const
          ).map((m) => {
            const isSelected = activeDisaster === m.id;
            return (
              <button
                key={m.id}
                onClick={() => handleSelectMode(m.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all",
                  isSelected
                    ? "bg-rose-600/80 text-white font-semibold shadow-sm border border-rose-500/50"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                )}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Right: Camera Angles & Visual Tools */}
      <div className="absolute top-3 right-3 z-20 flex flex-col items-end gap-2">
        {/* Control Action Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900/85 border border-slate-800 backdrop-blur-md">
          {/* Day / Night Toggle */}
          <button
            onClick={() => setIsNight(!isNight)}
            title={isNight ? "Beralih ke Siang" : "Beralih ke Malam"}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isNight ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-sky-300" />}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Suara" : "Aktifkan Sirine & Efek Suara"}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-slate-500" />
            )}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Keluar Fullscreen" : "Fullscreen"}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>

        {/* Camera Presets Bar */}
        <div className="p-1 rounded-xl bg-slate-900/85 border border-slate-800 backdrop-blur-md flex flex-col gap-1 text-right">
          <span className="text-[10px] font-mono font-semibold text-slate-400 px-2 py-0.5 uppercase flex items-center justify-end gap-1">
            <Camera className="h-3 w-3 text-sky-400" />
            <span>Kamera:</span>
          </span>
          <div className="flex flex-col gap-0.5">
            {(
              [
                { id: "orbit", label: "🌐 Orbit Selat" },
                { id: "city", label: "🏙️ Kota & Gedung" },
                { id: "coast", label: "🏖️ Pesisir & Jembatan" },
                { id: "crater", label: "🌋 Kawah Gunung Api" },
                { id: "fault", label: "🪨 Sesar & Patahan" },
              ] as const
            ).map((c) => {
              const isSelected = cameraView === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => switchCamera(c.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[10px] font-medium text-right transition-all",
                    isSelected
                      ? "bg-sky-500/20 text-sky-300 font-semibold border border-sky-400/40"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Left: Live Seismogram Oscillograph */}
      <div className="absolute bottom-3 left-3 z-20 flex flex-col gap-1 p-2 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md w-[276px]">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 px-1">
          <span className="flex items-center gap-1.5 text-slate-300 font-bold">
            <Activity className="h-3.5 w-3.5 text-rose-500" />
            <span>SEISMOGRAM LIVE</span>
          </span>
          <span className="text-amber-400 font-bold">PGA: {pgaDisplay}g</span>
        </div>
        <canvas
          ref={seismoCanvasRef}
          width={260}
          height={52}
          className="w-full h-[52px] rounded-lg border border-slate-800/90 bg-slate-950/80 block"
        />
      </div>

      {/* Bottom Right: Play / Pause / Reset Interactive Controls */}
      <div className="absolute bottom-3 right-3 z-20 flex items-center gap-2">
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-750 text-slate-300 hover:text-white text-xs font-semibold backdrop-blur-md transition-all shadow-md"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Reset</span>
        </button>

        <button
          onClick={toggleRun}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-wide transition-all shadow-lg backdrop-blur-md",
            isSimulating
              ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30"
              : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30"
          )}
        >
          <Play className={cn("h-4 w-4", isSimulating && "animate-spin")} />
          <span>{isSimulating ? "Jeda Simulasi" : "Mulai Simulasi"}</span>
        </button>
      </div>

      {/* OrbitControls Hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden md:block">
        <span className="text-[10px] text-slate-500/80 font-mono tracking-wider bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-800/40">
          Tahan &amp; geser mouse untuk rotasi 3D • Scroll untuk zoom
        </span>
      </div>
    </div>
  );
}
