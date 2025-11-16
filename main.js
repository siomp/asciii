import * as THREE from 'three';
import { AsciiEffect } from 'three/examples/jsm/effects/AsciiEffect.js';

// === CONSTANTS ===
const BALL_PHASE = 0;
const GROUND_TO_KEY_PHASE = 1;
const KEY_JUMP_PHASE = 2;
const KEY_TO_DOOR_PHASE = 3;
const PHASE_DURATIONS = [5000, 4000, 2000, 3000]; // ms for each phase
const TOTAL_PHASES = 4;

// === SCENE SETUP ===
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 20;

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);

const effect = new AsciiEffect(renderer, ' .:-+*=%@#', { invert: true });
effect.setSize(window.innerWidth, window.innerHeight);
effect.domElement.style.color = 'lime';
effect.domElement.style.backgroundColor = 'black';
document.body.appendChild(effect.domElement);

// === CHECKERBOARD GROUND ===
const checkerboardSize = 10;
const squareSize = 2;
const groundGroup = new THREE.Group();
for (let x = 0; x < checkerboardSize; x++) {
  for (let z = 0; z < checkerboardSize; z++) {
    const color = (x + z) % 2 === 0 ? 0x8000ff : 0xffffff;
    const squareGeo = new THREE.PlaneGeometry(squareSize, squareSize);
    const squareMat = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const square = new THREE.Mesh(squareGeo, squareMat);
    square.position.x = (x - checkerboardSize / 2) * squareSize + squareSize / 2;
    square.position.z = (z - checkerboardSize / 2) * squareSize + squareSize / 2;
    square.position.y = -7;
    square.rotation.x = -Math.PI / 2;
    groundGroup.add(square);
  }
}
scene.add(groundGroup);

// === KEY (hidden until morph) ===
const keyGroup = new THREE.Group();
// Shaft
const keyShaftGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 8);
const keyShaftMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const keyShaft = new THREE.Mesh(keyShaftGeometry, keyShaftMaterial);
keyShaft.rotation.z = Math.PI / 2;
keyShaft.position.set(0, 0, 0);
keyGroup.add(keyShaft);
// Bow (circle)
const keyBowGeometry = new THREE.TorusGeometry(0.5, 0.18, 8, 24);
const keyBow = new THREE.Mesh(keyBowGeometry, keyShaftMaterial);
keyBow.position.set(-1, 0, 0);
keyGroup.add(keyBow);
// 'x*i' symbol (as 3D text or box stand-ins)
const symbolGroup = new THREE.Group();
const symbolGeo = new THREE.BoxGeometry(0.12, 0.4, 0.1);
const symbolMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
const x1 = new THREE.Mesh(symbolGeo, symbolMat); x1.position.set(-1.2, 0.2, 0.4); x1.rotation.z = Math.PI/4;
symbolGroup.add(x1);
const x2 = new THREE.Mesh(symbolGeo, symbolMat); x2.position.set(-1.2, 0.2, 0.4); x2.rotation.z = -Math.PI/4;
symbolGroup.add(x2);
const star = new THREE.Mesh(symbolGeo, symbolMat); star.position.set(-1, 0.2, 0.4); star.rotation.z = 0;
symbolGroup.add(star);
const i = new THREE.Mesh(symbolGeo, symbolMat); i.position.set(-0.8, 0.2, 0.4); i.scale.x = 0.5;
symbolGroup.add(i);
keyGroup.add(symbolGroup);
keyGroup.position.set(0, -7, 0);
keyGroup.visible = false;
scene.add(keyGroup);

