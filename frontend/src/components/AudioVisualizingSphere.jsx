import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";

const AudioVisualizingSphere = ({ volume = 0 }) => {
  const containerRef = useRef();
  const originalPositions = useRef();
  const sphere = useRef();

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
    composer.current = composer;

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
    sphere.current = sphere;

    originalPositions.current = positions.slice();

    camera.position.z = 3;

    const animate = () => {
      requestAnimationFrame(animate);

      if (sphere.current) {
        sphere.current.rotation.y += 0.003;

        // Only update positions if there's significant volume

        if (volume > 0.01) {
          const positions = pointsGeometry.current.attributes.position.array;
          const time = Date.now() * 0.001;

          for (let i = 0; i < positions.length; i += 3) {
            const x = originalPositions.current[i];
            const y = originalPositions.current[i + 1];
            const z = originalPositions.current[i + 2];

            const noise =
              (Math.sin(x + time) + Math.cos(y + time) + Math.sin(z + time)) /
              3;

            const distortionAmount = volume * 0.3;
            positions[i] = x + noise * distortionAmount;
            positions[i + 1] = y + noise * distortionAmount;
            positions[i + 2] = z + noise * distortionAmount;
          }

          pointsGeometry.current.attributes.position.needsUpdate = true;
        }
      }

      composer.current.render();
    };

    animate();

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  useEffect(() => {
    if (!sphere.current) return;

    sphere.current.scale.set(
      1 + volume * 0.1,
      1 + volume * 0.1,
      1 + volume * 0.1
    );
  }, [volume]);

  return <div ref={containerRef} />;
};

export default AudioVisualizingSphere;
