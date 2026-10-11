"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  Camera,
  Layers,
  Building2,
  Waves,
  Zap,
  Activity,
  Flame,
  Volume2,
  VolumeX,
  Navigation,
  Sun,
  Sunset,
  Moon,
  Droplets,
  Mountain,
  Eye,
  Radio,
} from "lucide-react";
import {
  playEarthquakeRumble,
  playVolcanoBlast,
  playTsunamiSurge,
  playTransformerSparks,
  startEmergencySiren,
  stopEmergencySiren,
} from "@/lib/emergency-siren";

export type DisasterMode = "EARTHQUAKE" | "TSUNAMI" | "VOLCANO" | "LIQUEFACTION";
export type TimeOfDay = "DAY" | "DUSK" | "NIGHT";
export type CameraPreset = "orbit" | "city" | "coast" | "volcano" | "fault";

export interface BuildingEntity {
  group: THREE.Group;
  podium: THREE.Group;
  upperSection: THREE.Group;
  rubbleGroup: THREE.Group;
  initY: number;
  height: number;
  collapseProgress: number;
  collapseThreshold: number;
  tiltDir: number;
}

interface SimulationParams {
  magnitude: number;
  depthKm: number;
  slipMeters: number;
  isTsunamiActive: boolean;
  isSimulating: boolean;
  mechanism?: "SUBDUCTION" | "STRIKE_SLIP" | "NORMAL";
  disasterType?: DisasterMode;
  onDisasterTypeChange?: (mode: DisasterMode) => void;
}