// === DOOR (hidden until morph) ===
const doorGroup = new THREE.Group();
const doorGeometry = new THREE.BoxGeometry(8, 12, 1);
const doorMaterial = new THREE.MeshBasicMaterial({ color: 0x8B5A2B });
const door = new THREE.Mesh(doorGeometry, doorMaterial);
doorGroup.add(door);
const frameGeometry = new THREE.BoxGeometry(8.4, 12.4, 0.3);
const frameMaterial = new THREE.MeshBasicMaterial({ color: 0xdeb887 });
const frame = new THREE.Mesh(frameGeometry, frameMaterial);
frame.position.z = -0.7;
doorGroup.add(frame);
const handleGeometry = new THREE.SphereGeometry(0.3, 8, 8);
const handleMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const handle = new THREE.Mesh(handleGeometry, handleMaterial);
handle.position.set(3.2, -2, 0.7);
doorGroup.add(handle);
doorGroup.position.z = 0;
doorGroup.visible = true;
scene.add(doorGroup);

// === BALLS ===
const balls = [];
const torusGeometry = new THREE.TorusGeometry(1.5, 0.3, 16, 32, Math.PI * 2); // outer radius 1.5, tube 0.3
// For a 5x3 hole, set the torus inner radius to about 0.8 (hole diameter ~1.6 units)
// We'll scale the torus to get the 5x3 proportion
function createLightPattern() {
  // Create a group of 4 triangle patterns made of '¬'
  const group = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    // Each triangle is a plane with a canvas texture of stacked '¬' symbols
    const size = 0.7;
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#00ff00';
    // Draw a triangle without base using '¬' symbols
    ctx.save();
    ctx.translate(32, 56);
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col <= row; col++) {
        ctx.fillText('¬', -row*8 + col*16, -row*14);
      }
    }
    ctx.restore();
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(size, size), mat);
    plane.position.set(0, 0, 0);
    plane.rotation.z = (Math.PI/2) * i;
    group.add(plane);
  }
  return group;
}
for (let i = 0; i < 6; i++) {
  const torus = new THREE.Mesh(torusGeometry, new THREE.MeshBasicMaterial({ color: 0x00ff00, flatShading: true }));
  torus.position.set(-6 + i * 2.4, 0, -10);
  torus.scale.set(1.6, 1, 1); // scale X for 5x3 proportion
  torus.visible = false;
  // Add the light pattern in the center
  const light = createLightPattern();
  light.position.set(0, 0, 0);
  torus.add(light);
  balls.push(torus);
  scene.add(torus);
}

// === TORCHES ===
function createTorch() {
  const group = new THREE.Group();
  // Torch body
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8),
    new THREE.MeshBasicMaterial({ color: 0x333333 })
  );
  body.position.y = 0;
  group.add(body);
  // Flame
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.18, 0.4, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd700 })
  );
  flame.position.y = 0.8;
  group.add(flame);
  return group;
}
const torchLeft = createTorch();
torchLeft.position.set(-8, 6, -2);
scene.add(torchLeft);
const torchRight = createTorch();
torchRight.position.set(8, 6, -2);
scene.add(torchRight);

// === HANDS ===
function createHand() {
  const hand = new THREE.Group();
  // Palm
  const palm = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe0bd })
  );
  palm.scale.set(1.2, 0.7, 1);
  hand.add(palm);
  // Fingers (4)
  for (let i = 0; i < 4; i++) {
    const finger = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.11, 0.9, 8),
      new THREE.MeshBasicMaterial({ color: 0xffe0bd })
    );
    finger.position.set(-0.45 + i * 0.3, 0.5, 0.2);
    finger.rotation.x = Math.PI / 2.5;
    hand.add(finger);
  }
  // Thumb
  const thumb = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.11, 0.7, 8),
    new THREE.MeshBasicMaterial({ color: 0xffe0bd })
  );
  thumb.position.set(-0.7, 0.2, -0.2);
  thumb.rotation.z = Math.PI / 3;
  thumb.rotation.x = Math.PI / 2.5;
  hand.add(thumb);
  // Ball in palm
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x00ff00 })
  );
  ball.position.set(0, 0.2, 0.5);
  hand.add(ball);
  // Torus in palm
  const torus = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.06, 8, 16),
    new THREE.MeshBasicMaterial({ color: 0x8000ff })
  );
  torus.position.set(0, 0.2, 0.5);
  torus.rotation.x = Math.PI / 2;
  hand.add(torus);
  return hand;
}
const handLeft = createHand();
handLeft.position.set(-2.5, -2, 2);
handLeft.rotation.y = Math.PI / 8;
handLeft.visible = false;
handLeft.scale.set(1.2, 1.2, 1.2); // Match key size
scene.add(handLeft);
const handRight = createHand();
handRight.position.set(2.5, -2, 2);
handRight.rotation.y = -Math.PI / 8;
handRight.visible = false;
handRight.scale.set(1.2, 1.2, 1.2); // Match key size
scene.add(handRight);
let handsAppearTime = null;
const HANDS_DURATION = 4000; // ms

