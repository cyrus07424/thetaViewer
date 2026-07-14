"use client";

import { useEffect, useRef, useCallback } from "react";
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

    // Clean up previous renderer
    if (rendererRef.current) {
      cancelAnimationFrame(frameRef.current);
      rendererRef.current.dispose();
      rendererRef.current.domElement.remove();
      rendererRef.current = null;
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
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
    loader.load(imageUrl, (texture) => {
      const imgW = texture.image.width as number;
      const imgH = texture.image.height as number;

      let thetaLength = (2 * Math.PI * imgH) / imgW;
      if (thetaLength > Math.PI) thetaLength = Math.PI;
      const thetaStart = (Math.PI - thetaLength) / 2;

      const geometry = new THREE.SphereGeometry(
        1, 64, 32,
        0, 2 * Math.PI,
        thetaStart, thetaLength
      );
      // Flip the sphere inside-out
      geometry.scale(-1, 1, 1);

      const material = new THREE.MeshBasicMaterial({ map: texture });
      const mesh = new THREE.Mesh(geometry, material);
      meshRef.current = mesh;
      scene.add(mesh);
    });

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
      cancelAnimationFrame(animFrameId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [imageUrl, updateCamera]);

  // Pointer / touch / wheel event handlers
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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
      const t = e.touches[0];
      touchXRef.current = t.screenX;
      touchYRef.current = t.screenY;
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      latRef.current = Math.max(
        -85,
        Math.min(85, latRef.current + (t.screenY - touchYRef.current) * 0.2)
      );
      lngRef.current -= (t.screenX - touchXRef.current) * 0.2;
      touchXRef.current = t.screenX;
      touchYRef.current = t.screenY;
      updateCamera();
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
    <div
      ref={containerRef}
      className="w-full h-full cursor-grab active:cursor-grabbing"
    />
  );
}
