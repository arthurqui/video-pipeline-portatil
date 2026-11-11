import * as THREE from './assets/three.module.js';

const { scenes } = await fetch('./timeline.json').then(response => response.json());
const canvas = document.querySelector('#video');
const ctx = canvas.getContext('2d');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(canvas.width, canvas.height);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#152237');
const camera = new THREE.PerspectiveCamera(42, canvas.width / canvas.height, 0.1, 50);
scene.add(new THREE.HemisphereLight(0xd2e6ff, 0x485077, 2));
const light = new THREE.DirectionalLight(0xffe2a7, 3);
light.position.set(4, 5, 4);
scene.add(light);
const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.5, 0.38, 12),
  new THREE.MeshStandardMaterial({ color: '#475579', flatShading: true }));
scene.add(pedestal);
const cube = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 1.25),
  new THREE.MeshStandardMaterial({ color: '#e6a449', flatShading: true }));
scene.add(cube);

window.seekTo = (seconds) => {
  const shot = scenes.find(item => seconds < item.end) ?? scenes.at(-1);
  const progress = THREE.MathUtils.clamp((seconds - shot.start) / (shot.end - shot.start), 0, 1);
  cube.position.y = 1.4 + Math.sin(progress * Math.PI * 2) * 0.12;
  cube.rotation.set(0.28, progress * Math.PI * 2, 0.12);
  cube.material.color.set(progress < 0.5 ? '#e6a449' : '#40c9b2');
  camera.position.set(2.7 - progress * 1.4, 2.7, 7 - progress);
  camera.lookAt(0, 1, 0);
  renderer.render(scene, camera);
  ctx.drawImage(renderer.domElement, 0, 0);
  const word = shot.captions.find(item => seconds >= item.start && seconds < item.end);
  if (!word) return;
  ctx.font = '900 48px Arial';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#101727';
  ctx.lineWidth = 8;
  ctx.fillStyle = 'white';
  ctx.strokeText(word.text, canvas.width / 2, 755, 490);
  ctx.fillText(word.text, canvas.width / 2, 755, 490);
};

window.seekTo(0);
window.animationReady = true;
