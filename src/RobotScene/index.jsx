import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import styles from './style.module.css';
const toCssSize = size => (typeof size === 'number' ? `${size}px` : size);
const RobotScene = ({ height = 600, reportText = '', width = 600 }) => {
   const containerRef = useRef(null);
   const speechMonitorRef = useRef(null);
   const utteranceRef = useRef(null);
   const [speechError, setSpeechError] = useState('');
   const [speechStatus, setSpeechStatus] = useState('idle');
   const speechStatusRef = useRef('idle');
   const speechRef = useRef({
      jawOpening: 0,
      speaking: false,
      startedAt: 0,
      syllables: 1,
      word: '',
   });
   const setSpeechState = (
      speaking,
      word = speechRef.current.word,
      syllables = speechRef.current.syllables,
   ) => {
      const speech = speechRef.current;
      const wordChanged = speech.word !== word;
      const speakingChanged = speech.speaking !== speaking;
      speech.speaking = speaking;
      speech.word = word;
      speech.syllables = syllables;
      if (speakingChanged || wordChanged) speech.startedAt = performance.now();
   };
   const clearSpeechMonitor = () => {
      if (speechMonitorRef.current !== null) {
         window.clearInterval(speechMonitorRef.current);
         speechMonitorRef.current = null;
      }
   };
   const updateSpeechStatus = status => {
      speechStatusRef.current = status;
      setSpeechStatus(status);
   };
   const syncSpeechStatus = utterance => {
      if (utteranceRef.current !== utterance) return;
      const synthesis = window.speechSynthesis;
      if (synthesis.paused) {
         setSpeechState(false);
         updateSpeechStatus('paused');
      } else if (synthesis.speaking) {
         setSpeechState(true);
         updateSpeechStatus('speaking');
      } else if (
         speechStatusRef.current === 'speaking' ||
         speechStatusRef.current === 'paused'
      ) {
         clearSpeechMonitor();
         utteranceRef.current = null;
         setSpeechState(false);
         updateSpeechStatus('idle');
      }
   };
   const speakReport = () => {
      if (speechStatus === 'paused' && utteranceRef.current) {
         window.speechSynthesis.resume();
         syncSpeechStatus(utteranceRef.current);
         return;
      }
      if (speechStatus === 'speaking') return;
      if (!reportText.trim()) {
         setSpeechError('Ovoz chiqarish uchun hisobot matnini kiriting.');
         return;
      }
      if (
         !('speechSynthesis' in window) ||
         !('SpeechSynthesisUtterance' in window)
      ) {
         setSpeechError('Brauzeringiz ovozli o‘qishni qo‘llab-quvvatlamaydi.');
         return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(reportText);
      utterance.lang = 'uz-UZ';
      utterance.rate = 0.95;
      utteranceRef.current = utterance;
      setSpeechState(false, '', 1);
      updateSpeechStatus('starting');
      setSpeechError('');
      utterance.onstart = () => {
         syncSpeechStatus(utterance);
      };
      utterance.onboundary = event => {
         if (
            utteranceRef.current !== utterance ||
            (event.name && event.name !== 'word')
         )
            return;
         const match = reportText
            .slice(event.charIndex)
            .match(/^[\p{L}\p{N}]+(?:['’ʻ][\p{L}\p{N}]+)*/u);
         const word = match?.[0] ?? '';
         const syllables = Math.max(
            1,
            (word.toLowerCase().match(/[aeiou]/g) || []).length,
         );
         if (
            window.speechSynthesis.speaking &&
            !window.speechSynthesis.paused
         ) {
            setSpeechState(true, word, syllables);
         }
      };
      const finish = () => {
         if (utteranceRef.current === utterance) {
            clearSpeechMonitor();
            utteranceRef.current = null;
            setSpeechState(false);
            updateSpeechStatus('idle');
         }
      };
      utterance.onpause = () => {
         if (utteranceRef.current === utterance) {
            setSpeechState(false);
            updateSpeechStatus('paused');
         }
      };
      utterance.onresume = () => {
         syncSpeechStatus(utterance);
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
      speechMonitorRef.current = window.setInterval(
         () => syncSpeechStatus(utterance),
         100,
      );
   };
   const pauseReport = () => {
      if (speechStatus !== 'speaking') return;
      window.speechSynthesis.pause();
      syncSpeechStatus(utteranceRef.current);
   };
   useEffect(() => {
      const container = containerRef.current;
      if (!container) return undefined;
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
         45,
         window.innerWidth / window.innerHeight,
         0.1,
         1000,
      );
      camera.position.set(0, 1.2, 4.5);
      const renderer = new THREE.WebGLRenderer({
         antialias: true,
         alpha: true,
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.enableZoom = false;
      controls.maxPolarAngle = Math.PI / 1.8;
      controls.minPolarAngle = Math.PI / 4;
      controls.target.set(0, 0.5, 0);
      scene.add(new THREE.AmbientLight(0x9fc9e7, 1.35));
      const dirLight = new THREE.DirectionalLight(0xe7f5ff, 3.2);
      dirLight.position.set(4, 7, 5);
      dirLight.castShadow = true;
      scene.add(dirLight);
      const blueLight = new THREE.PointLight(0x00c8ff, 4, 9);
      blueLight.position.set(-2.5, 1.8, 2.5);
      scene.add(blueLight);
      const purpleLight = new THREE.PointLight(0x854dff, 3, 8);
      purpleLight.position.set(2.5, -0.5, 2);
      scene.add(purpleLight);
      const robotGroup = new THREE.Group();
      robotGroup.scale.setScalar(0.82);
      const shellMat = new THREE.MeshStandardMaterial({
         color: 0xdce9f3,
         roughness: 0.24,
         metalness: 0.58,
      });
      const darkMat = new THREE.MeshStandardMaterial({
         color: 0x101a2a,
         roughness: 0.27,
         metalness: 0.72,
      });
      const cyanMat = new THREE.MeshStandardMaterial({
         color: 0x45edff,
         emissive: 0x00a9c5,
         emissiveIntensity: 1.4,
         metalness: 0.32,
         roughness: 0.22,
      });
      const violetMat = new THREE.MeshStandardMaterial({
         color: 0xa57aff,
         emissive: 0x4c18bb,
         emissiveIntensity: 1.1,
         metalness: 0.35,
         roughness: 0.25,
      });
      const roundedBox = (width, height, depth, radius = 0.08) =>
         new RoundedBoxGeometry(width, height, depth, 4, radius);
      const addPart = (geometry, material, position, parent = robotGroup) => {
         const mesh = new THREE.Mesh(geometry, material);
         mesh.position.set(...position);
         mesh.castShadow = true;
         mesh.receiveShadow = true;
         parent.add(mesh);
         return mesh;
      };
      const headShell = addPart(
         new THREE.SphereGeometry(1, 48, 32),
         shellMat,
         [0, 0.54, 0],
      );
      headShell.scale.set(0.82, 0.66, 0.42);
      const faceplate = addPart(
         new THREE.SphereGeometry(1, 48, 32),
         darkMat,
         [0, 0.5, 0.45],
      );
      faceplate.scale.set(0.63, 0.4, 0.09);
      const eyeRimGeo = new THREE.TorusGeometry(0.145, 0.026, 12, 40);
      for (const x of [-0.34, 0.34]) {
         const rim = addPart(eyeRimGeo, darkMat, [x, 0.69, 0.584]);
         rim.rotation.z = Math.PI / 2;
      }
      const eyeGeo = new THREE.SphereGeometry(0.092, 32, 24);
      const eyeLeft = addPart(eyeGeo, cyanMat, [-0.34, 0.69, 0.59]);
      const eyeRight = addPart(eyeGeo, cyanMat, [0.34, 0.69, 0.59]);
      addPart(roundedBox(0.63, 0.24, 0.06, 0.07), darkMat, [0, 0.24, 0.59]);
      const mouthGlow = addPart(
         roundedBox(0.38, 0.035, 0.025, 0.015),
         cyanMat,
         [0, 0.24, 0.631],
      );
      mouthGlow.scale.y = 0.35;
      const lowerJaw = new THREE.Group();
      const jawMesh = new THREE.Mesh(
         roundedBox(0.76, 0.25, 0.2, 0.08),
         shellMat,
      );
      jawMesh.position.set(0, -0.13, 0);
      jawMesh.castShadow = true;
      lowerJaw.add(jawMesh);
      const jawAccent = new THREE.Mesh(
         roundedBox(0.43, 0.025, 0.025, 0.012),
         cyanMat,
      );
      jawAccent.position.set(0, -0.13, 0.105);
      lowerJaw.add(jawAccent);
      const mouthLight = new THREE.PointLight(0x00dfff, 0, 1.4);
      mouthLight.position.set(0, 0.18, 0.72);
      lowerJaw.add(mouthLight);
      lowerJaw.position.set(0, 0.18, 0.61);
      robotGroup.add(lowerJaw);
      for (const side of [-1, 1]) {
         const ear = addPart(roundedBox(0.22, 0.44, 0.34, 0.09), darkMat, [
            side * 0.82,
            0.53,
            0,
         ]);
         const earLight = addPart(
            new THREE.SphereGeometry(0.055, 20, 16),
            violetMat,
            [side * 0.82, 0.53, 0.18],
         );
         ear.rotation.z = side * -0.08;
         earLight.scale.set(1, 1.25, 0.55);
         addPart(roundedBox(0.035, 0.13, 0.025, 0.01), violetMat, [
            side * 0.51,
            0.44,
            0.585,
         ]);
      }
      addPart(
         new THREE.CylinderGeometry(0.2, 0.25, 0.26, 32),
         darkMat,
         [0, -0.13, 0],
      );
      addPart(roundedBox(1.3, 0.34, 0.56, 0.14), darkMat, [0, -0.44, 0]);
      addPart(
         new THREE.CylinderGeometry(0.55, 0.4, 1.08, 8, 1),
         shellMat,
         [0, -0.98, 0],
      );
      for (const side of [-1, 1]) {
         addPart(new THREE.SphereGeometry(0.2, 24, 18), shellMat, [
            side * 0.72,
            -0.59,
            0,
         ]);
         const arm = addPart(roundedBox(0.22, 0.58, 0.24, 0.09), darkMat, [
            side * 0.82,
            -0.91,
            0,
         ]);
         arm.rotation.z = side * -0.12;
         addPart(new THREE.SphereGeometry(0.095, 20, 16), violetMat, [
            side * 0.82,
            -1.13,
            0.12,
         ]);
      }
      addPart(
         new THREE.TorusGeometry(0.19, 0.035, 12, 40),
         violetMat,
         [0, -0.83, 0.46],
      );
      addPart(
         new THREE.SphereGeometry(0.095, 24, 18),
         cyanMat,
         [0, -0.83, 0.46],
      );
      for (let i = 0; i < 3; i++) {
         addPart(
            roundedBox(0.075, 0.025, 0.025, 0.01),
            i === 1 ? cyanMat : violetMat,
            [(i - 1) * 0.13, -1.18, 0.39],
         );
      }
      const pedestal = new THREE.Group();
      pedestal.position.y = -1.62;
      const base = addPart(
         new THREE.CylinderGeometry(0.62, 0.72, 0.12, 48),
         darkMat,
         [0, 0, 0],
         pedestal,
      );
      base.receiveShadow = true;
      const ring = addPart(
         new THREE.TorusGeometry(0.55, 0.025, 10, 64),
         cyanMat,
         [0, 0.07, 0],
         pedestal,
      );
      ring.rotation.x = Math.PI / 2;
      robotGroup.add(pedestal);
      scene.add(robotGroup);
      const resize = () => {
         const width = container.clientWidth;
         const height = container.clientHeight;
         if (!width || !height) return;
         camera.aspect = width / height;
         camera.updateProjectionMatrix();
         renderer.setSize(width, height);
      };
      resize();
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(container);
      let frameId;
      const animate = (time = 0) => {
         frameId = window.requestAnimationFrame(animate);
         controls.update();
         robotGroup.position.y = 0.65 + Math.sin(time * 0.002) * 0.06;
         const eyePulse = 1 + Math.sin(time * 0.003) * 0.035;
         eyeLeft.scale.setScalar(eyePulse);
         eyeRight.scale.setScalar(eyePulse);
         const speech = speechRef.current;
         let targetOpening = 0;
         if (speech.speaking) {
            const elapsed = Math.max(0, time - speech.startedAt);
            const syllableRate = 4.2 + Math.min(speech.syllables, 4) * 0.55;
            const phase = elapsed * 0.001 * syllableRate * Math.PI * 2 * 0.95;
            const pulse = Math.max(0, Math.sin(phase));
            const secondary = Math.max(0, Math.sin(phase * 0.52 + 1.1));
            const wordWeight = speech.word
               ? Math.min(1, 0.38 + speech.syllables * 0.12)
               : 0.55;
            targetOpening = Math.min(
               1,
               (pulse * 0.68 + secondary * 0.32) * wordWeight,
            );
         }
         speech.jawOpening +=
            (targetOpening - speech.jawOpening) *
            (targetOpening > speech.jawOpening ? 0.34 : 0.14);
         lowerJaw.position.y = 0.18 - speech.jawOpening * 0.12;
         lowerJaw.rotation.x = -speech.jawOpening * 0.3;
         mouthGlow.scale.y = 0.35 + speech.jawOpening * 2.3;
         mouthLight.intensity = speech.jawOpening * 2.8;
         renderer.render(scene, camera);
      };
      animate();
      return () => {
         window.cancelAnimationFrame(frameId);
         resizeObserver.disconnect();
         controls.dispose();
         clearSpeechMonitor();
         utteranceRef.current = null;
         window.speechSynthesis?.cancel();
         setSpeechState(false, '', 1);
         updateSpeechStatus('idle');
         scene.traverse(object => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
               const materials = Array.isArray(object.material)
                  ? object.material
                  : [object.material];
               materials.forEach(material => material.dispose());
            }
         });
         renderer.dispose();
         renderer.domElement.remove();
      };
   }, []);
   return (
      <div
         className={styles.robotScene}
         style={{ width: toCssSize(width), height: toCssSize(height) }}
      >
         <div
            aria-hidden='true'
            className={styles.canvasContainer}
            ref={containerRef}
         />
         <div className={styles.speechControls}>
            {speechStatus === 'speaking' ? (
               <button
                  className={`${styles.playerButton} ${styles.pauseButton}`}
                  type='button'
                  onClick={pauseReport}
                  aria-label='Hisobotni pauzaga qo‘yish'
                  title='Pauza'
               >
                  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
                     <rect x='6.5' y='5.5' width='4' height='13' rx='1' />
                     <rect x='13.5' y='5.5' width='4' height='13' rx='1' />
                  </svg>
               </button>
            ) : (
               <button
                  className={`${styles.playerButton} ${styles.playButton}`}
                  type='button'
                  onClick={speakReport}
                  disabled={speechStatus === 'starting'}
                  aria-label={
                     speechStatus === 'paused'
                        ? 'Hisobotni davom ettirish'
                        : 'Hisobotni boshlash'
                  }
                  title={
                     speechStatus === 'starting'
                        ? 'Ovoz ishga tushmoqda'
                        : speechStatus === 'paused'
                          ? 'Davom ettirish'
                          : 'Boshlash'
                  }
               >
                  <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
                     <path d='M8 5.8c0-.8.9-1.3 1.6-.9l9.1 6.1a1.2 1.2 0 0 1 0 2l-9.1 6.1a1.1 1.1 0 0 1-1.6-.9V5.8Z' />
                  </svg>
               </button>
            )}
         </div>
      </div>
   );
};
export default RobotScene;
