import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface ModelViewerProps {
  src: string;
  scale?: [number, number, number];
  /** Scene ID for matching lighting to render preset */
  sceneId?: string;
  autoRotate?: boolean;
  cameraControls?: boolean;
  className?: string;
}

// Map render scene IDs → Three.js lighting config
const SCENE_LIGHTS: Record<string, {
  bg: THREE.Color;
  ambient: number;
  key: { color: number; intensity: number; pos: [number, number, number] };
  fill: { color: number; intensity: number; pos: [number, number, number] };
  rim: { color: number; intensity: number; pos: [number, number, number] };
  material: { color: number; metalness: number; roughness: number };
}> = {
  studio_champagne: {
    bg: new THREE.Color(0xf5f0e8),
    ambient: 0.4,
    key: { color: 0xffeedd, intensity: 2.5, pos: [3, 4, 5] },
    fill: { color: 0xddddff, intensity: 0.8, pos: [-2, 1, -3] },
    rim: { color: 0xffffff, intensity: 0.6, pos: [0, -2, 3] },
    material: { color: 0xd4a853, metalness: 0.3, roughness: 0.2 },
  },
  studio_black_matte: {
    bg: new THREE.Color(0x2a2a2a),
    ambient: 0.3,
    key: { color: 0xffffff, intensity: 3.5, pos: [4, 5, 6] },
    fill: { color: 0x888888, intensity: 0.3, pos: [-3, 0, -2] },
    rim: { color: 0xffffff, intensity: 1.2, pos: [-1, -3, 4] },
    material: { color: 0x222222, metalness: 0.05, roughness: 0.6 },
  },
  studio_gunmetal: {
    bg: new THREE.Color(0x3a3a42),
    ambient: 0.35,
    key: { color: 0xeeeeff, intensity: 2.8, pos: [3, 4, 5] },
    fill: { color: 0xaaaacc, intensity: 0.6, pos: [-2, 1, -3] },
    rim: { color: 0xffffff, intensity: 0.8, pos: [0, -2, 4] },
    material: { color: 0x4a4a55, metalness: 0.4, roughness: 0.3 },
  },
  studio_automotive: {
    bg: new THREE.Color(0xeeeeee),
    ambient: 0.3,
    key: { color: 0xffffff, intensity: 4.0, pos: [5, 6, 4] },
    fill: { color: 0xccddff, intensity: 0.5, pos: [-3, 2, -4] },
    rim: { color: 0xffffff, intensity: 1.5, pos: [0, -3, 5] },
    material: { color: 0x111122, metalness: 0.7, roughness: 0.1 },
  },
  studio_white_soft: {
    bg: new THREE.Color(0xffffff),
    ambient: 0.6,
    key: { color: 0xffffff, intensity: 1.8, pos: [2, 3, 4] },
    fill: { color: 0xffffff, intensity: 1.0, pos: [-1, 1, -2] },
    rim: { color: 0xffffff, intensity: 0.5, pos: [0, -1, 2] },
    material: { color: 0xf0f0f0, metalness: 0.0, roughness: 0.4 },
  },
  studio_orange: {
    bg: new THREE.Color(0xfff5ee),
    ambient: 0.4,
    key: { color: 0xffeedd, intensity: 2.5, pos: [3, 4, 5] },
    fill: { color: 0xddddff, intensity: 0.7, pos: [-2, 1, -3] },
    rim: { color: 0xffffff, intensity: 0.6, pos: [0, -2, 3] },
    material: { color: 0xe8753a, metalness: 0.1, roughness: 0.35 },
  },
  detail_closeup: {
    bg: new THREE.Color(0x333333),
    ambient: 0.2,
    key: { color: 0xffffff, intensity: 3.0, pos: [1, 2, 3] },
    fill: { color: 0x888888, intensity: 0.4, pos: [-1, 0, -1] },
    rim: { color: 0xffffff, intensity: 1.0, pos: [0, -1, 2] },
    material: { color: 0x8899aa, metalness: 0.5, roughness: 0.2 },
  },
  transparent_black: {
    bg: new THREE.Color(0x111111),
    ambient: 0.25,
    key: { color: 0xffffff, intensity: 3.0, pos: [3, 4, 5] },
    fill: { color: 0x999999, intensity: 0.4, pos: [-2, 1, -3] },
    rim: { color: 0xffffff, intensity: 1.0, pos: [0, -2, 4] },
    material: { color: 0x111111, metalness: 0.05, roughness: 0.5 },
  },
};

const DEFAULT_LIGHT = SCENE_LIGHTS.studio_champagne;

