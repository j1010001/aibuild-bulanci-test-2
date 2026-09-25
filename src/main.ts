import * as THREE from 'three';
import { createGame, step } from './sim/sim';
import type { Direction, GameState, Input, Inputs } from './sim/types';

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
  KeyI: 'up',
  KeyK: 'down',
  KeyJ: 'left',
  KeyL: 'right',
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
};

const menu = document.getElementById('menu')!;
const status = document.getElementById('status')!;
const host = document.getElementById('app')!;
const practiceBtn = document.getElementById('practice')!;

let state: GameState | null = null;
let heldDir: Direction | null = null;
let shootPending = false;

practiceBtn.addEventListener('click', startPractice);

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    shootPending = true;
    event.preventDefault();
    return;
  }
  const dir = KEY_TO_DIR[event.code];
  if (dir !== undefined) {
    heldDir = dir;
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  const dir = KEY_TO_DIR[event.code];
  if (dir !== undefined && heldDir === dir) {
    heldDir = null;
  }
});

function startPractice(): void {
  state = createGame();
  menu.style.display = 'none';

  const { boardWidth, boardHeight } = state.config;

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  const camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  // Fixed tilted 3/4 camera: elevated, looking down at the board center.
  camera.position.set(boardWidth / 2, boardHeight * 0.9, boardHeight * 0.85);
  camera.lookAt(boardWidth / 2, 0, boardHeight / 2);

  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(boardWidth, boardHeight),
    new THREE.MeshStandardMaterial({ color: 0x555577 }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(boardWidth / 2, 0, boardHeight / 2);
  scene.add(plane);

  const grid = new THREE.GridHelper(
    Math.max(boardWidth, boardHeight),
    20,
    0x8888aa,
    0x444466,
  );
  grid.position.set(boardWidth / 2, 0, boardHeight / 2);
  scene.add(grid);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444466, 1.2));

  // Player: a tomato (sphere body + skirt cone) tinted by skinId.
  const playerGroup = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xff4444 }),
  );
  body.position.y = 0.5;
  const skirt = new THREE.Mesh(
    new THREE.ConeGeometry(0.42, 0.5, 24),
    new THREE.MeshStandardMaterial({ color: 0xdd3344 }),
  );
  skirt.position.y = 0.25;
  playerGroup.add(body, skirt);
  scene.add(playerGroup);

  status.textContent = 'Practice — arrows / WASD / IJKL to move, Space to shoot.';

  let lastMs = performance.now();

  const animate = (): void => {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = Math.min((now - lastMs) / 1000, 0.1);
    lastMs = now;

    if (state !== null) {
      const input: Input = { moveDir: heldDir, shoot: shootPending };
      const inputs: Inputs = { [state.players[0].id]: input };
      shootPending = false;
      const result = step(state, inputs, dt);
      state = result.state;
      playerGroup.position.set(state.players[0].pos.x, 0, state.players[0].pos.y);
    }

    renderer.render(scene, camera);
  };

  animate();
}

if (import.meta.env.DEV) {
  window.__game = {
    getState(): unknown {
      return state === null ? null : JSON.parse(JSON.stringify(state));
    },
    press(key: string): void {
      if (key === 'Space') {
        shootPending = true;
        return;
      }
      const dir = KEY_TO_DIR[key];
      if (dir !== undefined) {
        heldDir = dir;
      }
    },
  };
}
