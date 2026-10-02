import * as THREE from 'three';
import { VehicleConfig, LevelConfig, CameraMode } from '../types/game';
import { CarPhysics } from './physics';

export class ThreeRenderer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private physics: CarPhysics;
  private vehicleConfig: VehicleConfig;
  private levelConfig: LevelConfig;

  // Car 3D meshes
  private carGroup: THREE.Group;
  private carBodyGroup: THREE.Group;
  private frontLeftWheelGroup: THREE.Group;
  private frontRightWheelGroup: THREE.Group;
  private rearLeftWheel: THREE.Mesh;
  private rearRightWheel: THREE.Mesh;
  private frontLeftTire: THREE.Mesh;
  private frontRightTire: THREE.Mesh;

  // Lights & Materials
  private headLightLeft: THREE.SpotLight | null = null;
  private headLightRight: THREE.SpotLight | null = null;
  private brakeLightMaterial: THREE.MeshStandardMaterial;
  private reverseLightMaterial: THREE.MeshStandardMaterial;
  private targetBayMesh: THREE.Mesh | null = null;

  // Camera tracking
  public cameraMode: CameraMode = 'chase';
  private cameraOffset = new THREE.Vector3(0, 3.8, -7.5);
  private cameraLookTarget = new THREE.Vector3();
  private orbitAngle: number = 0;
  private isOrbitDragging: boolean = false;
  private lastPointerX: number = 0;

  private isDisposed: boolean = false;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    container: HTMLElement,
    physics: CarPhysics,
    vehicleConfig: VehicleConfig,
    levelConfig: LevelConfig
  ) {
    this.container = container;
    this.physics = physics;
    this.vehicleConfig = vehicleConfig;
    this.levelConfig = levelConfig;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      1000
    );

    // 2. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    // 3. Materials initialized early
    this.brakeLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x330000,
      emissive: 0x000000,
      roughness: 0.3,
    });
    this.reverseLightMaterial = new THREE.MeshStandardMaterial({
      color: 0x444444,
      emissive: 0x000000,
      roughness: 0.3,
    });

    // 4. Build Environment & World
    this.setupEnvironment();

    // 5. Build Car Mesh
    const carAssemblies = this.buildCarMesh();
    this.carGroup = carAssemblies.carGroup;
    this.carBodyGroup = carAssemblies.carBodyGroup;
    this.frontLeftWheelGroup = carAssemblies.flGroup;
    this.frontRightWheelGroup = carAssemblies.frGroup;
    this.frontLeftTire = carAssemblies.flTire;
    this.frontRightTire = carAssemblies.frTire;
    this.rearLeftWheel = carAssemblies.rlTire;
    this.rearRightWheel = carAssemblies.rrTire;

    this.scene.add(this.carGroup);

    // 6. Build Obstacles & Parking Target
    this.buildObstacles();
    this.buildParkingTarget();

    // 7. Event listeners
    this.setupInteractions();
  }

  private setupEnvironment() {
    const env = this.levelConfig.environment;

    if (env === 'night') {
      this.scene.background = new THREE.Color(0x060914);
      this.scene.fog = new THREE.FogExp2(0x060914, 0.015);

      const ambient = new THREE.AmbientLight(0x1a233a, 0.6);
      this.scene.add(ambient);

      const moonLight = new THREE.DirectionalLight(0x4a6fa5, 0.8);
      moonLight.position.set(20, 40, -20);
      moonLight.castShadow = true;
      moonLight.shadow.mapSize.width = 2048;
      moonLight.shadow.mapSize.height = 2048;
      moonLight.shadow.camera.near = 1;
      moonLight.shadow.camera.far = 100;
      const d = 35;
      moonLight.shadow.camera.left = -d;
      moonLight.shadow.camera.right = d;
      moonLight.shadow.camera.top = d;
      moonLight.shadow.camera.bottom = -d;
      this.scene.add(moonLight);
    } else if (env === 'sunset') {
      this.scene.background = new THREE.Color(0x2a1728);
      this.scene.fog = new THREE.FogExp2(0x2a1728, 0.012);

      const ambient = new THREE.AmbientLight(0xffeedd, 0.7);
      this.scene.add(ambient);

      const sunLight = new THREE.DirectionalLight(0xf97316, 1.8);
      sunLight.position.set(-30, 18, -40);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      this.scene.add(sunLight);
    } else if (env === 'underground') {
      this.scene.background = new THREE.Color(0x12141a);
      this.scene.fog = new THREE.Fog(0x12141a, 20, 60);

      const ambient = new THREE.AmbientLight(0x71717a, 1.2);
      this.scene.add(ambient);

      // Fluorescent strip lights on ceiling
      for (let i = -20; i <= 20; i += 10) {
        for (let j = -20; j <= 20; j += 10) {
          const ceilingLight = new THREE.PointLight(0xfef08a, 0.9, 14);
          ceilingLight.position.set(i, 4.8, j);
          this.scene.add(ceilingLight);
        }
      }
    } else {
      // Day
      this.scene.background = new THREE.Color(0x87ceeb);
      this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.008);

      const ambient = new THREE.AmbientLight(0xffffff, 0.85);
      this.scene.add(ambient);

      const sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
      sunLight.position.set(30, 50, 20);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      const d = 40;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      this.scene.add(sunLight);
    }

    // Asphalt Ground
    const groundGeo = new THREE.PlaneGeometry(160, 160, 32, 32);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x1e242c,
      roughness: 0.85,
      metalness: 0.1,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Decorative asphalt markings & perimeter curbs
    this.buildParkingMarkings();
  }

  private buildParkingMarkings() {
    const lineMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.6,
    });

    const yellowMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.6,
    });

    // Create decorative parking lot grid
    const b = this.levelConfig.boundary;

    // Boundary walls / curbs
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.9,
    });

    const wallHeight = 0.5;
    const wallThick = 0.5;

    // North wall
    const nWallGeo = new THREE.BoxGeometry(b.maxX - b.minX + wallThick * 2, wallHeight, wallThick);
    const nWall = new THREE.Mesh(nWallGeo, curbMat);
    nWall.position.set((b.minX + b.maxX) / 2, wallHeight / 2, b.maxZ + wallThick / 2);
    nWall.castShadow = true;
    nWall.receiveShadow = true;
    this.scene.add(nWall);

    // South wall
    const sWall = nWall.clone();
    sWall.position.set((b.minX + b.maxX) / 2, wallHeight / 2, b.minZ - wallThick / 2);
    this.scene.add(sWall);

    // East wall
    const eWallGeo = new THREE.BoxGeometry(wallThick, wallHeight, b.maxZ - b.minZ + wallThick * 2);
    const eWall = new THREE.Mesh(eWallGeo, curbMat);
    eWall.position.set(b.maxX + wallThick / 2, wallHeight / 2, (b.minZ + b.maxZ) / 2);
    eWall.castShadow = true;
    this.scene.add(eWall);

    // West wall
    const wWall = eWall.clone();
    wWall.position.set(b.minX - wallThick / 2, wallHeight / 2, (b.minZ + b.maxZ) / 2);
    this.scene.add(wWall);

    // Paint road dashes and arrows
    for (let z = b.minZ + 4; z <= b.maxZ - 4; z += 5) {
      const dashGeo = new THREE.PlaneGeometry(0.25, 2.2);
      const dash = new THREE.Mesh(dashGeo, lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 0.015, z);
      this.scene.add(dash);
    }
  }

  private buildCarMesh() {
    const carGroup = new THREE.Group();
    const carBodyGroup = new THREE.Group();
    carGroup.add(carBodyGroup);

    const specs = this.vehicleConfig.specs;
    const bodyColor = new THREE.Color(this.vehicleConfig.color);
    const accentColor = new THREE.Color(this.vehicleConfig.accentColor);

    // Main Paint Material (Glossy Car Paint)
    const paintMat = new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      roughness: 0.15,
      metalness: 0.75,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const trimMat = new THREE.MeshStandardMaterial({
      color: accentColor,
      roughness: 0.4,
      metalness: 0.6,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.1,
      metalness: 0.95,
    });

    const halfW = specs.width / 2;
    const halfL = specs.length / 2;
    const groundClearance = 0.32;

    // 1. Lower Chassis
    const lowerBodyGeo = new THREE.BoxGeometry(specs.width * 0.94, 0.42, specs.length * 0.96);
    const lowerBody = new THREE.Mesh(lowerBodyGeo, paintMat);
    lowerBody.position.y = groundClearance + 0.21;
    lowerBody.castShadow = true;
    lowerBody.receiveShadow = true;
    carBodyGroup.add(lowerBody);

    // 2. Cabin / Greenhouse
    const cabinW = specs.width * 0.82;
    const cabinH = specs.height * 0.52;
    const cabinL = specs.length * 0.52;
    const cabinGeo = new THREE.BoxGeometry(cabinW, cabinH, cabinL);
    const cabin = new THREE.Mesh(cabinGeo, glassMat);
    cabin.position.set(0, groundClearance + 0.42 + cabinH / 2, -specs.length * 0.06);
    cabin.castShadow = true;
    carBodyGroup.add(cabin);

    // Cabin Roof top cap
    const roofGeo = new THREE.BoxGeometry(cabinW * 0.96, 0.08, cabinL * 0.88);
    const roof = new THREE.Mesh(roofGeo, paintMat);
    roof.position.set(0, groundClearance + 0.42 + cabinH + 0.04, -specs.length * 0.06);
    roof.castShadow = true;
    carBodyGroup.add(roof);

    // 3. Front Hood curve
    const hoodGeo = new THREE.BoxGeometry(specs.width * 0.9, 0.22, specs.length * 0.28);
    const hood = new THREE.Mesh(hoodGeo, paintMat);
    hood.position.set(0, groundClearance + 0.38, specs.length * 0.34);
    hood.castShadow = true;
    carBodyGroup.add(hood);

    // 4. Front Grille
    const grilleGeo = new THREE.BoxGeometry(specs.width * 0.65, 0.2, 0.06);
    const grille = new THREE.Mesh(grilleGeo, trimMat);
    grille.position.set(0, groundClearance + 0.22, halfL * 0.98);
    carBodyGroup.add(grille);

    // 5. Headlights
    const lightLensMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x93c5fd,
      emissiveIntensity: 0.9,
    });
    const hlGeo = new THREE.BoxGeometry(0.35, 0.14, 0.08);

    const hlLeft = new THREE.Mesh(hlGeo, lightLensMat);
    hlLeft.position.set(-halfW * 0.72, groundClearance + 0.34, halfL * 0.98);
    carBodyGroup.add(hlLeft);

    const hlRight = hlLeft.clone();
    hlRight.position.x = halfW * 0.72;
    carBodyGroup.add(hlRight);

    // Real SpotLights for headlights
    this.headLightLeft = new THREE.SpotLight(0xfff7ed, 4.0, 32, Math.PI / 6, 0.35);
    this.headLightLeft.position.set(-halfW * 0.72, groundClearance + 0.35, halfL * 0.98);
    const targetL = new THREE.Object3D();
    targetL.position.set(-halfW * 0.72, 0, halfL + 15);
    carGroup.add(targetL);
    this.headLightLeft.target = targetL;
    carGroup.add(this.headLightLeft);

    this.headLightRight = new THREE.SpotLight(0xfff7ed, 4.0, 32, Math.PI / 6, 0.35);
    this.headLightRight.position.set(halfW * 0.72, groundClearance + 0.35, halfL * 0.98);
    const targetR = new THREE.Object3D();
    targetR.position.set(halfW * 0.72, 0, halfL + 15);
    carGroup.add(targetR);
    this.headLightRight.target = targetR;
    carGroup.add(this.headLightRight);

    // 6. Rear Taillights
    const tlGeo = new THREE.BoxGeometry(0.35, 0.12, 0.08);
    const tlLeft = new THREE.Mesh(tlGeo, this.brakeLightMaterial);
    tlLeft.position.set(-halfW * 0.72, groundClearance + 0.36, -halfL * 0.98);
    carBodyGroup.add(tlLeft);

    const tlRight = tlLeft.clone();
    tlRight.position.x = halfW * 0.72;
    carBodyGroup.add(tlRight);

    // Reverse lights
    const revGeo = new THREE.BoxGeometry(0.2, 0.08, 0.08);
    const revLeft = new THREE.Mesh(revGeo, this.reverseLightMaterial);
    revLeft.position.set(-halfW * 0.38, groundClearance + 0.36, -halfL * 0.98);
    carBodyGroup.add(revLeft);

    const revRight = revLeft.clone();
    revRight.position.x = halfW * 0.38;
    carBodyGroup.add(revRight);

    // 7. Side Mirrors
    const mirrorGeo = new THREE.BoxGeometry(0.24, 0.12, 0.16);
    const mirrorL = new THREE.Mesh(mirrorGeo, paintMat);
    mirrorL.position.set(-halfW - 0.08, groundClearance + 0.55, specs.length * 0.12);
    carBodyGroup.add(mirrorL);

    const mirrorR = mirrorL.clone();
    mirrorR.position.x = halfW + 0.08;
    carBodyGroup.add(mirrorR);

    // 8. Dual Chrome Exhaust
    const exhaustGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.25, 12);
    const exhaustL = new THREE.Mesh(exhaustGeo, chromeMat);
    exhaustL.rotation.x = Math.PI / 2;
    exhaustL.position.set(-halfW * 0.45, groundClearance + 0.14, -halfL - 0.05);
    carBodyGroup.add(exhaustL);

    const exhaustR = exhaustL.clone();
    exhaustR.position.x = halfW * 0.45;
    carBodyGroup.add(exhaustR);

    // 9. Wheels & Steering pivots
    const wheelRadius = 0.33;
    const wheelWidth = 0.26;
    const tireGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, wheelWidth, 24);
    tireGeo.rotateZ(Math.PI / 2);

    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x171717,
      roughness: 0.9,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      metalness: 0.85,
      roughness: 0.2,
    });

    const createWheelMesh = () => {
      const wheelMesh = new THREE.Mesh(tireGeo, tireMat);
      wheelMesh.castShadow = true;

      // Rim face
      const rimGeo = new THREE.CylinderGeometry(wheelRadius * 0.65, wheelRadius * 0.65, wheelWidth + 0.02, 16);
      rimGeo.rotateZ(Math.PI / 2);
      const rim = new THREE.Mesh(rimGeo, rimMat);
      wheelMesh.add(rim);

      return wheelMesh;
    };

    const wheelBaseHalf = specs.wheelbase / 2;
    const trackWidthHalf = halfW * 0.95;

    // Front Left (with steering pivot)
    const flGroup = new THREE.Group();
    flGroup.position.set(-trackWidthHalf, wheelRadius, wheelBaseHalf);
    const flTire = createWheelMesh();
    flGroup.add(flTire);
    carGroup.add(flGroup);

    // Front Right (with steering pivot)
    const frGroup = new THREE.Group();
    frGroup.position.set(trackWidthHalf, wheelRadius, wheelBaseHalf);
    const frTire = createWheelMesh();
    frGroup.add(frTire);
    carGroup.add(frGroup);

    // Rear Left
    const rlTire = createWheelMesh();
    rlTire.position.set(-trackWidthHalf, wheelRadius, -wheelBaseHalf);
    carGroup.add(rlTire);

    // Rear Right
    const rrTire = createWheelMesh();
    rrTire.position.set(trackWidthHalf, wheelRadius, -wheelBaseHalf);
    carGroup.add(rrTire);

    return {
      carGroup,
      carBodyGroup,
      flGroup,
      frGroup,
      flTire,
      frTire,
      rlTire,
      rrTire,
    };
  }

  private buildObstacles() {
    // Cone geometry
    const coneGeo = new THREE.ConeGeometry(0.24, 0.65, 16);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      roughness: 0.4,
    });
    const coneStripeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.4,
    });

    // Barrier material
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.8,
    });

    // Pillar material
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.9,
    });

    for (const obs of this.levelConfig.obstacles) {
      if (obs.type === 'cone') {
        const coneMesh = new THREE.Mesh(coneGeo, coneMat);
        coneMesh.position.set(obs.x, 0.325, obs.z);
        coneMesh.castShadow = true;

        // White stripe ring
        const ringGeo = new THREE.CylinderGeometry(0.16, 0.19, 0.12, 16);
        const ring = new THREE.Mesh(ringGeo, coneStripeMat);
        ring.position.y = 0.04;
        coneMesh.add(ring);

        this.scene.add(coneMesh);
      } else if (obs.type === 'barrier') {
        const w = obs.width || 0.6;
        const l = obs.length || 4.0;
        const h = obs.height || 0.8;
        const bGeo = new THREE.BoxGeometry(w, h, l);
        const bMesh = new THREE.Mesh(bGeo, barrierMat);
        bMesh.position.set(obs.x, h / 2, obs.z);
        bMesh.rotation.y = obs.rotation || 0;
        bMesh.castShadow = true;
        bMesh.receiveShadow = true;
        this.scene.add(bMesh);
      } else if (obs.type === 'pillar') {
        const w = obs.width || 1.4;
        const h = 4.5;
        const pGeo = new THREE.BoxGeometry(w, h, obs.length || 1.4);
        const pMesh = new THREE.Mesh(pGeo, pillarMat);
        pMesh.position.set(obs.x, h / 2, obs.z);
        pMesh.castShadow = true;
        pMesh.receiveShadow = true;
        this.scene.add(pMesh);
      } else if (obs.type === 'parked_car') {
        const npcCar = this.createNpcCarMesh(obs.color || '#334155');
        npcCar.position.set(obs.x, 0, obs.z);
        npcCar.rotation.y = obs.rotation || 0;
        this.scene.add(npcCar);
      }
    }
  }

  private createNpcCarMesh(hexColor: string): THREE.Group {
    const group = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({
      color: new THREE.Color(hexColor),
      roughness: 0.25,
      metalness: 0.6,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.9,
    });

    const lower = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.44, 4.4), paint);
    lower.position.y = 0.52;
    lower.castShadow = true;
    group.add(lower);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 2.3), glass);
    cabin.position.set(0, 0.95, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 });

    const wPos = [
      [-0.9, 0.33, 1.3],
      [0.9, 0.33, 1.3],
      [-0.9, 0.33, -1.3],
      [0.9, 0.33, -1.3],
    ];
    wPos.forEach(([x, y, z]) => {
      const w = new THREE.Mesh(wheelGeo, wheelMat);
      w.position.set(x, y, z);
      w.castShadow = true;
      group.add(w);
    });

    return group;
  }

  private buildParkingTarget() {
    const target = this.levelConfig.parkingTarget;
    const w = target.width;
    const l = target.length;

    const group = new THREE.Group();
    group.position.set(target.x, 0.02, target.z);
    group.rotation.y = target.rotation;

    // Glowing target floor zone
    const boxGeo = new THREE.PlaneGeometry(w, l);
    const boxMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const box = new THREE.Mesh(boxGeo, boxMat);
    box.rotation.x = -Math.PI / 2;
    group.add(box);
    this.targetBayMesh = box;

    // White perimeter border line
    const borderMat = new THREE.LineBasicMaterial({ color: 0x4ade80, linewidth: 3 });
    const hw = w / 2;
    const hl = l / 2;
    const points = [
      new THREE.Vector3(-hw, 0.03, -hl),
      new THREE.Vector3(hw, 0.03, -hl),
      new THREE.Vector3(hw, 0.03, hl),
      new THREE.Vector3(-hw, 0.03, hl),
      new THREE.Vector3(-hw, 0.03, -hl),
    ];
    const borderGeo = new THREE.BufferGeometry().setFromPoints(points);
    const border = new THREE.Line(borderGeo, borderMat);
    group.add(border);

    // Direction arrow pointing forward
    const arrowGeo = new THREE.ConeGeometry(0.5, 1.2, 3);
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const arrow = new THREE.Mesh(arrowGeo, arrowMat);
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.04, 0);
    group.add(arrow);

    this.scene.add(group);
  }

  private setupInteractions() {
    const el = this.renderer.domElement;

    el.addEventListener('pointerdown', (e) => {
      if (this.cameraMode === 'orbit') {
        this.isOrbitDragging = true;
        this.lastPointerX = e.clientX;
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (this.isOrbitDragging && this.cameraMode === 'orbit') {
        const delta = e.clientX - this.lastPointerX;
        this.orbitAngle += delta * 0.01;
        this.lastPointerX = e.clientX;
      }
    });

    window.addEventListener('pointerup', () => {
      this.isOrbitDragging = false;
    });

    // Responsive resize observer
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
  }

  public handleResize() {
    if (this.isDisposed || !this.container) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (w <= 0 || h <= 0) return;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  public switchCamera() {
    const modes: CameraMode[] = ['chase', 'cockpit', 'topdown', 'orbit'];
    const curIdx = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(curIdx + 1) % modes.length];
  }

  public render() {
    if (this.isDisposed) return;

    // 1. Sync Car position and heading with Physics engine
    this.carGroup.position.set(this.physics.x, this.physics.y, this.physics.z);
    this.carGroup.rotation.y = this.physics.rotation;

    // 2. Pitch and Roll suspension animation
    this.carBodyGroup.rotation.x = this.physics.pitch;
    this.carBodyGroup.rotation.z = this.physics.roll;

    // 3. Wheel steering angle (Ackermann front wheel turning)
    this.frontLeftWheelGroup.rotation.y = this.physics.steerAngle;
    this.frontRightWheelGroup.rotation.y = this.physics.steerAngle;

    // 4. Wheel rolling rotation
    this.frontLeftTire.rotation.x = this.physics.wheelSpinAngle;
    this.frontRightTire.rotation.x = this.physics.wheelSpinAngle;
    this.rearLeftWheel.rotation.x = this.physics.wheelSpinAngle;
    this.rearRightWheel.rotation.x = this.physics.wheelSpinAngle;

    // 5. Lights reaction (Brake light glow, Reverse light glow)
    if (this.physics.brake > 0.05 || this.physics.handbrake) {
      this.brakeLightMaterial.emissive.setHex(0xff0000);
      this.brakeLightMaterial.emissiveIntensity = 2.5;
    } else {
      this.brakeLightMaterial.emissive.setHex(0x330000);
      this.brakeLightMaterial.emissiveIntensity = 0.2;
    }

    if (this.physics.speed < -0.1 || (this.physics.autoGear === 'R')) {
      this.reverseLightMaterial.emissive.setHex(0xffffff);
      this.reverseLightMaterial.emissiveIntensity = 2.0;
    } else {
      this.reverseLightMaterial.emissive.setHex(0x000000);
      this.reverseLightMaterial.emissiveIntensity = 0;
    }

    // 6. Pulse target bay mesh when inside zone
    if (this.targetBayMesh) {
      const mat = this.targetBayMesh.material as THREE.MeshBasicMaterial;
      if (this.physics.parkedTimer > 0) {
        // Flash bright green
        mat.color.setHex(0x10b981);
        mat.opacity = 0.5 + Math.sin(performance.now() * 0.015) * 0.25;
      } else {
        mat.color.setHex(0x22c55e);
        mat.opacity = 0.28;
      }
    }

    // 7. Update Camera View
    this.updateCamera();

    // 8. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  private updateCamera() {
    const carPos = this.carGroup.position;
    const carRot = this.carGroup.rotation.y;

    if (this.cameraMode === 'chase') {
      // Dynamic chase cam: lerp behind the car based on heading
      const camDist = 6.8 + Math.abs(this.physics.speed) * 0.08;
      const camHeight = 3.2;

      // Position behind car
      const targetCamX = carPos.x - Math.sin(carRot) * camDist;
      const targetCamZ = carPos.z - Math.cos(carRot) * camDist;
      const targetCamY = carPos.y + camHeight;

      this.camera.position.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), 0.12);

      // Look slightly ahead of car
      const lookX = carPos.x + Math.sin(carRot) * 4;
      const lookZ = carPos.z + Math.cos(carRot) * 4;
      this.cameraLookTarget.lerp(new THREE.Vector3(lookX, carPos.y + 1.2, lookZ), 0.18);
      this.camera.lookAt(this.cameraLookTarget);

    } else if (this.cameraMode === 'cockpit') {
      // Hood/cockpit view right over the windshield
      const hoodX = carPos.x + Math.sin(carRot) * 0.4;
      const hoodZ = carPos.z + Math.cos(carRot) * 0.4;
      this.camera.position.set(hoodX, carPos.y + 1.15, hoodZ);

      const forwardX = carPos.x + Math.sin(carRot) * 12;
      const forwardZ = carPos.z + Math.cos(carRot) * 12;
      this.camera.lookAt(forwardX, carPos.y + 1.05, forwardZ);

    } else if (this.cameraMode === 'topdown') {
      // Top down parking assist view
      this.camera.position.lerp(new THREE.Vector3(carPos.x, carPos.y + 18, carPos.z), 0.15);
      this.camera.lookAt(carPos.x, carPos.y, carPos.z);

    } else if (this.cameraMode === 'orbit') {
      // Free orbit view around car
      const radius = 9;
      const camX = carPos.x + Math.sin(this.orbitAngle) * radius;
      const camZ = carPos.z + Math.cos(this.orbitAngle) * radius;
      this.camera.position.set(camX, carPos.y + 4, camZ);
      this.camera.lookAt(carPos.x, carPos.y + 1, carPos.z);
    }
  }

  public dispose() {
    this.isDisposed = true;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