export function ModelViewer({
  src,
  scale,
  sceneId,
  autoRotate = true,
  cameraControls = true,
  className = '',
}: ModelViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modelGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene; camera: THREE.PerspectiveCamera; renderer: THREE.WebGLRenderer;
    controls: OrbitControls; lights: THREE.Object3D[]; background: THREE.Color;
    material: THREE.MeshPhysicalMaterial;
  } | null>(null);

  const cfg = useMemo(
    () => SCENE_LIGHTS[sceneId || ''] || DEFAULT_LIGHT,
    [sceneId]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const w = container.clientWidth || 400;
    const h = container.clientHeight || 300;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(2.5, 2.0, 3.0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights — will be updated when cfg changes
    const ambient = new THREE.AmbientLight(0xffffff, cfg.ambient);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(cfg.key.color, cfg.key.intensity);
    key.position.set(...cfg.key.pos);
    key.castShadow = true;
    scene.add(key);

    const fill = new THREE.DirectionalLight(cfg.fill.color, cfg.fill.intensity);
    fill.position.set(...cfg.fill.pos);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(cfg.rim.color, cfg.rim.intensity);
    rim.position.set(...cfg.rim.pos);
    scene.add(rim);

    const lights = [ambient, key, fill, rim];

    // Ground
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 6),
      new THREE.ShadowMaterial({ color: 0xf3f4f6, opacity: 0.25 })
    );
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.6;
    plane.receiveShadow = true;
    scene.add(plane);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 3;
    controls.minDistance = 1.5;
    controls.maxDistance = 8;
    controls.target.set(0, 0, 0);

    // Animation
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Material
    const material = new THREE.MeshPhysicalMaterial({
      color: cfg.material.color,
      metalness: cfg.material.metalness,
      roughness: cfg.material.roughness,
      clearcoat: 0.1,
    });

    // Model group
    const group = new THREE.Group();
    group.position.set(0, 0, 0);
    scene.add(group);
    modelGroupRef.current = group;

    // Load OBJ
    fetch(src)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.text(); })
      .then(text => {
        const obj = new OBJLoader().parse(text);
        obj.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.material = material;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        group.add(obj);
        if (scale) group.scale.set(scale[0], scale[1], scale[2]);
      })
      .catch(() => {
        const ctx = renderer.domElement.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = '#9ca3af'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
          ctx.fillText('3D 预览加载失败', w / 2, h / 2);
        }
      });

    // Store refs
    sceneRef.current = {
      scene, camera, renderer, controls,
      lights, background: scene.background as THREE.Color, material,
    };

    // Resize
    const onResize = () => {
      const cw = container.clientWidth || 400;
      const ch = container.clientHeight || 300;
      camera.aspect = cw / ch;
      camera.updateProjectionMatrix();
      renderer.setSize(cw, ch);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      renderer.dispose();
      modelGroupRef.current = null;
      sceneRef.current = null;
    };
  }, [src, autoRotate, cameraControls]); // only recreate when src changes

  // Apply scale changes
  useEffect(() => {
    if (modelGroupRef.current && scale) {
      modelGroupRef.current.scale.set(scale[0], scale[1], scale[2]);
    }
  }, [scale]);

  // Apply scene lighting changes
  useEffect(() => {
    const sr = sceneRef.current;
    if (!sr) return;

    const { lights, material } = sr;
    const [ambient, key, fill, rim] = lights as [THREE.AmbientLight, THREE.DirectionalLight, THREE.DirectionalLight, THREE.DirectionalLight];
    const bg = sr.scene.background;
    if (bg instanceof THREE.Color) {
      bg.copy(cfg.bg);
    } else {
      sr.scene.background = cfg.bg.clone();
    }
    ambient.intensity = cfg.ambient;
    key.color.setHex(cfg.key.color);
    key.intensity = cfg.key.intensity;
    key.position.set(...cfg.key.pos);
    fill.color.setHex(cfg.fill.color);
    fill.intensity = cfg.fill.intensity;
    fill.position.set(...cfg.fill.pos);
    rim.color.setHex(cfg.rim.color);
    rim.intensity = cfg.rim.intensity;
    rim.position.set(...cfg.rim.pos);
    material.color.setHex(cfg.material.color);
    material.metalness = cfg.material.metalness;
    material.roughness = cfg.material.roughness;
  }, [cfg]);

  return (
    <div
      ref={containerRef}
      className={`bg-gray-100 rounded-lg overflow-hidden ${className}`}
      style={{ width: '100%', height: '100%', minHeight: 300 }}
    />
  );
}
