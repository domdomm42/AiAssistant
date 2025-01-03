import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

const AudioVisualizingSphere = ({ isPlaying }) => {
  const containerRef = useRef();
  const sceneRef = useRef();
  const sphereRef = useRef();
  const composerRef = useRef();

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });

    renderer.setClearColor(0x000000, 0);
    scene.background = null;

    renderer.setSize(500, 500);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    containerRef.current.appendChild(renderer.domElement);

    const renderScene = new RenderPass(scene, camera);

    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);

    // composer.addPass(new OutputPass());
    composerRef.current = composer;

    // make sphere
    const geometry = new THREE.SphereGeometry(1, 128, 128);
    const positions = geometry.attributes.position.array;

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );

    // Create points material with glow effect
    const material = new THREE.PointsMaterial({
      size: 0.015,
      color: 0x4a9eff, //0xff4a4a  is red
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const sphere = new THREE.Points(pointsGeometry, material);
    scene.add(sphere);
    sphereRef.current = sphere;

    const originalPositions = positions.slice();

    camera.position.z = 3;
    sceneRef.current = scene;

    const animate = () => {
      requestAnimationFrame(animate);

      if (sphere) {
        sphere.rotation.y += 0.003;

        const positions = pointsGeometry.attributes.position.array;
        const time = Date.now() * 0.001;

        for (let i = 0; i < positions.length; i += 3) {
          const x = originalPositions[i];
          const y = originalPositions[i + 1];
          const z = originalPositions[i + 2];

          const noise =
            Math.sin(x * 2 + time) *
            Math.cos(y * 2 + time) *
            Math.sin(z * 2 + time);

          const distortionAmount = isPlaying ? 0.2 : 0.1;
          positions[i] = x + noise * distortionAmount;
          positions[i + 1] = y + noise * distortionAmount;
          positions[i + 2] = z + noise * distortionAmount;
        }

        pointsGeometry.attributes.position.needsUpdate = true;
      }

      composer.render();
    };

    animate();

    return () => {
      containerRef.current?.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
    };
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex justify-center items-center"
    />
  );
};

export default AudioVisualizingSphere;