// === STATE ===
let phase = BALL_PHASE;
let phaseStart = performance.now();
let keyJumpY = 0;
let keyJumpDir = 1;
let keyJumpCount = 0;
let cameraMode = 'front'; // 'front' or 'top'
let doorOpen = false;
let doorAnim = 0; // 0 = closed, 1 = fully open
let ballsReleased = false;
let ballsReleaseTimes = Array(6).fill(0);

function resetScene() {
  phase = BALL_PHASE;
  phaseStart = performance.now();
  doorOpen = false;
  doorAnim = 0;
  ballsReleased = false;
  ballsReleaseTimes = Array(6).fill(0);
  groundGroup.scale.set(2.5, 1, 2.5);
  keyGroup.visible = false;
  keyGroup.position.set(0, -7, 0);
  keyGroup.rotation.set(0, 0, 0);
  keyJumpY = 0;
  keyJumpDir = 1;
  keyJumpCount = 0;
  cameraMode = 'front';
  doorGroup.visible = true;
  doorGroup.scale.set(1, 1, 1);
  balls.forEach((ball, i) => {
    ball.position.set(-6 + i * 2.4, 0, -10);
    ball.visible = false;
  });
}

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now();
  const phaseElapsed = now - phaseStart;

  if (phase === BALL_PHASE) {
    // Door opening animation
    if (!doorOpen) {
      if (doorAnim < 1) {
        doorAnim += 0.01;
        doorGroup.scale.x = 1 - doorAnim;
        if (doorGroup.scale.x < 0.05) doorGroup.scale.x = 0.05;
      } else {
        doorOpen = true;
        doorGroup.visible = false;
        ballsReleased = true;
        for (let i = 0; i < 6; i++) {
          ballsReleaseTimes[i] = now + i * 350; // staggered release
        }
      }
    }
    // Release balls one by one
    if (ballsReleased) {
      let allGone = true;
      balls.forEach((ball, i) => {
        if (now >= ballsReleaseTimes[i] && ball.position.z < camera.position.z - 2) {
          ball.visible = true;
          ball.position.z += 0.4 + 0.1 * i;
          ball.position.y = Math.sin(now * 0.002 + i) * 1.5;
        }
        // Ball disappears after passing camera
        if (ball.position.z < camera.position.z - 2 && now >= ballsReleaseTimes[i]) {
          allGone = false;
        } else if (ball.position.z >= camera.position.z - 2) {
          ball.visible = false;
        }
      });
      // Animate ground scaling (zoom out as balls are released)
      const elapsed = Math.min(phaseElapsed / PHASE_DURATIONS[0], 1);
      groundGroup.scale.set(2.5 - 1.5 * elapsed, 1, 2.5 - 1.5 * elapsed);
      if (allGone) {
        phase = GROUND_TO_KEY_PHASE;
        phaseStart = now;
        balls.forEach(ball => ball.visible = false);
      }
    }
  } else if (phase === GROUND_TO_KEY_PHASE) {
    // Shrink ground to a single green square, morph to key
    let t = Math.min(phaseElapsed / PHASE_DURATIONS[1], 1);
    // Shrink ground
    groundGroup.scale.set(1 - 0.99 * t, 1, 1 - 0.99 * t);
    // At t > 0.5, show key, animate morph
    if (t > 0.5) {
      keyGroup.visible = true;
      let keyT = (t - 0.5) * 2;
      keyGroup.scale.set(keyT, keyT, keyT);
      keyGroup.rotation.y = Math.PI * (1 - keyT);
      if (keyT > 0.5) cameraMode = 'split';
    } else {
      keyGroup.visible = false;
      cameraMode = 'front';
    }
    if (phaseElapsed > PHASE_DURATIONS[1]) {
      phase = KEY_JUMP_PHASE;
      phaseStart = now;
      keyGroup.scale.set(1, 1, 1);
      keyGroup.rotation.set(0, 0, 0);
      cameraMode = 'front';
    }
  } else if (phase === KEY_JUMP_PHASE) {
    keyGroup.visible = true;
    let jumpT = (phaseElapsed / PHASE_DURATIONS[2]);
    if (jumpT < 0.5) {
      keyGroup.position.y = -7 + 6 * Math.sin(Math.PI * jumpT);
      // Hide hands while going up
      handLeft.visible = false;
      handRight.visible = false;
      handsAppearTime = null;
    } else {
      // Downwards
      keyGroup.position.y = -7 + 6 * Math.sin(Math.PI * (1 - jumpT));
      // Show hands for 4 seconds as key goes down
      if (!handsAppearTime) handsAppearTime = now;
      if (now - handsAppearTime < HANDS_DURATION) {
        handLeft.visible = true;
        handRight.visible = true;
      } else {
        handLeft.visible = false;
        handRight.visible = false;
      }
    }
    if (phaseElapsed > PHASE_DURATIONS[2]) {
      phase = KEY_TO_DOOR_PHASE;
      phaseStart = now;
      keyGroup.position.y = -7;
      handLeft.visible = false;
      handRight.visible = false;
      handsAppearTime = null;
    }
  } else if (phase === KEY_TO_DOOR_PHASE) {
    let t = Math.min(phaseElapsed / PHASE_DURATIONS[3], 1);
    keyGroup.visible = true;
    doorGroup.visible = true;
    keyGroup.scale.set(1 - t, 1 - t, 1 - t);
    keyGroup.rotation.y = Math.PI * t;
    doorGroup.scale.set(t, 1, 1);
    if (phaseElapsed > PHASE_DURATIONS[3]) {
      resetScene();
    }
  }

  // === CAMERA LOGIC ===
  if (cameraMode === 'split') {
    // Render split view: left = front, right = top
    renderer.setScissorTest(true);
    // Left: front
    renderer.setScissor(0, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setViewport(0, 0, window.innerWidth / 2, window.innerHeight);
    camera.position.set(0, 0, 20);
    camera.lookAt(0, -7, 0);
    effect.render(scene, camera);
    // Right: top
    renderer.setScissor(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    renderer.setViewport(window.innerWidth / 2, 0, window.innerWidth / 2, window.innerHeight);
    camera.position.set(0, 20, 0);
    camera.lookAt(0, -7, 0);
    effect.render(scene, camera);
    renderer.setScissorTest(false);
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  } else {
    // Normal front view
    camera.position.set(0, 0, 20);
    camera.lookAt(0, -7, 0);
    effect.render(scene, camera);
  }
}

resetScene();
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  effect.setSize(window.innerWidth, window.innerHeight);
});

document.getElementById('download-btn').addEventListener('click', () => {
  // Use the AsciiEffect's domElement (a <pre>), so we need to capture the renderer's canvas instead
  // If you want the raw renderer output:
  const link = document.createElement('a');
  link.download = 'scene.png';
  link.href = renderer.domElement.toDataURL('image/png');
  link.click();
}); 