export function ThreeEarthquakeCanvas({
  magnitude,
  depthKm,
  slipMeters,
  isTsunamiActive,
  isSimulating,
  mechanism = "SUBDUCTION",
  disasterType = "EARTHQUAKE",
  onDisasterTypeChange,
}: SimulationParams) {
  const mountRef = useRef<HTMLDivElement>(null);
  const seismoCanvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // States
  const [activeDisaster, setActiveDisaster] = useState<DisasterMode>(disasterType);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("DUSK");
  const [cameraView, setCameraView] = useState<CameraPreset>("orbit");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Sync internal disaster state with prop
  useEffect(() => {
    if (disasterType) {
      setActiveDisaster(disasterType);
    }
  }, [disasterType]);

  const handleDisasterSelect = (mode: DisasterMode) => {
    setActiveDisaster(mode);
    if (onDisasterTypeChange) {
      onDisasterTypeChange(mode);
    }
  };

  // Scene Reference Objects for Animation
  const sceneRef = useRef<THREE.Scene | null>(null);
  const mainlandGroupRef = useRef<THREE.Group | null>(null);
  const oceanGroupRef = useRef<THREE.Group | null>(null);
  const volcanoGroupRef = useRef<THREE.Group | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const foamMeshRef = useRef<THREE.Mesh | null>(null);
  const buildingsRef = useRef<BuildingEntity[]>([]);
  const bridgeRef = useRef<THREE.Group | null>(null);
  const carsRef = useRef<THREE.Group[]>([]);
  const treesRef = useRef<THREE.Group[]>([]);
  const fissuresRef = useRef<THREE.Mesh[]>([]);
  
  // Particles
  const smokeParticlesRef = useRef<THREE.Points | null>(null);
  const fireParticlesRef = useRef<THREE.Points | null>(null);
  const ashParticlesRef = useRef<THREE.Points | null>(null);
  const lavaBombGroupRef = useRef<THREE.Group | null>(null);
  const geyserParticlesRef = useRef<THREE.Points | null>(null);
  const splashParticlesRef = useRef<THREE.Points | null>(null);

  // Seismic Waves
  const pWaveMeshRef = useRef<THREE.Mesh | null>(null);
  const sWaveMeshRef = useRef<THREE.Mesh | null>(null);

  // Lighting References
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const cityLightRef = useRef<THREE.PointLight | null>(null);
  const volcanoCraterLightRef = useRef<THREE.PointLight | null>(null);

  // Sound triggers
  useEffect(() => {
    if (!isSimulating || !soundEnabled) return;

    if (activeDisaster === "VOLCANO") {
      playVolcanoBlast(5.0);
    } else if (activeDisaster === "TSUNAMI" || isTsunamiActive) {
      playTsunamiSurge(6.0);
      playEarthquakeRumble(4.5);
    } else if (activeDisaster === "EARTHQUAKE") {
      playEarthquakeRumble(5.0);
      setTimeout(() => playTransformerSparks(), 1200);
    } else if (activeDisaster === "LIQUEFACTION") {
      playEarthquakeRumble(6.0);
    }
  }, [isSimulating, activeDisaster, isTsunamiActive, soundEnabled]);

  // Seismograph Live Plotting Engine
  useEffect(() => {
    const canvas = seismoCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const history: number[] = new Array(80).fill(0);

    const drawSeismo = () => {
      animId = requestAnimationFrame(drawSeismo);
      const w = canvas.width;
      const h = canvas.height;
      const midY = h / 2;

      // Add new sample
      let sample = 0;
      if (isSimulating) {
        const factor = (magnitude - 4.5) * 4.2;
        sample = (Math.random() - 0.5) * factor + Math.sin(Date.now() * 0.02) * (factor * 0.7);
      } else {
        sample = (Math.random() - 0.5) * 0.6; // ambient background microseism
      }

      history.shift();
      history.push(sample);

      // Clear
      ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
      ctx.fillRect(0, 0, w, h);

      // Grid Lines
      ctx.strokeStyle = "rgba(30, 41, 59, 0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(w, midY);
      ctx.stroke();

      // Waveform line
      ctx.beginPath();
      ctx.strokeStyle = isSimulating ? "#ef4444" : "#10b981";
      ctx.lineWidth = 1.8;
      const step = w / (history.length - 1);
      for (let i = 0; i < history.length; i++) {
        const x = i * step;
        const y = Math.max(2, Math.min(h - 2, midY + history[i] * 3.5));
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Station ID
      ctx.fillStyle = "#94a3b8";
      ctx.font = "9px monospace";
      ctx.fillText(`STA: INA-TEWS 01 | ACC: ${(Math.abs(history[history.length - 1]) * 0.12).toFixed(2)}g`, 6, 12);
    };

    animId = requestAnimationFrame(drawSeismo);
    return () => cancelAnimationFrame(animId);
  }, [isSimulating, magnitude]);

  // Main Three.js Scene Setup & Render Loop
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Scene & Dynamic Atmosphere Setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Background & Fog based on Time of Day
    const updateAtmosphere = (tod: TimeOfDay) => {
      if (tod === "DAY") {
        scene.background = new THREE.Color(0x38bdf8);
        scene.fog = new THREE.FogExp2(0xbae6fd, 0.005);
      } else if (tod === "DUSK") {
        scene.background = new THREE.Color(0x3b0764);
        scene.fog = new THREE.FogExp2(0x4c0519, 0.0065);
      } else {
        scene.background = new THREE.Color(0x020617);
        scene.fog = new THREE.FogExp2(0x020617, 0.0075);
      }
    };
    updateAtmosphere(timeOfDay);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      1200
    );
    camera.position.set(52, 42, 68);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // 3. Renderer with ACES Filmic Tone Mapping
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = timeOfDay === "DAY" ? 1.35 : timeOfDay === "DUSK" ? 1.25 : 1.1;
    container.appendChild(renderer.domElement);

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 + 0.08;
    controls.minDistance = 14;
    controls.maxDistance = 180;
    controlsRef.current = controls;

    // 5. Dynamic Multi-Source Lighting
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.7);
    scene.add(hemiLight);
    hemiLightRef.current = hemiLight;

    const sun = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sun.position.set(50, 85, 45);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    dirLightRef.current = sun;

    // Subterranean Magma Core Glow
    const magmaGlow = new THREE.PointLight(0xff2200, 4.2, 70);
    magmaGlow.position.set(0, -9.5, 0);
    scene.add(magmaGlow);

    // City Center Night Light
    const cityLight = new THREE.PointLight(0x38bdf8, 2.8, 60);
    cityLight.position.set(-18, 14, 5);
    scene.add(cityLight);
    cityLightRef.current = cityLight;

    // Volcano Crater Lava Light
    const volcanoCraterLight = new THREE.PointLight(0xff3300, 5.0, 50);
    volcanoCraterLight.position.set(24, 15, -12);
    scene.add(volcanoCraterLight);
    volcanoCraterLightRef.current = volcanoCraterLight;

    // --- Noise helper for organic terrain ---
    const simplex2D = (x: number, y: number): number => {
      const dot = x * 12.9898 + y * 78.233;
      const s = Math.sin(dot) * 43758.5453;
      return (s - Math.floor(s)) * 2 - 1;
    };
    const fbm = (x: number, y: number, octaves = 4): number => {
      let val = 0, amp = 1, freq = 1, maxAmp = 0;
      for (let i = 0; i < octaves; i++) {
        val += simplex2D(x * freq, y * freq) * amp;
        maxAmp += amp;
        amp *= 0.5;
        freq *= 2.1;
      }
      return val / maxAmp;
    };

    // 6. Asthenosphere Mantle (Rough Organic Rock Surface)
    const mantleGeo = new THREE.PlaneGeometry(92, 70, 30, 30);
    const mPos = mantleGeo.attributes.position;
    for (let i = 0; i < mPos.count; i++) {
      mPos.setZ(i, fbm(mPos.getX(i) * 0.12, mPos.getY(i) * 0.12, 3) * 1.2);
    }
    mantleGeo.computeVertexNormals();
    const mantleMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      emissive: 0x991b1b,
      emissiveIntensity: 0.9,
      roughness: 0.85,
    });
    const mantle = new THREE.Mesh(mantleGeo, mantleMat);
    mantle.rotation.x = -Math.PI / 2;
    mantle.position.set(0, -10.0, 0);
    scene.add(mantle);

    // Thin geological strata layers visible on cross-section
    for (let layer = 0; layer < 3; layer++) {
      const strataGeo = new THREE.BoxGeometry(92, 0.4, 70);
      const strataMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.05, 0.3, 0.12 + layer * 0.06),
        roughness: 0.95,
      });
      const strata = new THREE.Mesh(strataGeo, strataMat);
      strata.position.set(0, -12.5 - layer * 1.6, 0);
      scene.add(strata);
    }

    // 7. Mainland Tectonic Plate Group
    const mainlandGroup = new THREE.Group();
    scene.add(mainlandGroup);
    mainlandGroupRef.current = mainlandGroup;

    // Lithospheric Crust Base (Layered Rock with Irregular Top)
    const crustGeo = new THREE.BoxGeometry(42, 14, 64);
    const crustMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.92,
      metalness: 0.08,
    });
    const crust = new THREE.Mesh(crustGeo, crustMat);
    crust.position.set(-21.5, -3.5, 0);
    crust.receiveShadow = true;
    mainlandGroup.add(crust);

    // Organic Mainland Terrain with Multi-Octave Noise Displacement
    const landTopGeo = new THREE.PlaneGeometry(42, 64, 72, 72);
    const landPos = landTopGeo.attributes.position;
    const landColors = new Float32Array(landPos.count * 3);
    for (let i = 0; i < landPos.count; i++) {
      const x = landPos.getX(i);
      const y = landPos.getY(i);
      // Terrain elevation with multiple noise octaves
      let elev = 0;
      if (x < -6) {
        // Mountain/hill zone — rugged terrain
        elev = Math.abs(fbm(x * 0.08 + 2.5, y * 0.06, 5)) * 7.5 + Math.abs(x + 6) * 0.42;
      } else if (x < 0) {
        // Coastal lowland — gentle rolling
        elev = Math.max(0, fbm(x * 0.2, y * 0.15, 3) * 1.5);
      } else {
        // Beach edge
        elev = Math.max(0, (1 - x / 4) * 0.3);
      }
      // Add small-scale noise for organic roughness everywhere
      elev += fbm(x * 0.5 + 10, y * 0.5, 2) * 0.3;
      landPos.setZ(i, Math.max(0, elev));

      // Vertex coloring: snow cap, rock, forest, grass, sand
      const col = new THREE.Color();
      if (elev > 8) {
        col.setHex(0xd4d4d8); // Snow cap
      } else if (elev > 5.5) {
        col.setHex(0x57534e); // Exposed rock
      } else if (elev > 2.0) {
        col.setHex(0x166534); // Dense forest green
      } else if (elev > 0.5) {
        col.setHex(0x22c55e); // Grass
      } else {
        col.setHex(0xd97706); // Sandy beach
      }
      landColors[i * 3] = col.r;
      landColors[i * 3 + 1] = col.g;
      landColors[i * 3 + 2] = col.b;
    }
    landTopGeo.setAttribute("color", new THREE.BufferAttribute(landColors, 3));
    landTopGeo.computeVertexNormals();

    const landTopMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.82,
      flatShading: false,
    });
    const landSurface = new THREE.Mesh(landTopGeo, landTopMat);
    landSurface.rotation.x = -Math.PI / 2;
    landSurface.position.set(-21.5, 3.6, 0);
    landSurface.receiveShadow = true;
    landSurface.castShadow = true;
    mainlandGroup.add(landSurface);

    // Realistic Mountain Massifs (Continuous Cordillera with Connected Ridges & Valleys)
    for (let m = 0; m < 4; m++) {
      const mHeight = 13 + (m % 2 === 0 ? 5 : 2);
      const mRadius = 11 + Math.random() * 4;
      const mGeo = new THREE.CylinderGeometry(0.4, mRadius, mHeight, 28, 12);
      const mPosArr = mGeo.attributes.position;
      for (let v = 0; v < mPosArr.count; v++) {
        const vx = mPosArr.getX(v);
        const vy = mPosArr.getY(v);
        const vz = mPosArr.getZ(v);
        const heightRatio = (vy + mHeight / 2) / mHeight; // 0 at base, 1 at summit
        const dist = Math.sqrt(vx * vx + vz * vz);

        // Natural mountain profile: concave exponential curve (broad base spreading out, steep peaks)
        const profile = Math.pow(1.0 - heightRatio * 0.85, 1.6);

        // Radial mountain ridges (alur pegunungan)
        const angle = Math.atan2(vz, vx);
        const ridgeVal = Math.abs(Math.sin(angle * 3.0 + m * 1.4)) * 0.35;
        const noiseFactor = (fbm(vx * 0.22, vz * 0.22 + m * 7, 3) * 1.6 + ridgeVal) * profile;

        if (dist > 0.01) {
          mPosArr.setX(v, vx + (vx / dist) * noiseFactor);
          mPosArr.setZ(v, vz + (vz / dist) * noiseFactor);
        }
        // Displace Y for craggy jagged peaks
        mPosArr.setY(v, vy + (1.0 - Math.abs(fbm(vx * 0.25, vz * 0.25, 2))) * (1.2 * heightRatio));
      }
      mGeo.computeVertexNormals();

      // Vertex color gradient: deep rainforest green base, dark slate rock, granite peaks
      const mColors = new Float32Array(mPosArr.count * 3);
      for (let v = 0; v < mPosArr.count; v++) {
        const vy = mPosArr.getY(v);
        const heightRatio = (vy + mHeight / 2) / mHeight;
        const c = new THREE.Color();
        if (heightRatio > 0.82) c.setHex(0xe2e8f0); // Mountain mist/granite peak
        else if (heightRatio > 0.5) c.setHex(0x475569); // Rocky crags & cliffs
        else if (heightRatio > 0.25) c.setHex(0x166534); // Mountain rainforest
        else c.setHex(0x14532d); // Lush tropical valley
        mColors[v * 3] = c.r;
        mColors[v * 3 + 1] = c.g;
        mColors[v * 3 + 2] = c.b;
      }
      mGeo.setAttribute("color", new THREE.BufferAttribute(mColors, 3));

      const mMat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        flatShading: true,
      });
      const mountain = new THREE.Mesh(mGeo, mMat);
      mountain.position.set(-29 - (m % 2) * 5, 3.4 + mHeight / 2, -22 + m * 14);
      mountain.castShadow = true;
      mountain.receiveShadow = true;
      mainlandGroup.add(mountain);
    }

    // Coastal Seawall Promenade (Tanggul Pantai & Revetment)
    const seawallGeo = new THREE.BoxGeometry(0.8, 1.2, 64);
    const seawallMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 });
    const seawall = new THREE.Mesh(seawallGeo, seawallMat);
    seawall.position.set(-0.4, 3.9, 0);
    seawall.receiveShadow = true;
    mainlandGroup.add(seawall);

    // Promenade Pedestrian Walkway
    const walkwayGeo = new THREE.BoxGeometry(1.4, 0.1, 64);
    const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.65 });
    const walkway = new THREE.Mesh(walkwayGeo, walkwayMat);
    walkway.position.set(-1.4, 3.82, 0);
    walkway.receiveShadow = true;
    mainlandGroup.add(walkway);

    // Promenade Streetlights (Lampu Jalan Pantai)
    for (let sl = 0; sl < 8; sl++) {
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.05, 2.4, 6);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(-1.8, 4.9, -26 + sl * 7.5);
      mainlandGroup.add(pole);

      const lampGeo = new THREE.SphereGeometry(0.12, 6, 6);
      const lampMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(-1.8, 6.1, -26 + sl * 7.5);
      mainlandGroup.add(lamp);
    }

    // Multi-Layered Organic Trees (Sphere Clusters + Trunks)
    const treeList: THREE.Group[] = [];
    const foliageMats = [
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.75 }),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.85 }),
    ];
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.92 });

    for (let t = 0; t < 40; t++) {
      const treeGroup = new THREE.Group();
      const treeHeight = 1.5 + Math.random() * 1.2;
      const isPalm = Math.random() > 0.65;

      // Trunk (slightly tapered cylinder)
      const trunkGeo = new THREE.CylinderGeometry(
        isPalm ? 0.1 : 0.08,
        isPalm ? 0.18 : 0.14,
        treeHeight,
        isPalm ? 6 : 5
      );
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = treeHeight / 2;
      trunk.castShadow = true;
      treeGroup.add(trunk);

      if (isPalm) {
        // Palm fronds as flattened spheroids
        for (let fr = 0; fr < 5; fr++) {
          const frondGeo = new THREE.SphereGeometry(0.7, 6, 4);
          frondGeo.scale(1.6, 0.25, 0.6);
          const frond = new THREE.Mesh(frondGeo, foliageMats[0]);
          const angle = (fr / 5) * Math.PI * 2;
          frond.position.set(
            Math.cos(angle) * 0.6,
            treeHeight + 0.3,
            Math.sin(angle) * 0.6
          );
          frond.rotation.z = Math.cos(angle) * 0.5;
          frond.rotation.x = Math.sin(angle) * 0.5;
          frond.castShadow = true;
          treeGroup.add(frond);
        }
      } else {
        // Deciduous / conifer: layered sphere cluster canopy
        const layers = 2 + Math.floor(Math.random() * 2);
        for (let l = 0; l < layers; l++) {
          const canopyR = (0.7 + Math.random() * 0.3) * (1 - l * 0.15);
          const canopyGeo = new THREE.SphereGeometry(canopyR, 8, 6);
          // Displace canopy vertices for organic lumpy shape
          const cPos = canopyGeo.attributes.position;
          for (let cv = 0; cv < cPos.count; cv++) {
            const cx = cPos.getX(cv);
            const cy = cPos.getY(cv);
            const cz = cPos.getZ(cv);
            const bump = 1 + fbm(cx * 2 + t, cz * 2, 2) * 0.25;
            cPos.setX(cv, cx * bump);
            cPos.setY(cv, cy * bump);
            cPos.setZ(cv, cz * bump);
          }
          canopyGeo.computeVertexNormals();
          const canopy = new THREE.Mesh(canopyGeo, foliageMats[l % foliageMats.length]);
          canopy.position.y = treeHeight + 0.5 + l * 0.55;
          canopy.castShadow = true;
          treeGroup.add(canopy);
        }
      }

      const treeX = -6 - Math.random() * 28;
      const treeZ = -28 + Math.random() * 56;
      treeGroup.position.set(treeX, 3.6, treeZ);
      treeGroup.scale.setScalar(0.8 + Math.random() * 0.5);
      mainlandGroup.add(treeGroup);
      treeList.push(treeGroup);
    }
    treesRef.current = treeList;

    // Coastal Asphalt Highway (with lane markings)
    const roadGeo = new THREE.BoxGeometry(40, 0.14, 3.8);
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.6 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.position.set(-20.5, 3.78, -5);
    road.receiveShadow = true;
    mainlandGroup.add(road);
    // White lane markings (dashed center line)
    for (let mark = 0; mark < 18; mark++) {
      const markGeo = new THREE.BoxGeometry(1.2, 0.02, 0.12);
      const markMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });
      const markMesh = new THREE.Mesh(markGeo, markMat);
      markMesh.position.set(-36 + mark * 4.0, 3.86, -5);
      mainlandGroup.add(markMesh);
    }

    // Emergency Vehicles on Highway (Shaped Cars)
    const carList: THREE.Group[] = [];
    for (let c = 0; c < 4; c++) {
      const carGroup = new THREE.Group();
      // Car body (lower body + cabin)
      const bodyGeo = new THREE.BoxGeometry(2.0, 0.55, 1.0);
      const isAmbulance = c === 0;
      const bodyMat = new THREE.MeshStandardMaterial({
        color: isAmbulance ? 0xfafafa : c === 1 ? 0x1d4ed8 : 0xef4444,
        roughness: 0.3,
        metalness: 0.4,
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.28;
      carGroup.add(body);

      // Cabin upper body
      const cabGeo = new THREE.BoxGeometry(1.1, 0.45, 0.85);
      const cabMat = new THREE.MeshStandardMaterial({
        color: isAmbulance ? 0xfafafa : 0x1e293b,
        roughness: 0.25,
        metalness: 0.5,
      });
      const cab = new THREE.Mesh(cabGeo, cabMat);
      cab.position.set(-0.2, 0.73, 0);
      carGroup.add(cab);

      // Wheels (4 small cylinders)
      const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.12, 8);
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95 });
      const wheelPositions = [[-0.6, 0, 0.5], [0.6, 0, 0.5], [-0.6, 0, -0.5], [0.6, 0, -0.5]];
      wheelPositions.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, wheelMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(wx, wy, wz);
        carGroup.add(wheel);
      });

      // Emergency light bar
      const beaconGeo = new THREE.BoxGeometry(0.6, 0.12, 0.3);
      const beaconMat = new THREE.MeshBasicMaterial({ color: c % 2 === 0 ? 0xef4444 : 0x38bdf8 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.set(0, 0.98, 0);
      carGroup.add(beacon);

      carGroup.position.set(-32 + c * 8.5, 4.08, -5 + (c % 2 === 0 ? 0.9 : -0.9));
      mainlandGroup.add(carGroup);
      carList.push(carGroup);
    }
    carsRef.current = carList;

    // 8. Realistic City Skyscrapers with 4-Sided Window Panels & Architectural Details
    const buildingList: BuildingEntity[] = [];

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      metalness: 0.85,
      roughness: 0.05,
      transmission: 0.15,
      thickness: 0.5,
      emissive: 0x0369a1,
      emissiveIntensity: timeOfDay === "NIGHT" ? 0.85 : 0.35,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x44403c,
      metalness: 0.2,
      roughness: 0.75,
    });
    const whiteConcreteMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      metalness: 0.15,
      roughness: 0.65,
    });

    const createBuilding = (bw: number, bd: number, bh: number, style: number) => {
      const bldgGroup = new THREE.Group();
      const podiumHeight = bh * 0.45;
      const upperHeight = bh * 0.55;

      // 1. Lower Podium (Collapses and pancakes under structural failure)
      const podiumGroup = new THREE.Group();
      bldgGroup.add(podiumGroup);

      const podiumCoreGeo = new THREE.BoxGeometry(bw * 0.94, podiumHeight, bd * 0.94);
      const podiumCore = new THREE.Mesh(podiumCoreGeo, style < 2 ? concreteMat : whiteConcreteMat);
      podiumCore.position.y = -bh / 2 + podiumHeight / 2;
      podiumCore.castShadow = true;
      podiumCore.receiveShadow = true;
      podiumGroup.add(podiumCore);

      // Windows on podium (all 4 sides)
      const podRows = Math.max(1, Math.floor(podiumHeight / 1.4));
      const cols = Math.max(2, Math.floor(bw / 1.0));
      for (let wr = 0; wr < podRows; wr++) {
        for (let wc = 0; wc < cols; wc++) {
          const winW = (bw * 0.8) / cols;
          const winH = 0.65;
          const winGeo = new THREE.PlaneGeometry(winW * 0.85, winH);
          const wy = -bh / 2 + 0.8 + wr * 1.3;
          // Front
          const winF = new THREE.Mesh(winGeo, glassMat);
          winF.position.set(-bw * 0.4 + wc * winW + winW / 2, wy, bd * 0.48);
          podiumGroup.add(winF);
          // Back
          const winB = new THREE.Mesh(winGeo, glassMat);
          winB.position.set(-bw * 0.4 + wc * winW + winW / 2, wy, -bd * 0.48);
          winB.rotation.y = Math.PI;
          podiumGroup.add(winB);
          // Left
          const winL = new THREE.Mesh(winGeo, glassMat);
          winL.position.set(-bw * 0.48, wy, -bd * 0.4 + wc * winW + winW / 2);
          winL.rotation.y = -Math.PI / 2;
          podiumGroup.add(winL);
          // Right
          const winR = new THREE.Mesh(winGeo, glassMat);
          winR.position.set(bw * 0.48, wy, -bd * 0.4 + wc * winW + winW / 2);
          winR.rotation.y = Math.PI / 2;
          podiumGroup.add(winR);
        }
      }

      // 2. Upper Tower Section (Snaps, shears, tilts, and slides off during failure)
      const upperGroup = new THREE.Group();
      upperGroup.position.y = -bh / 2 + podiumHeight;
      bldgGroup.add(upperGroup);

      const upperCoreGeo = new THREE.BoxGeometry(bw * 0.9, upperHeight, bd * 0.9);
      const upperCore = new THREE.Mesh(upperCoreGeo, style < 2 ? concreteMat : whiteConcreteMat);
      upperCore.position.y = upperHeight / 2;
      upperCore.castShadow = true;
      upperCore.receiveShadow = true;
      upperGroup.add(upperCore);

      // Windows on upper section (all 4 sides)
      const upRows = Math.max(1, Math.floor(upperHeight / 1.4));
      for (let wr = 0; wr < upRows; wr++) {
        for (let wc = 0; wc < cols; wc++) {
          const winW = (bw * 0.8) / cols;
          const winH = 0.65;
          const winGeo = new THREE.PlaneGeometry(winW * 0.85, winH);
          const wy = 0.8 + wr * 1.3;
          // Front
          const winF = new THREE.Mesh(winGeo, glassMat);
          winF.position.set(-bw * 0.4 + wc * winW + winW / 2, wy, bd * 0.46);
          upperGroup.add(winF);
          // Back
          const winB = new THREE.Mesh(winGeo, glassMat);
          winB.position.set(-bw * 0.4 + wc * winW + winW / 2, wy, -bd * 0.46);
          winB.rotation.y = Math.PI;
          upperGroup.add(winB);
          // Left
          const winL = new THREE.Mesh(winGeo, glassMat);
          winL.position.set(-bw * 0.46, wy, -bd * 0.4 + wc * winW + winW / 2);
          winL.rotation.y = -Math.PI / 2;
          upperGroup.add(winL);
          // Right
          const winR = new THREE.Mesh(winGeo, glassMat);
          winR.position.set(bw * 0.46, wy, -bd * 0.4 + wc * winW + winW / 2);
          winR.rotation.y = Math.PI / 2;
          upperGroup.add(winR);
        }
      }

      // Roof details on upper section (Helipad, antenna spire, AC units)
      if (bh > 10) {
        const padGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.1, 16);
        const padMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.y = upperHeight + 0.08;
        upperGroup.add(pad);
      }
      if (bh > 11) {
        const antennaGeo = new THREE.CylinderGeometry(0.06, 0.06, 3.5, 6);
        const antenna = new THREE.Mesh(antennaGeo, new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
        antenna.position.y = upperHeight + 1.75;
        upperGroup.add(antenna);

        const blinkGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const blinkMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const blink = new THREE.Mesh(blinkGeo, blinkMat);
        blink.position.y = upperHeight + 3.6;
        upperGroup.add(blink);
      }
      if (bh > 7) {
        for (let ac = 0; ac < 2; ac++) {
          const acGeo = new THREE.BoxGeometry(0.6, 0.3, 0.5);
          const acUnit = new THREE.Mesh(acGeo, concreteMat);
          acUnit.position.set(-0.5 + ac * 1.0, upperHeight + 0.15, 0);
          upperGroup.add(acUnit);
        }
      }

      // 3. Rubble Debris Field (Broken concrete slabs, chunks, shattered foundation)
      const rubbleGroup = new THREE.Group();
      rubbleGroup.position.y = -bh / 2;
      rubbleGroup.scale.set(0.001, 0.001, 0.001); // hidden until collapse
      bldgGroup.add(rubbleGroup);

      const rubbleMat = new THREE.MeshStandardMaterial({
        color: 0x57534e,
        roughness: 0.95,
        flatShading: true,
      });

      // Scatter 14 broken concrete chunks and tilted slabs
      for (let r = 0; r < 14; r++) {
        const rSizeX = 0.4 + Math.random() * 0.9;
        const rSizeY = 0.2 + Math.random() * 0.5;
        const rSizeZ = 0.4 + Math.random() * 0.9;
        const chunkGeo = new THREE.BoxGeometry(rSizeX, rSizeY, rSizeZ);
        const chunk = new THREE.Mesh(chunkGeo, rubbleMat);
        chunk.position.set(
          (Math.random() - 0.5) * (bw * 1.6),
          rSizeY / 2 + Math.random() * 0.4,
          (Math.random() - 0.5) * (bd * 1.6)
        );
        chunk.rotation.set(
          Math.random() * 0.8,
          Math.random() * Math.PI,
          Math.random() * 0.8
        );
        chunk.castShadow = true;
        chunk.receiveShadow = true;
        rubbleGroup.add(chunk);
      }

      return {
        group: bldgGroup,
        podium: podiumGroup,
        upperSection: upperGroup,
        rubbleGroup,
      };
    };

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const bHeight = 5.0 + Math.random() * 12 + (col === 1 ? 7 : 0);
        const bWidth = 2.5 + Math.random() * 1.2;
        const bDepth = 2.5 + Math.random() * 1.2;
        const style = Math.floor(Math.random() * 3);

        const bldgData = createBuilding(bWidth, bDepth, bHeight, style);
        const bY = 3.6 + bHeight / 2;
        bldgData.group.position.set(-8 - col * 4.8, bY, -14 + row * 6.8);
        mainlandGroup.add(bldgData.group);

        buildingList.push({
          group: bldgData.group,
          podium: bldgData.podium,
          upperSection: bldgData.upperSection,
          rubbleGroup: bldgData.rubbleGroup,
          initY: bY,
          height: bHeight,
          collapseProgress: 0,
          collapseThreshold: 6.8 + col * 0.25 - bHeight * 0.04,
          tiltDir: (col % 2 === 0 ? 1 : -1) * (1 + Math.random() * 0.4),
        });
      }
    }
    buildingsRef.current = buildingList;

    // 9. Oceanic Tectonic Block & Volcanic Island
    const oceanGroup = new THREE.Group();
    scene.add(oceanGroup);
    oceanGroupRef.current = oceanGroup;

    // Oceanic Basalt Slab (Lower elevation)
    const slabGeo = new THREE.BoxGeometry(42, 14, 64);
    const slabMat = new THREE.MeshStandardMaterial({
      color: 0x0c0a09,
      roughness: 0.92,
      metalness: 0.15,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(21.5, -5.5, 0);
    slab.receiveShadow = true;
    oceanGroup.add(slab);

    // Realistic Stratovolcano (Displaced Irregular Cone with Lava Channels)
    const volcanoGroup = new THREE.Group();
    volcanoGroup.position.set(24, 0.5, -12);
    oceanGroup.add(volcanoGroup);
    volcanoGroupRef.current = volcanoGroup;

    // Volcano body: displaced cone with rough flanks
    const vSegR = 24;
    const vSegH = 12;
    const vBaseGeo = new THREE.ConeGeometry(10.0, 15.0, vSegR, vSegH);
    const vPos = vBaseGeo.attributes.position;
    const vColors = new Float32Array(vPos.count * 3);
    for (let v = 0; v < vPos.count; v++) {
      const vx = vPos.getX(v);
      const vy = vPos.getY(v);
      const vz = vPos.getZ(v);
      const heightRatio = (vy + 7.5) / 15.0;
      const dist = Math.sqrt(vx * vx + vz * vz);

      // Irregular surface displacement
      const roughness = fbm(vx * 0.2, vz * 0.2 + vy * 0.15, 4) * 2.0 * (1 - heightRatio * 0.4);
      if (dist > 0.01) {
        vPos.setX(v, vx + (vx / dist) * roughness);
        vPos.setZ(v, vz + (vz / dist) * roughness);
      }
      vPos.setY(v, vy + fbm(vx * 0.15, vz * 0.15, 2) * 0.8);

      // Vertex color: scorched summit, gray rock, green base
      const c = new THREE.Color();
      if (heightRatio > 0.85) c.setHex(0x1c1917); // Scorched black summit
      else if (heightRatio > 0.6) c.setHex(0x44403c); // Dark volcanic rock
      else if (heightRatio > 0.35) c.setHex(0x57534e); // Gray pumice
      else c.setHex(0x365314); // Green tropical base
      vColors[v * 3] = c.r;
      vColors[v * 3 + 1] = c.g;
      vColors[v * 3 + 2] = c.b;
    }
    vBaseGeo.setAttribute("color", new THREE.BufferAttribute(vColors, 3));
    vBaseGeo.computeVertexNormals();

    const vBaseMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      flatShading: true,
    });
    const vBase = new THREE.Mesh(vBaseGeo, vBaseMat);
    vBase.position.y = 7.5;
    vBase.castShadow = true;
    vBase.receiveShadow = true;
    volcanoGroup.add(vBase);

    // Caldera Crater (Hollow Ring using Torus)
    const craterGeo = new THREE.TorusGeometry(2.8, 1.2, 8, 18);
    const craterMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.95,
      flatShading: true,
    });
    const crater = new THREE.Mesh(craterGeo, craterMat);
    crater.rotation.x = -Math.PI / 2;
    crater.position.y = 14.8;
    volcanoGroup.add(crater);

    // Boiling Magma Lake
    const lavaLakeGeo = new THREE.CircleGeometry(2.2, 20);
    const lavaLakeMat = new THREE.MeshStandardMaterial({
      color: 0xff4500,
      emissive: 0xff2200,
      emissiveIntensity: 3.5,
      roughness: 0.2,
    });
    const lavaLake = new THREE.Mesh(lavaLakeGeo, lavaLakeMat);
    lavaLake.rotation.x = -Math.PI / 2;
    lavaLake.position.y = 14.5;
    volcanoGroup.add(lavaLake);

    // Lava Flow Channels (Organic curved tubes down flanks)
    for (let lf = 0; lf < 3; lf++) {
      const lfAngle = (lf / 3) * Math.PI * 2 + 0.5;
      const lfPath: THREE.Vector3[] = [];
      for (let p = 0; p < 8; p++) {
        const t = p / 7;
        const r = 2 + t * 8;
        lfPath.push(new THREE.Vector3(
          Math.cos(lfAngle + t * 0.4) * r,
          14.0 - t * 13.5,
          Math.sin(lfAngle + t * 0.3) * r
        ));
      }
      const lfCurve = new THREE.CatmullRomCurve3(lfPath);
      const lfTubeGeo = new THREE.TubeGeometry(lfCurve, 16, 0.3, 6, false);
      const lfTubeMat = new THREE.MeshStandardMaterial({
        color: 0xff5500,
        emissive: 0xff3300,
        emissiveIntensity: 2.5,
        roughness: 0.35,
      });
      const lfTube = new THREE.Mesh(lfTubeGeo, lfTubeMat);
      volcanoGroup.add(lfTube);
    }

    // Coastal Suspension Bridge
    const bridgeGroup = new THREE.Group();
    scene.add(bridgeGroup);
    bridgeRef.current = bridgeGroup;

    // Road Deck
    const deckGeo = new THREE.BoxGeometry(26, 0.5, 3.4);
    const deckMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.7 });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(12, 4.6, -5);
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // Pylons (tapered concrete towers)
    const pylonGeo = new THREE.CylinderGeometry(0.5, 0.8, 11.5, 8);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.45 });
    const pylonPositions = [3.5, 19.5];
    pylonPositions.forEach((px) => {
      const pylon = new THREE.Mesh(pylonGeo, pylonMat);
      pylon.position.set(px, 8.8, -5);
      pylon.castShadow = true;
      bridgeGroup.add(pylon);
    });

    // Suspension Cables (Smooth Catenary Curves)
    const cableMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    for (let side = -1; side <= 1; side += 2) {
      const cablePathPoints: THREE.Vector3[] = [];
      for (let cp = 0; cp <= 20; cp++) {
        const t = cp / 20;
        const x = -0.5 + t * 25;
        // Catenary shape
        const midX = 12;
        const normalizedX = (x - midX) / 12.5;
        const catenaryY = 5 + Math.cosh(normalizedX * 1.8) * 3.5;
        cablePathPoints.push(new THREE.Vector3(x, catenaryY, -5 + side * 1.2));
      }
      const cableCurve = new THREE.CatmullRomCurve3(cablePathPoints);
      const cableTubeGeo = new THREE.TubeGeometry(cableCurve, 30, 0.06, 4, false);
      const cableMesh = new THREE.Mesh(cableTubeGeo, cableMat);
      bridgeGroup.add(cableMesh);
    }
    // Vertical suspender cables
    for (let sc = 0; sc < 12; sc++) {
      const scX = 1 + sc * 2.0;
      const scGeo = new THREE.CylinderGeometry(0.025, 0.025, 6, 4);
      const scMesh = new THREE.Mesh(scGeo, cableMat);
      scMesh.position.set(scX, 7.5, -5);
      bridgeGroup.add(scMesh);
    }

    // 10. Dynamic Ocean Water (Physical Material for Realistic Reflections)
    const waterGeo = new THREE.PlaneGeometry(44, 64, 84, 84);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0e7490,
      roughness: 0.05,
      metalness: 0.1,
      transmission: 0.45,
      thickness: 3.0,
      transparent: true,
      opacity: 0.88,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(22, 2.2, 0);
    scene.add(waterMesh);
    waterMeshRef.current = waterMesh;

    // Coastal Foam Line (Animated)
    const foamGeo = new THREE.PlaneGeometry(3.5, 64, 20, 40);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.55,
    });
    const foamMesh = new THREE.Mesh(foamGeo, foamMat);
    foamMesh.rotation.x = -Math.PI / 2;
    foamMesh.position.set(1.5, 2.35, 0);
    scene.add(foamMesh);
    foamMeshRef.current = foamMesh;

    // 11. Surface Fissures along Fault Trace
    const fissureList: THREE.Mesh[] = [];
    for (let f = 0; f < 5; f++) {
      const fGeo = new THREE.BoxGeometry(0.7, 4.5, 8.5);
      const fMat = new THREE.MeshStandardMaterial({
        color: 0xff0044,
        emissive: 0xff1100,
        emissiveIntensity: 1.4,
      });
      const fissure = new THREE.Mesh(fGeo, fMat);
      fissure.position.set((Math.random() - 0.5) * 1.5, 1.8, -20 + f * 10);
      fissure.scale.set(0.1, 1, 1);
      scene.add(fissure);
      fissureList.push(fissure);
    }
    fissuresRef.current = fissureList;

    // 12. Volcano Eruption Ash Plume & Pyroclastic Cloud Particles
    const ashCount = 450;
    const ashGeo = new THREE.BufferGeometry();
    const ashPos = new Float32Array(ashCount * 3);
    for (let a = 0; a < ashCount; a++) {
      ashPos[a * 3] = 24 + (Math.random() - 0.5) * 6;
      ashPos[a * 3 + 1] = 14 + Math.random() * 22;
      ashPos[a * 3 + 2] = -12 + (Math.random() - 0.5) * 6;
    }
    ashGeo.setAttribute("position", new THREE.BufferAttribute(ashPos, 3));
    const ashMat = new THREE.PointsMaterial({
      color: 0x334155, // Dark volcanic ash
      size: 2.2,
      transparent: true,
      opacity: 0.75,
    });
    const ashPoints = new THREE.Points(ashGeo, ashMat);
    scene.add(ashPoints);
    ashParticlesRef.current = ashPoints;

    // Ballistic Lava Bombs
    const lavaBombGroup = new THREE.Group();
    scene.add(lavaBombGroup);
    lavaBombGroupRef.current = lavaBombGroup;
    for (let b = 0; b < 10; b++) {
      const bombGeo = new THREE.SphereGeometry(0.35 + Math.random() * 0.3, 8, 8);
      const bombMat = new THREE.MeshBasicMaterial({ color: 0xff4500 });
      const bomb = new THREE.Mesh(bombGeo, bombMat);
      bomb.position.set(24, 15, -12);
      lavaBombGroup.add(bomb);
    }

    // 13. Burning Fire & Smoke Particles (Earthquake Fire)
    const smokeCount = 280;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(smokeCount * 3);
    for (let s = 0; s < smokeCount; s++) {
      smokePos[s * 3] = -14 + (Math.random() - 0.5) * 16;
      smokePos[s * 3 + 1] = 4 + Math.random() * 16;
      smokePos[s * 3 + 2] = -10 + (Math.random() - 0.5) * 20;
    }
    smokeGeo.setAttribute("position", new THREE.BufferAttribute(smokePos, 3));
    const smokeMat = new THREE.PointsMaterial({
      color: 0x475569,
      size: 1.8,
      transparent: true,
      opacity: 0.65,
    });
    const smokePoints = new THREE.Points(smokeGeo, smokeMat);
    scene.add(smokePoints);
    smokeParticlesRef.current = smokePoints;

    const fireCount = 140;
    const fireGeo = new THREE.BufferGeometry();
    const firePos = new Float32Array(fireCount * 3);
    for (let f = 0; f < fireCount; f++) {
      firePos[f * 3] = -14 + (Math.random() - 0.5) * 16;
      firePos[f * 3 + 1] = 4 + Math.random() * 6;
      firePos[f * 3 + 2] = -10 + (Math.random() - 0.5) * 20;
    }
    fireGeo.setAttribute("position", new THREE.BufferAttribute(firePos, 3));
    const fireMat = new THREE.PointsMaterial({
      color: 0xf97316,
      size: 1.3,
      transparent: true,
      opacity: 0.9,
    });
    const firePoints = new THREE.Points(fireGeo, fireMat);
    scene.add(firePoints);
    fireParticlesRef.current = firePoints;

    // 14. Soil Liquefaction Sand Boil Geysers (Mud Eruptions)
    const geyserCount = 100;
    const geyserGeo = new THREE.BufferGeometry();
    const geyserPos = new Float32Array(geyserCount * 3);
    for (let g = 0; g < geyserCount; g++) {
      geyserPos[g * 3] = -10 + (Math.random() - 0.5) * 10;
      geyserPos[g * 3 + 1] = 3.8 + Math.random() * 3.5;
      geyserPos[g * 3 + 2] = -5 + (Math.random() - 0.5) * 12;
    }
    geyserGeo.setAttribute("position", new THREE.BufferAttribute(geyserPos, 3));
    const geyserMat = new THREE.PointsMaterial({
      color: 0xa16207, // Muddy brown fluidized sand
      size: 1.2,
      transparent: true,
      opacity: 0.8,
    });
    const geyserPoints = new THREE.Points(geyserGeo, geyserMat);
    scene.add(geyserPoints);
    geyserParticlesRef.current = geyserPoints;

    // 15. Volumetric P-Wave & S-Wave Seismic Wavefront Energy Shells (No wireframes)
    const pWaveGeo = new THREE.SphereGeometry(6, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const pWaveMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const pWave = new THREE.Mesh(pWaveGeo, pWaveMat);
    pWave.position.set(0, -6, 0);
    scene.add(pWave);
    pWaveMeshRef.current = pWave;

    const sWaveGeo = new THREE.SphereGeometry(4, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.65);
    const sWaveMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sWave = new THREE.Mesh(sWaveGeo, sWaveMat);
    sWave.position.set(0, -6, 0);
    scene.add(sWave);
    sWaveMeshRef.current = sWave;

    // 16. Window Resize Handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // 17. Animation Loop with performance.now()
    let lastTime = performance.now();
    let animFrameId: number;

    const animate = (currentTime: number) => {
      animFrameId = requestAnimationFrame(animate);

      const delta = (currentTime - lastTime) * 0.001;
      const elapsed = currentTime * 0.001;
      lastTime = currentTime;

      controls.update();

      // Move Emergency Cars
      carList.forEach((car) => {
        car.position.x += delta * (isSimulating ? 1.5 : 8.5);
        if (car.position.x > 22) car.position.x = -32;
      });

      // Animate Trees (Swaying in wind, violent whipping during quake)
      treeList.forEach((tree, idx) => {
        const windSway = Math.sin(elapsed * 2.2 + idx) * 0.04;
        const quakeSway = isSimulating ? Math.sin(elapsed * 18 + idx) * 0.22 : 0;
        tree.rotation.z = windSway + quakeSway;
      });

      // Animate Seismic Wavefronts
      if (pWaveMeshRef.current && sWaveMeshRef.current) {
        const isWaveActive = isSimulating && (activeDisaster === "EARTHQUAKE" || activeDisaster === "TSUNAMI");
        pWaveMeshRef.current.visible = isWaveActive;
        sWaveMeshRef.current.visible = isWaveActive;

        if (isWaveActive) {
          const pScale = ((elapsed * 4.6) % 8) * 3.6 + 1;
          pWaveMeshRef.current.scale.set(pScale, pScale, pScale);
          (pWaveMeshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.45 - pScale / 25);

          const sScale = ((elapsed * 2.8) % 8) * 3.0 + 1;
          sWaveMeshRef.current.scale.set(sScale, sScale, sScale);
          (sWaveMeshRef.current.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.55 - sScale / 22);
        }
      }

      // Animate Dynamic Tsunami Ocean Waves
      if (waterMeshRef.current && foamMeshRef.current) {
        const isTsunamiSim = isSimulating && (activeDisaster === "TSUNAMI" || isTsunamiActive);
        const pos = waterMeshRef.current.geometry.attributes.position;
        const count = pos.count;
        const waveSpeed = isTsunamiSim ? 5.2 : 1.6;
        const waveAmp = isTsunamiSim ? Math.min(5.2, 1.2 + slipMeters * 0.22) : 0.32;

        for (let i = 0; i < count; i++) {
          const u = pos.getX(i);
          const v = pos.getY(i);
          // Shoaling factor: waves grow taller as they approach shallow shoreline (u near 0)
          const shoaling = 1.0 + Math.max(0, (20 - u) * 0.04);
          const waveHeight =
            (Math.sin(u * 0.38 - elapsed * waveSpeed) * waveAmp +
            Math.sin(u * 0.72 + v * 0.22 - elapsed * (waveSpeed * 1.25)) * (waveAmp * 0.38) +
            Math.cos(v * 0.35 + elapsed * 1.7) * (waveAmp * 0.22)) * shoaling;
          pos.setZ(i, waveHeight);
        }
        pos.needsUpdate = true;
        waterMeshRef.current.geometry.computeVertexNormals();

        // Shoreline Foam surge (dynamic tidal wash)
        foamMeshRef.current.position.y = 2.35 + (isTsunamiSim ? Math.sin(elapsed * 4.5) * 1.5 : Math.sin(elapsed * 1.8) * 0.18);
      }

      // Animate Volcano Ash & Lava Bombs
      if (ashParticlesRef.current && lavaBombGroupRef.current) {
        const isVolcanoActive = isSimulating && activeDisaster === "VOLCANO";
        ashParticlesRef.current.visible = isVolcanoActive || activeDisaster === "VOLCANO";

        if (isVolcanoActive || activeDisaster === "VOLCANO") {
          const aPos = ashParticlesRef.current.geometry.attributes.position;
          for (let a = 0; a < aPos.count; a++) {
            let y = aPos.getY(a) + delta * (isVolcanoActive ? 9.0 : 3.5);
            let x = aPos.getX(a) + (Math.random() - 0.5) * 0.2 - delta * 1.5; // wind drift
            if (y > 36) {
              y = 14.5;
              x = 24 + (Math.random() - 0.5) * 4;
            }
            aPos.setY(a, y);
            aPos.setX(a, x);
          }
          aPos.needsUpdate = true;

          // Ballistic Lava Bombs Launch
          lavaBombGroupRef.current.visible = isVolcanoActive;
          if (isVolcanoActive) {
            lavaBombGroupRef.current.children.forEach((bomb, bIdx) => {
              const bTime = (elapsed * 2.0 + bIdx * 0.4) % 3.0;
              const arcX = 24 - bTime * (2.0 + bIdx * 0.3);
              const arcY = 14.5 + Math.sin(bTime * Math.PI) * 12.0 - bTime * 3.0;
              const arcZ = -12 + Math.cos(bIdx) * 5.0;
              bomb.position.set(arcX, Math.max(3.0, arcY), arcZ);
            });
          }
        } else {
          lavaBombGroupRef.current.visible = false;
        }
      }

      // Animate Smoke & Fire (Earthquake Collapse)
      if (smokeParticlesRef.current && fireParticlesRef.current) {
        const isFireActive = isSimulating && (activeDisaster === "EARTHQUAKE" || magnitude >= 6.8);
        smokeParticlesRef.current.visible = isFireActive;
        fireParticlesRef.current.visible = isFireActive;

        if (isFireActive) {
          const sPos = smokeParticlesRef.current.geometry.attributes.position;
          for (let s = 0; s < sPos.count; s++) {
            let y = sPos.getY(s) + delta * 4.5;
            if (y > 24) y = 4.0;
            sPos.setY(s, y);
          }
          sPos.needsUpdate = true;

          const fPos = fireParticlesRef.current.geometry.attributes.position;
          for (let f = 0; f < fPos.count; f++) {
            let y = fPos.getY(f) + delta * 6.5;
            if (y > 11) y = 4.0;
            fPos.setY(f, y);
          }
          fPos.needsUpdate = true;
        }
      }

      // Animate Liquefaction Geysers
      if (geyserParticlesRef.current) {
        const isLiqActive = isSimulating && activeDisaster === "LIQUEFACTION";
        geyserParticlesRef.current.visible = isLiqActive;
        if (isLiqActive) {
          const gPos = geyserParticlesRef.current.geometry.attributes.position;
          for (let g = 0; g < gPos.count; g++) {
            let y = gPos.getY(g) + delta * 5.0;
            if (y > 8.0) y = 3.8;
            gPos.setY(g, y);
          }
          gPos.needsUpdate = true;
        }
      }

      // Active Ground Tremor, Rupture & Building Collapse Physics
      if (isSimulating) {
        const tremorAmp = (magnitude - 4.0) * 0.14;
        const shakeX = (Math.random() - 0.5) * tremorAmp;
        const shakeZ = (Math.random() - 0.5) * tremorAmp;

        // Ground Shaking
        if (mainlandGroupRef.current) {
          mainlandGroupRef.current.position.x = shakeX;
          mainlandGroupRef.current.position.z = shakeZ;
        }

        // Tectonic Plate Dislocation
        if (oceanGroupRef.current) {
          if (mechanism === "SUBDUCTION" || activeDisaster === "TSUNAMI") {
            oceanGroupRef.current.position.y = -Math.sin(elapsed * 5.5) * 1.4 - slipMeters * 0.14;
          } else {
            oceanGroupRef.current.position.z = Math.sin(elapsed * 5.5) * 1.6 + slipMeters * 0.16;
          }
        }

        // Surface Crevices Ripping Open
        fissuresRef.current.forEach((fissure) => {
          const ripWidth = Math.min(3.8, 0.4 + slipMeters * 0.2);
          fissure.scale.x = ripWidth;
        });

        // Building Dynamics (Real structural fracture, shearing, pancake collapse & rubble debris)
        buildingsRef.current.forEach((bObj, idx) => {
          const { group: b, podium, upperSection, rubbleGroup } = bObj;

          if (activeDisaster === "LIQUEFACTION") {
            // Sinking into fluidized soil & dramatic toppling (bearing capacity failure)
            bObj.collapseProgress = Math.min(1.0, bObj.collapseProgress + delta * 0.45);
            const p = bObj.collapseProgress;
            b.position.y = bObj.initY - p * (bObj.height * 0.45);
            b.rotation.z = p * (0.45 * bObj.tiltDir);
            b.rotation.x = p * 0.22 * (idx % 2 === 0 ? 1 : -1);
            rubbleGroup.scale.setScalar(p);
          } else if (activeDisaster === "TSUNAMI") {
            // Tsunami hydrodynamic wave force demolishes coastal buildings
            const isCoastal = idx % 4 <= 1;
            if (isCoastal && (isSimulating || isTsunamiActive)) {
              bObj.collapseProgress = Math.min(1.0, bObj.collapseProgress + delta * 0.65);
              const p = bObj.collapseProgress;
              // Push building inland with violent wave impact
              b.rotation.z = -p * 0.45;
              upperSection.rotation.z = -p * 0.4;
              upperSection.position.x = -p * 2.4;
              podium.scale.y = Math.max(0.25, 1.0 - p * 0.65);
              rubbleGroup.scale.setScalar(p);
            }
          } else {
            // EARTHQUAKE DYNAMICS
            const swayZ = Math.sin(elapsed * 15 + idx) * (tremorAmp * 0.45);
            const swayX = Math.cos(elapsed * 13 + idx) * (tremorAmp * 0.35);

            // Structural failure threshold: high magnitude quakes cause real destruction
            const shouldCollapse = magnitude >= bObj.collapseThreshold;
            if (shouldCollapse) {
              bObj.collapseProgress = Math.min(
                1.0,
                bObj.collapseProgress + delta * (0.35 + (magnitude - 6.5) * 0.25)
              );
              const p = bObj.collapseProgress;

              // 1. Lower podium pancakes down into flattened rubble mound
              podium.scale.y = Math.max(0.18, 1.0 - p * 0.82);
              podium.position.y = -p * (bObj.height * 0.15);

              // 2. Upper section shears, snaps, tilts at sharp angle and slides down
              upperSection.rotation.z = swayZ + p * (0.55 * bObj.tiltDir);
              upperSection.rotation.x = swayX + p * 0.22;
              upperSection.position.x = p * (2.2 * bObj.tiltDir);
              upperSection.position.y = (-bObj.height / 2 + (bObj.height * 0.45) * (1.0 - p * 0.8)) - p * 1.6;

              // 3. Rubble burst outward around the building footprint
              rubbleGroup.scale.setScalar(Math.min(1.0, p * 1.5));

              // 4. Building overall height drops into genuine ruins
              b.position.y = Math.max(3.8, bObj.initY - p * (bObj.height * 0.45));
              b.rotation.z = swayZ + p * (0.15 * bObj.tiltDir);
              b.rotation.x = swayX;
            } else {
              // Mild quake: structural resonance sway without collapse
              b.rotation.z = swayZ;
              b.rotation.x = swayX;
            }
          }
        });

        // Bridge Structural Strain
        if (bridgeRef.current) {
          bridgeRef.current.rotation.z = Math.sin(elapsed * 9) * (tremorAmp * 0.65);
        }

        // Power Grid Arc Flash & Blackout
        if (cityLightRef.current) {
          cityLightRef.current.intensity = Math.random() > 0.65 ? 3.5 : 0.05;
        }
      } else {
        // Reset to Calm Resting State (Smooth Reconstruction)
        if (mainlandGroupRef.current) mainlandGroupRef.current.position.set(0, 0, 0);
        if (oceanGroupRef.current) oceanGroupRef.current.position.set(0, 0, 0);
        buildingsRef.current.forEach((bObj) => {
          if (bObj.collapseProgress > 0) {
            bObj.collapseProgress = Math.max(0, bObj.collapseProgress - delta * 1.5);
          }
          const p = bObj.collapseProgress;
          bObj.group.position.y = bObj.initY - p * (bObj.height * 0.45);
          bObj.group.rotation.set(0, 0, 0);
          bObj.podium.scale.y = Math.max(0.18, 1.0 - p * 0.82);
          bObj.podium.position.y = 0;
          bObj.upperSection.rotation.set(0, 0, 0);
          bObj.upperSection.position.set(0, -bObj.height / 2 + bObj.height * 0.45, 0);
          bObj.rubbleGroup.scale.setScalar(Math.max(0.001, p * 1.5));
        });
        if (bridgeRef.current) bridgeRef.current.rotation.set(0, 0, 0);
        if (cityLightRef.current) cityLightRef.current.intensity = timeOfDay === "NIGHT" ? 3.2 : 1.8;
        fissuresRef.current.forEach((f) => (f.scale.x = 0.1));
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [magnitude, depthKm, slipMeters, isTsunamiActive, isSimulating, mechanism, activeDisaster, timeOfDay]);

  // Camera Presets
  const handleSetCameraView = (view: CameraPreset) => {
    setCameraView(view);
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    if (view === "orbit") {
      camera.position.set(52, 42, 68);
      controls.target.set(0, 0, 0);
    } else if (view === "city") {
      // Street level view of skyscrapers & collapse
      camera.position.set(-16, 16, 26);
      controls.target.set(-14, 6, -5);
    } else if (view === "coast") {
      // Tsunami coastal runup view
      camera.position.set(16, 12, 34);
      controls.target.set(4, 3, -5);
    } else if (view === "volcano") {
      // High altitude view of Stratovolcano caldera
      camera.position.set(24, 26, 18);
      controls.target.set(24, 14, -12);
    } else if (view === "fault") {
      // Subterranean crust & magma chamber view
      camera.position.set(0, -6, 56);
      controls.target.set(0, -6, 0);
    }
    controls.update();
  };

  return (
    <div className="relative w-full h-full min-h-[520px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      {/* 3D Canvas Mount */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Top Left: Simulation Telemetry & Active Disaster Type */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5 font-mono z-20">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-[11px] text-rose-400 backdrop-blur-md shadow-xl">
          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
          <span className="font-bold">
            PHYSICS ENGINE 3D: {activeDisaster}
          </span>
        </div>
        <div className="text-[10px] text-slate-300 bg-slate-950/85 px-2.5 py-1 rounded-lg border border-slate-800 backdrop-blur-sm">
          Hiposenter: -{depthKm} km &bull; Slip: {slipMeters} m &bull; Magnitudo: M {magnitude.toFixed(1)}
        </div>
      </div>

      {/* Top Center: Multi-Disaster Mode Tabs */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-xl backdrop-blur-md shadow-2xl text-[11px] font-mono">
        <button
          onClick={() => handleDisasterSelect("EARTHQUAKE")}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
            activeDisaster === "EARTHQUAKE"
              ? "bg-rose-600 text-white font-bold shadow-md shadow-rose-900/50"
              : "text-slate-400 hover:text-white"
          }`}
          title="Simulasi gempa bumi sesar & keruntuhan kota"
        >
          <Building2 className="h-3 w-3" />
          <span>Gempa Bumi</span>
        </button>
        <button
          onClick={() => handleDisasterSelect("TSUNAMI")}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
            activeDisaster === "TSUNAMI"
              ? "bg-cyan-600 text-white font-bold shadow-md shadow-cyan-900/50"
              : "text-slate-400 hover:text-white"
          }`}
          title="Simulasi deformasi megathrust & gelombang tsunami pesisir"
        >
          <Waves className="h-3 w-3" />
          <span>Tsunami</span>
        </button>
        <button
          onClick={() => handleDisasterSelect("VOLCANO")}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
            activeDisaster === "VOLCANO"
              ? "bg-amber-600 text-white font-bold shadow-md shadow-amber-900/50"
              : "text-slate-400 hover:text-white"
          }`}
          title="Simulasi erupsi gunung berapi, awan panas & lontaran bom lava"
        >
          <Mountain className="h-3 w-3" />
          <span>Gunung Berapi</span>
        </button>
        <button
          onClick={() => handleDisasterSelect("LIQUEFACTION")}
          className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
            activeDisaster === "LIQUEFACTION"
              ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-900/50"
              : "text-slate-400 hover:text-white"
          }`}
          title="Simulasi likuifaksi tanah mencair & bangunan amblas"
        >
          <Droplets className="h-3 w-3" />
          <span>Likuifaksi</span>
        </button>
      </div>

      {/* Top Right: Camera Presets, Time of Day & Audio Toggle */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        {/* Camera Views */}
        <div className="flex items-center gap-1 bg-slate-950/90 border border-slate-800 p-1 rounded-xl backdrop-blur-md shadow-2xl text-[11px] font-mono">
          <button
            onClick={() => handleSetCameraView("orbit")}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
              cameraView === "orbit" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="Orbit 360°"
          >
            <Camera className="h-3 w-3" />
            <span>Orbit</span>
          </button>
          <button
            onClick={() => handleSetCameraView("city")}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
              cameraView === "city" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="Kamera Gedung & Jalanan Kota"
          >
            <Building2 className="h-3 w-3" />
            <span>Kota</span>
          </button>
          <button
            onClick={() => handleSetCameraView("coast")}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
              cameraView === "coast" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="Pesisir & Gelombang Tsunami"
          >
            <Waves className="h-3 w-3" />
            <span>Pesisir</span>
          </button>
          <button
            onClick={() => handleSetCameraView("volcano")}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
              cameraView === "volcano" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="Kawah Gunung Berapi"
          >
            <Mountain className="h-3 w-3" />
            <span>Kawah</span>
          </button>
          <button
            onClick={() => handleSetCameraView("fault")}
            className={`px-2 py-1 rounded-lg flex items-center gap-1 transition-all ${
              cameraView === "fault" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="Penampang Sesar & Magma"
          >
            <Layers className="h-3 w-3" />
            <span>Sesar</span>
          </button>
        </div>

        {/* Time of Day & Audio Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 p-1 rounded-xl backdrop-blur-md shadow-2xl text-[11px] font-mono">
          <button
            onClick={() => setTimeOfDay("DAY")}
            className={`p-1.5 rounded-lg transition-all ${
              timeOfDay === "DAY" ? "bg-amber-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="Waktu: Siang Hari"
          >
            <Sun className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setTimeOfDay("DUSK")}
            className={`p-1.5 rounded-lg transition-all ${
              timeOfDay === "DUSK" ? "bg-rose-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="Waktu: Senja / Golden Hour"
          >
            <Sunset className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setTimeOfDay("NIGHT")}
            className={`p-1.5 rounded-lg transition-all ${
              timeOfDay === "NIGHT" ? "bg-indigo-600 text-white font-bold" : "text-slate-400 hover:text-white"
            }`}
            title="Waktu: Malam Badai"
          >
            <Moon className="h-3.5 w-3.5" />
          </button>
          <div className="h-3 w-px bg-slate-800 mx-0.5" />
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition-all ${
              soundEnabled ? "text-rose-400 hover:bg-rose-950/40" : "text-slate-500"
            }`}
            title={soundEnabled ? "Audio Aktif (Suara Gempa/Erupsi)" : "Audio Dimatikan"}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Bottom Left: Live Seismograph Display */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 backdrop-blur-md shadow-2xl">
          <div className="flex items-center justify-between gap-2 text-[9px] font-mono text-slate-400 mb-1">
            <span className="flex items-center gap-1 font-bold text-rose-400">
              <Radio className="h-2.5 w-2.5 animate-pulse" /> SEISMOGRAM REAL-TIME
            </span>
            <span className="text-[8px] text-slate-500">60 Hz FILTERED</span>
          </div>
          <canvas
            ref={seismoCanvasRef}
            width={210}
            height={52}
            className="rounded border border-slate-900 bg-slate-950"
          />
        </div>
      </div>

      {/* Bottom Center: Disaster Effect Notification Pills */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 font-mono text-[10px]">
        {activeDisaster === "TSUNAMI" && (
          <span className="px-3 py-1 rounded-xl bg-cyan-950/90 border border-cyan-500/50 text-cyan-300 font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md">
            <Waves className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
            <span>INUNDASI DEFORMASI GELOMBANG TSUNAMI</span>
          </span>
        )}
        {activeDisaster === "VOLCANO" && (
          <span className="px-3 py-1 rounded-xl bg-amber-950/90 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md">
            <Flame className="h-3.5 w-3.5 animate-pulse text-amber-400" />
            <span>ERUPSI EKSPLOSIF: AWAN PANAS &amp; BOM LAVA</span>
          </span>
        )}
        {activeDisaster === "LIQUEFACTION" && (
          <span className="px-3 py-1 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md">
            <Droplets className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            <span>LIKUIFAKSI: TANAH MENCAIR &amp; GEDUNG AMBLAS</span>
          </span>
        )}
        {activeDisaster === "EARTHQUAKE" && magnitude >= 7.0 && (
          <span className="px-3 py-1 rounded-xl bg-rose-950/90 border border-rose-500/50 text-rose-300 font-bold flex items-center gap-1.5 shadow-xl backdrop-blur-md">
            <Flame className="h-3.5 w-3.5 animate-pulse text-rose-400" />
            <span>KERUNTUHAN STRUKTUR, SESAR ROBEK &amp; BLACKOUT</span>
          </span>
        )}
      </div>

      {/* Bottom Right: Navigation Tips */}
      <div className="absolute bottom-4 right-4 pointer-events-none flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/85 px-3 py-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
        <span>🖱️ Drag Kiri: Putar 360°</span>
        <span className="text-slate-600">&bull;</span>
        <span>Scroll: Zoom In/Out</span>
      </div>
    </div>
  );
}
