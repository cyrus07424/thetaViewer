"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import * as THREE from "three";

interface ThetaViewerProps {
  imageUrl: string;
}

export default function ThetaViewer({ imageUrl }: ThetaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const frameRef = useRef<number>(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // interaction state
  const isRotatingRef = useRef(false);
  const latRef = useRef(0);
  const lngRef = useRef(0);
  const onDownLatRef = useRef(0);
  const onDownLngRef = useRef(0);
  const onDownXRef = useRef(0);
  const onDownYRef = useRef(0);
  const touchXRef = useRef(0);
  const touchYRef = useRef(0);
  const pinchDistanceRef = useRef(0);
  const pinchStartFovRef = useRef(72);

  const disposeMesh = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (sceneRef.current) {
      sceneRef.current.remove(mesh);
    }

    mesh.geometry.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      for (const item of material) {
        const mappedMaterial = item as THREE.MeshBasicMaterial;
        mappedMaterial.map?.dispose();
        item.dispose();
      }
    } else {
      const mappedMaterial = material as THREE.MeshBasicMaterial;
      mappedMaterial.map?.dispose();
      material.dispose();
    }

    meshRef.current = null;
  }, []);

  const updateCamera = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    const phi = ((90 - latRef.current) * Math.PI) / 180;
    const theta = (lngRef.current * Math.PI) / 180;
    camera.lookAt(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    );
  }, []);

  // Build / rebuild scene when imageUrl changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let active = true;
    setLoadError(null);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      72,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;
    updateCamera();

    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (texture) => {
        if (!active) {
          texture.dispose();
          return;
        }

        disposeMesh();

        const imgW = texture.image.width as number;
        const imgH = texture.image.height as number;

        let thetaLength = (2 * Math.PI * imgH) / imgW;
        if (thetaLength > Math.PI) thetaLength = Math.PI;
        const thetaStart = (Math.PI - thetaLength) / 2;

        const geometry = new THREE.SphereGeometry(
          1,
          64,
          32,
          0,
          2 * Math.PI,
          thetaStart,
          thetaLength
        );
        // Flip the sphere inside-out
        geometry.scale(-1, 1, 1);

        const material = new THREE.MeshBasicMaterial({ map: texture });
        const mesh = new THREE.Mesh(geometry, material);
        meshRef.current = mesh;
        scene.add(mesh);
      },
      undefined,
      () => {
        if (active) {
          setLoadError("画像の読み込みに失敗しました。別の画像を選択してください。");
        }
      }
    );

    let animFrameId: number;
    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();
    frameRef.current = animFrameId!;

    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener("resize", onResize);

    return () => {
      active = false;
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", onResize);
      disposeMesh();
      renderer.dispose();
      renderer.domElement.remove();
      rendererRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
    };
  }, [disposeMesh, imageUrl, updateCamera]);

  // Pointer / touch / wheel event handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const getTouchDistance = (t1: Touch, t2: Touch) => {
      const dx = t1.screenX - t2.screenX;
      const dy = t1.screenY - t2.screenY;
      return Math.hypot(dx, dy);
    };

    const onMouseDown = (e: MouseEvent) => {
      isRotatingRef.current = true;
      onDownLatRef.current = latRef.current;
      onDownLngRef.current = lngRef.current;
      onDownXRef.current = e.clientX;
      onDownYRef.current = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isRotatingRef.current) return;
      latRef.current = Math.max(
        -85,
        Math.min(
          85,
          (e.clientY - onDownYRef.current) * 0.1 + onDownLatRef.current
        )
      );
      lngRef.current =
        (onDownXRef.current - e.clientX) * 0.1 + onDownLngRef.current;
      updateCamera();
    };

    const onMouseUp = () => {
      isRotatingRef.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        touchXRef.current = t.screenX;
        touchYRef.current = t.screenY;
      } else if (e.touches.length === 2) {
        pinchDistanceRef.current = getTouchDistance(e.touches[0], e.touches[1]);
        pinchStartFovRef.current = cameraRef.current?.fov ?? 72;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const t = e.touches[0];
        latRef.current = Math.max(
          -85,
          Math.min(85, latRef.current + (t.screenY - touchYRef.current) * 0.2)
        );
        lngRef.current -= (t.screenX - touchXRef.current) * 0.2;
        touchXRef.current = t.screenX;
        touchYRef.current = t.screenY;
        updateCamera();
        return;
      }

      if (e.touches.length === 2) {
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        if (pinchDistanceRef.current <= 0 || currentDistance <= 0) {
          return;
        }

        const camera = cameraRef.current;
        if (!camera) return;

        const zoomFactor = pinchDistanceRef.current / currentDistance;
        const nextFov = Math.max(
          20,
          Math.min(150, pinchStartFovRef.current * zoomFactor)
        );
        camera.fov = nextFov;
        camera.updateProjectionMatrix();
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const camera = cameraRef.current;
      if (!camera) return;
      let fov = camera.fov + e.deltaY * 0.05;
      fov = Math.max(20, Math.min(150, fov));
      camera.fov = fov;
      camera.updateProjectionMatrix();
    };

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseup", onMouseUp);
    container.addEventListener("mouseleave", onMouseUp);
    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseup", onMouseUp);
      container.removeEventListener("mouseleave", onMouseUp);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("wheel", onWheel);
    };
  }, [updateCamera]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />
      {loadError ? (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 rounded-md bg-black/60 px-3 py-2 text-xs text-red-200">
          {loadError}
        </div>
      ) : null}
    </div>
  );
}
