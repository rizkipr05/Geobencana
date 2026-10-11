"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

interface SimulationParams {
  magnitude: number;
  depthKm: number;
  slipMeters: number;
  isTsunamiActive: boolean;
  isSimulating: boolean;
}

export function ThreeEarthquakeCanvas({
  magnitude,
  depthKm,
  slipMeters,
  isTsunamiActive,
  isSimulating,
}: SimulationParams) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const shockwavesRef = useRef<THREE.Mesh[]>([]);
  const waveMeshRef = useRef<THREE.Mesh | null>(null);
  const faultMeshRef = useRef<THREE.Mesh | null>(null);
  const epicenterRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050814); // Deep navy dark
    scene.fog = new THREE.FogExp2(0x050814, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 35, 55);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xff6b6b, 1.8);
    dirLight.position.set(20, 40, 20);
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x00e5ff, 2, 80);
    blueLight.position.set(-20, 20, -10);
    scene.add(blueLight);

    // Grid Floor / Tectonic Base
    const gridHelper = new THREE.GridHelper(70, 35, 0xe11d48, 0x1e293b);
    gridHelper.position.y = -8;
    scene.add(gridHelper);

    // Tectonic Plate Block A (Continental)
    const plateAGeometry = new THREE.BoxGeometry(32, 8, 30);
    const plateAMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.2,
      wireframe: false,
    });
    const plateA = new THREE.Mesh(plateAGeometry, plateAMaterial);
    plateA.position.set(-16.5, -4, 0);
    scene.add(plateA);

    // Tectonic Plate Block B (Oceanic Plate)
    const plateBGeometry = new THREE.BoxGeometry(32, 8, 30);
    const plateBMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.3,
    });
    const plateB = new THREE.Mesh(plateBGeometry, plateBMaterial);
    plateB.position.set(16.5, -4, 0);
    scene.add(plateB);

    // Fault Plane line in between
    const faultGeo = new THREE.BoxGeometry(1.2, 9, 32);
    const faultMat = new THREE.MeshStandardMaterial({
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 0.6,
    });
    const faultPlane = new THREE.Mesh(faultGeo, faultMat);
    faultPlane.position.set(0, -3.5, 0);
    faultPlane.rotation.z = 0.15; // inclined subduction angle
    scene.add(faultPlane);
    faultMeshRef.current = faultPlane;

    // Ocean Surface plane (Water)
    const oceanGeo = new THREE.PlaneGeometry(64, 30, 48, 48);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.1,
      metalness: 0.8,
      transparent: true,
      opacity: 0.65,
      wireframe: true,
    });
    const ocean = new THREE.Mesh(oceanGeo, oceanMat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.set(0, 0.5, 0);
    scene.add(ocean);
    waveMeshRef.current = ocean;

    // Hypocenter / Focus point (Deep under fault)
    const hypocenterGeo = new THREE.SphereGeometry(1.2, 16, 16);
    const hypocenterMat = new THREE.MeshBasicMaterial({
      color: 0xff2200,
      wireframe: true,
    });
    const hypocenter = new THREE.Mesh(hypocenterGeo, hypocenterMat);
    hypocenter.position.set(0, -5, 0);
    scene.add(hypocenter);

    // Epicenter (Surface projection)
    const epiGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.2, 24);
    const epiMat = new THREE.MeshBasicMaterial({
      color: 0xff0055,
    });
    const epicenter = new THREE.Mesh(epiGeo, epiMat);
    epicenter.position.set(0, 0.6, 0);
    scene.add(epicenter);
    epicenterRef.current = epicenter;

    // Seismic shockwave rings
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const ringGeo = new THREE.RingGeometry(2 + i * 4, 2.5 + i * 4, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.7;
      scene.add(ring);
      rings.push(ring);
    }
    shockwavesRef.current = rings;

    // Handle Resize
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    let animFrameId: number;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Slow orbit rotation of the entire view for cinematic feel
      scene.rotation.y = Math.sin(elapsedTime * 0.15) * 0.15;

      // Animate shockwaves
      rings.forEach((ring, index) => {
        const speed = 3.5;
        const progress = (elapsedTime * speed + index * 1.5) % 6;
        const scale = 1 + progress * 2.5;
        ring.scale.set(scale, scale, 1);
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1 - progress / 5);
      });

      // Animate ocean waves if tsunami is active
      if (waveMeshRef.current) {
        const positions = waveMeshRef.current.geometry.attributes.position;
        const count = positions.count;
        for (let i = 0; i < count; i++) {
          const u = positions.getX(i);
          const v = positions.getY(i);
          const waveHeight = isTsunamiActive
            ? Math.sin(u * 0.3 + elapsedTime * 4.0) * Math.cos(v * 0.3 + elapsedTime * 3.0) * 1.5
            : Math.sin(u * 0.2 + elapsedTime * 1.0) * 0.2;
          positions.setZ(i, waveHeight);
        }
        positions.needsUpdate = true;
      }

      // Shaking tremor effect if simulating
      if (isSimulating && faultMeshRef.current) {
        const jitter = (Math.random() - 0.5) * (magnitude * 0.08);
        faultMeshRef.current.position.x = jitter;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update dynamic depth and fault properties
  useEffect(() => {
    if (epicenterRef.current) {
      const scale = 1 + (magnitude - 5) * 0.4;
      epicenterRef.current.scale.set(scale, 1, scale);
    }
  }, [magnitude, depthKm, slipMeters]);

  return (
    <div className="relative w-full h-full min-h-[460px] rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
      <div ref={mountRef} className="w-full h-full" />

      {/* Floating 3D Telemetry Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5 font-mono">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-750 text-[11px] text-rose-400">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-ping" />
          <span>FAULT DYNAMICS: SUBDUCTION ZONE</span>
        </div>
        <div className="text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
          Grid: 70x35 km &bull; Hypocenter: -{depthKm} km &bull; Slip: {slipMeters} m
        </div>
      </div>

      <div className="absolute bottom-4 right-4 pointer-events-none flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur-md">
        <span>Three.js WebGL Engine</span>
        <span className="text-slate-600">&bull;</span>
        <span className="text-emerald-400">60 FPS</span>
      </div>
    </div>
  );
}
