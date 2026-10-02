import { VehicleConfig, LevelConfig, VehicleTelemetry, AutoGear, TransmissionType } from '../types/game';
import { sound } from '../services/sound';

export interface RawInput {
  throttle: number; // 0 to 1
  brake: number;    // 0 to 1
  steer: number;    // -1 (left) to +1 (right)
  handbrake: boolean;
  reverseRequest?: boolean;
}

export class CarPhysics {
  public x: number = 0;
  public y: number = 0;
  public z: number = 0;
  public rotation: number = 0; // Yaw in radians

  // Velocity components
  public speed: number = 0; // Forward linear speed (m/s), positive = forward, negative = reverse
  public lateralVelocity: number = 0; // Drift slip velocity (m/s)
  public angularVelocity: number = 0; // Yaw rate (rad/s)

  // Wheel and steering state
  public steerAngle: number = 0; // Front wheel turning angle (radians)
  public wheelSpinAngle: number = 0; // Rolling rotation of wheels

  // Transmission & Engine
  public currentGear: number = 1; // -1: R, 0: N, 1..6: Forward
  public autoGear: AutoGear = 'D';
  public rpm: number = 900; // Idle
  public throttle: number = 0;
  public brake: number = 0;
  public handbrake: boolean = false;

  // Suspension dynamics (visual pitch & roll)
  public pitch: number = 0; // Body nose dive / squat (radians)
  public roll: number = 0;  // Body lean on cornering (radians)

  // Status
  public fuel: number = 98;
  public damage: number = 0;
  public parkedTimer: number = 0;
  public isCompleted: boolean = false;
  public isFailed: boolean = false;

  private vehicle: VehicleConfig;
  private level: LevelConfig;
  private transmission: TransmissionType = 'automatic';

  // Constants
  private readonly IDLE_RPM = 850;
  private readonly MAX_RPM = 6800;
  private readonly REDLINE_RPM = 6200;

  // Gear ratios: [R, N, 1, 2, 3, 4, 5, 6]
  private readonly GEAR_RATIOS: Record<number, number> = {
    [-1]: 3.5, // Reverse
    0: 0,      // Neutral
    1: 3.8,    // 1st gear (high torque, low top speed)
    2: 2.3,
    3: 1.6,
    4: 1.2,
    5: 0.95,
    6: 0.78,
  };

  // Max speed per gear in m/s (~ km/h / 3.6)
  private readonly GEAR_MAX_SPEED: Record<number, number> = {
    [-1]: 7.0,  // ~25 km/h
    0: 0,
    1: 9.0,   // ~32 km/h
    2: 16.0,  // ~58 km/h
    3: 25.0,  // ~90 km/h
    4: 34.0,  // ~122 km/h
    5: 45.0,  // ~162 km/h
    6: 58.0,  // ~210 km/h
  };

  constructor(vehicle: VehicleConfig, level: LevelConfig, transmission: TransmissionType = 'automatic') {
    this.vehicle = vehicle;
    this.level = level;
    this.transmission = transmission;
    this.resetToStart();
  }

  public resetToStart() {
    this.x = this.level.playerStart.x;
    this.y = 0;
    this.z = this.level.playerStart.z;
    this.rotation = this.level.playerStart.rotation;

    this.speed = 0;
    this.lateralVelocity = 0;
    this.angularVelocity = 0;
    this.steerAngle = 0;
    this.wheelSpinAngle = 0;
    this.rpm = this.IDLE_RPM;
    this.pitch = 0;
    this.roll = 0;
    this.currentGear = this.transmission === 'automatic' ? 1 : 1;
    this.autoGear = 'D';
    this.throttle = 0;
    this.brake = 0;
    this.handbrake = false;
    this.parkedTimer = 0;
    this.isCompleted = false;
    this.isFailed = false;
  }

  public setTransmission(trans: TransmissionType) {
    this.transmission = trans;
    if (trans === 'automatic') {
      this.autoGear = 'D';
      if (this.currentGear < 1) this.currentGear = 1;
    }
  }

  public setManualGear(gear: number) {
    if (this.transmission !== 'manual') return;
    if (gear >= -1 && gear <= 6) {
      if (this.currentGear !== gear) {
        this.currentGear = gear;
        sound.playShiftSound();
      }
    }
  }

  public shiftManualUp() {
    if (this.transmission !== 'manual') return;
    if (this.currentGear < 6) {
      this.setManualGear(this.currentGear === -1 ? 0 : this.currentGear + 1);
    }
  }

  public shiftManualDown() {
    if (this.transmission !== 'manual') return;
    if (this.currentGear > -1) {
      this.setManualGear(this.currentGear === 1 ? 0 : this.currentGear - 1);
    }
  }

  public setAutoGear(gear: AutoGear) {
    if (this.transmission !== 'automatic') return;
    this.autoGear = gear;
    if (gear === 'P') {
      this.currentGear = 0;
      this.speed = 0;
    } else if (gear === 'R') {
      this.currentGear = -1;
    } else if (gear === 'N') {
      this.currentGear = 0;
    } else if (gear === 'D') {
      this.currentGear = 1;
    }
    sound.playShiftSound();
  }

  public cycleAutoGear() {
    if (this.transmission !== 'automatic') return;
    const order: AutoGear[] = ['D', 'R', 'P', 'N'];
    const curIdx = order.indexOf(this.autoGear);
    const next = order[(curIdx + 1) % order.length];
    this.setAutoGear(next);
  }

  public update(dt: number, rawInput: RawInput) {
    if (this.isCompleted || this.isFailed) {
      this.speed *= 0.92;
      return;
    }

    // Cap delta time to prevent physics explosions on frame spikes
    const clampedDt = Math.min(dt, 0.05);

    // 1. Process Steering Input with Speed Sensitivity
    const maxLockRad = (this.vehicle.specs.steeringLockDeg * Math.PI) / 180;
    const speedKmh = Math.abs(this.speed * 3.6);

    // Speed-sensitive steering: High turning lock at low parking speeds (e.g. 38°),
    // gradually tapers down to ~15° at 100+ km/h for stability as requested.
    const speedDampingFactor = Math.max(0.38, 1 - (speedKmh / 130) * 0.62);
    const targetAngle = rawInput.steer * maxLockRad * speedDampingFactor;

    // Smooth steering rack return and turning speed
    const steerSpeed = 6.5; // rad/s
    this.steerAngle += (targetAngle - this.steerAngle) * Math.min(1, steerSpeed * clampedDt);

    // 2. Process Throttle, Brake & Reverse Logic
    let applyThrottle = 0;
    let applyBrake = 0;
    let reverseThrottle = 0;

    if (this.transmission === 'automatic') {
      // In Automatic:
      // If AutoGear is 'P': full park brake, engine can rev lightly
      if (this.autoGear === 'P') {
        applyBrake = 1.0;
        applyThrottle = rawInput.throttle * 0.3; // neutral free rev
      } else if (this.autoGear === 'N') {
        applyBrake = rawInput.brake;
        applyThrottle = rawInput.throttle * 0.5;
      } else if (this.autoGear === 'R') {
        reverseThrottle = rawInput.throttle;
        applyBrake = rawInput.brake;
      } else {
        // 'D' mode:
        // Smart S key behavior requested by user:
        // W = Throttle forward
        // S = Brake if car moving forward (> 0.4 m/s). When stopped or almost stopped, S triggers Reverse!
        if (rawInput.throttle > 0) {
          applyThrottle = rawInput.throttle;
          applyBrake = 0;
        } else if (rawInput.brake > 0) {
          if (this.speed > 0.4) {
            // Moving forward -> S is Brake!
            applyBrake = rawInput.brake;
            applyThrottle = 0;
          } else {
            // Stopped or already in reverse -> S is Reverse Throttle!
            reverseThrottle = rawInput.brake;
            applyBrake = 0;
          }
        }
      }
    } else {
      // Manual Transmission mode:
      if (this.currentGear === 0) {
        // Neutral: engine revs, no wheel drive
        applyThrottle = rawInput.throttle;
        applyBrake = rawInput.brake;
      } else if (this.currentGear === -1) {
        // Reverse
        reverseThrottle = rawInput.throttle;
        applyBrake = rawInput.brake;
      } else {
        // Gears 1 - 6
        applyThrottle = rawInput.throttle;
        applyBrake = rawInput.brake;
      }
    }

    this.throttle = applyThrottle + reverseThrottle;
    this.brake = applyBrake;
    this.handbrake = rawInput.handbrake;

    // 3. Engine RPM & Automatic Gear Shifting
    if (this.transmission === 'automatic' && this.autoGear === 'D') {
      const forwardSpeed = Math.max(0, this.speed);
      // Auto shift up
      if (this.currentGear < 6 && forwardSpeed > this.GEAR_MAX_SPEED[this.currentGear] * 0.88) {
        this.currentGear++;
        sound.playShiftSound();
      }
      // Auto shift down
      else if (this.currentGear > 1 && forwardSpeed < this.GEAR_MAX_SPEED[this.currentGear - 1] * 0.72) {
        this.currentGear--;
        sound.playShiftSound();
      }
    }

    // Compute RPM
    const curRatio = this.GEAR_RATIOS[this.currentGear] || 1;
    if (this.currentGear === 0 || this.autoGear === 'P') {
      // Neutral free rev
      const targetRpm = this.IDLE_RPM + applyThrottle * (this.MAX_RPM - this.IDLE_RPM);
      this.rpm += (targetRpm - this.rpm) * Math.min(1, 12 * clampedDt);
    } else {
      const wheelRps = Math.abs(this.speed) / (2 * Math.PI * 0.33); // 0.33m wheel radius
      const targetRpm = this.IDLE_RPM + (wheelRps * 60 * curRatio * 1.8) + (this.throttle * 600);
      this.rpm += (Math.min(this.MAX_RPM, Math.max(this.IDLE_RPM, targetRpm)) - this.rpm) * Math.min(1, 8 * clampedDt);
    }

    // 4. Forces & Acceleration
    const carMass = this.vehicle.specs.weightKg;
    const accelStat = this.vehicle.specs.acceleration; // e.g. 6.5 - 9.6
    const baseEngineTorque = (accelStat / 10) * 4200; // Newtons

    let driveForce = 0;
    if (this.currentGear > 0 && applyThrottle > 0) {
      // Torque decreases at higher gears, peaks in 1st/2nd
      const gearMultiplier = Math.max(0.4, (curRatio / 3.8));
      const speedCap = (this.vehicle.specs.topSpeedKmh / 3.6);
      if (this.speed < speedCap) {
        driveForce = baseEngineTorque * gearMultiplier * applyThrottle;
      }
    } else if (reverseThrottle > 0) {
      // Reverse force
      if (this.speed > -this.GEAR_MAX_SPEED[-1]) {
        driveForce = -baseEngineTorque * 0.75 * reverseThrottle;
      }
    }

    // Braking force
    const brakeStat = this.vehicle.specs.braking;
    const baseBrakeForce = (brakeStat / 10) * 8500;
    let brakeForce = applyBrake * baseBrakeForce;

    if (this.handbrake) {
      // Handbrake locks rear wheels
      brakeForce += baseBrakeForce * 0.65;
    }

    // Resistance: Rolling resistance & Aerodynamic Drag
    const rollingResistance = 180 * Math.sign(this.speed);
    const dragCoeff = 0.42;
    const airResistance = 0.5 * 1.2 * dragCoeff * (this.speed * this.speed) * Math.sign(this.speed);

    // Net longitudinal acceleration (F = m * a)
    let netForce = driveForce - airResistance;
    if (Math.abs(this.speed) > 0.05) {
      netForce -= rollingResistance;
    }

    if (brakeForce > 0) {
      const brakeDecel = (brakeForce / carMass) * clampedDt;
      if (Math.abs(this.speed) <= brakeDecel) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * brakeDecel;
      }
    }

    // Forward acceleration
    const accel = netForce / carMass;
    this.speed += accel * clampedDt;

    // Coasting decay when no throttle/brake applied (natural engine braking inertia)
    if (this.throttle === 0 && applyBrake === 0 && !this.handbrake) {
      const coastFriction = 0.85 * clampedDt;
      if (Math.abs(this.speed) <= coastFriction) {
        this.speed = 0;
      } else {
        this.speed -= Math.sign(this.speed) * coastFriction;
      }
    }

    // 5. Bicycle Kinematics with Ackermann Turning Model
    const wheelbase = this.vehicle.specs.wheelbase; // ~2.5m
    if (Math.abs(this.speed) > 0.01) {
      // Turning angular velocity: omega = (v / L) * tan(delta)
      const idealTurnRate = (this.speed / wheelbase) * Math.tan(this.steerAngle);

      // Handbrake drift effect: when handbrake is engaged, rear tires slip, increasing yaw rate!
      const handbrakeFactor = this.handbrake ? 2.1 : 1.0;
      this.angularVelocity = idealTurnRate * handbrakeFactor;

      // Update heading
      this.rotation += this.angularVelocity * clampedDt;

      // Lateral drift / slip velocity
      const slipTraction = this.handbrake ? 0.35 : 0.88;
      this.lateralVelocity *= slipTraction;
      if (this.handbrake && Math.abs(this.speed) > 3.0) {
        this.lateralVelocity += Math.sin(this.steerAngle) * this.speed * 0.4;
        sound.playTireSkid(Math.min(1.0, Math.abs(this.speed) / 12));
      } else {
        sound.playTireSkid(0);
      }
    } else {
      this.angularVelocity = 0;
      sound.playTireSkid(0);
    }

    // 6. World Movement Integration
    // Heading: rotation = 0 faces along positive Z, Math.PI / 2 faces along positive X
    const forwardX = Math.sin(this.rotation);
    const forwardZ = Math.cos(this.rotation);
    const rightX = Math.cos(this.rotation);
    const rightZ = -Math.sin(this.rotation);

    this.x += (forwardX * this.speed + rightX * this.lateralVelocity) * clampedDt;
    this.z += (forwardZ * this.speed + rightZ * this.lateralVelocity) * clampedDt;

    // Wheel spin angle based on speed
    const wheelRadius = 0.33; // meters
    this.wheelSpinAngle += (this.speed / wheelRadius) * clampedDt;

    // 7. Suspension Body Pitch & Roll Animation
    // Pitch forward under heavy braking, squat back on acceleration
    const targetPitch = Math.max(-0.06, Math.min(0.06, (-accel * 0.015) + (applyBrake * 0.035)));
    this.pitch += (targetPitch - this.pitch) * Math.min(1, 10 * clampedDt);

    // Roll into turns
    const targetRoll = Math.max(-0.08, Math.min(0.08, -this.angularVelocity * this.speed * 0.012));
    this.roll += (targetRoll - this.roll) * Math.min(1, 10 * clampedDt);

    // 8. Collisions & Boundaries
    this.checkCollisions(clampedDt);

    // 9. Parking Goal Zone Evaluation
    this.evaluateParkingZone(clampedDt);

    // 10. Update Sound
    sound.updateEngineSound(this.rpm, this.throttle);
  }

  private checkCollisions(dt: number) {
    const halfWidth = this.vehicle.specs.width / 2;
    const halfLength = this.vehicle.specs.length / 2;

    // Boundary check
    const b = this.level.boundary;
    let collided = false;
    let reboundX = 0;
    let reboundZ = 0;

    if (this.x - halfWidth < b.minX) {
      this.x = b.minX + halfWidth;
      reboundX = 1;
      collided = true;
    } else if (this.x + halfWidth > b.maxX) {
      this.x = b.maxX - halfWidth;
      reboundX = -1;
      collided = true;
    }

    if (this.z - halfLength < b.minZ) {
      this.z = b.minZ + halfLength;
      reboundZ = 1;
      collided = true;
    } else if (this.z + halfLength > b.maxZ) {
      this.z = b.maxZ - halfLength;
      reboundZ = -1;
      collided = true;
    }

    // Obstacle collisions
    let nearestDist = 999;
    for (const obs of this.level.obstacles) {
      const dx = this.x - obs.x;
      const dz = this.z - obs.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < nearestDist) {
        nearestDist = dist;
      }

      if (obs.type === 'cone') {
        const hitRadius = halfWidth + 0.35;
        if (dist < hitRadius) {
          // Hit cone
          const impactSpeed = Math.abs(this.speed * 3.6);
          if (impactSpeed > 2) {
            sound.playCrash(impactSpeed);
            this.damage = Math.min(100, this.damage + 2);
          }
          // Push away slightly
          const pushX = (dx / (dist || 1)) * 0.1;
          const pushZ = (dz / (dist || 1)) * 0.1;
          this.x += pushX;
          this.z += pushZ;
          this.speed *= 0.8;
        }
      } else if (obs.type === 'pillar') {
        const pillarHalf = (obs.width || 1.4) / 2;
        const collisionThreshold = halfWidth + pillarHalf;
        if (Math.abs(dx) < collisionThreshold && Math.abs(dz) < collisionThreshold) {
          collided = true;
          this.x = obs.x + Math.sign(dx) * (collisionThreshold + 0.05);
          this.z = obs.z + Math.sign(dz) * (collisionThreshold + 0.05);
        }
      } else if (obs.type === 'barrier' || obs.type === 'parked_car') {
        const obsW = (obs.width || 2.0) / 2;
        const obsL = (obs.length || 4.6) / 2;

        // Simple oriented box overlap test
        const overlapX = Math.abs(dx) - (halfWidth + obsW);
        const overlapZ = Math.abs(dz) - (halfLength + obsL);

        if (overlapX < 0 && overlapZ < 0) {
          collided = true;
          if (overlapX > overlapZ) {
            this.x = obs.x + Math.sign(dx) * (halfWidth + obsW + 0.08);
          } else {
            this.z = obs.z + Math.sign(dz) * (halfLength + obsL + 0.08);
          }
        }
      }
    }

    if (collided) {
      const impactSpeed = Math.abs(this.speed * 3.6);
      if (impactSpeed > 3) {
        sound.playCrash(impactSpeed);
        this.damage = Math.min(100, this.damage + Math.round(impactSpeed * 0.35));
        if (this.damage >= 100) {
          this.isFailed = true;
        }
      }
      this.speed = -this.speed * 0.3; // rebound recoil
    }

    // Trigger radar sonar sound based on proximity
    sound.triggerParkingSonar(nearestDist);
  }

  private evaluateParkingZone(dt: number) {
    const target = this.level.parkingTarget;
    const dx = this.x - target.x;
    const dz = this.z - target.z;
    const distToCenter = Math.sqrt(dx * dx + dz * dz);

    // Angle alignment
    // Normalize both angles to [-PI, PI]
    const normCarRot = ((this.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const normTargetRot = ((target.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // Forward alignment or 180 reverse alignment
    let angleDiff1 = Math.abs(normCarRot - normTargetRot);
    if (angleDiff1 > Math.PI) angleDiff1 = 2 * Math.PI - angleDiff1;

    let angleDiff2 = Math.abs(normCarRot - ((normTargetRot + Math.PI) % (Math.PI * 2)));
    if (angleDiff2 > Math.PI) angleDiff2 = 2 * Math.PI - angleDiff2;

    const angleDiff = Math.min(angleDiff1, angleDiff2);
    const isAngleAligned = angleDiff < 0.22; // ~12 degrees tolerance

    // Check if within rectangle bounds
    const isInsideBox = distToCenter < (target.length / 2) * 0.85;

    // Speed check: vehicle must be virtually stopped (< 0.2 m/s)
    const isStopped = Math.abs(this.speed) < 0.25;

    // Transmission check: Automatic in P, or Handbrake engaged in Manual/D
    const isParkMode = (this.transmission === 'automatic' && this.autoGear === 'P') || this.handbrake || isStopped;

    if (isInsideBox && isAngleAligned && isStopped) {
      this.parkedTimer += dt;
      if (this.parkedTimer >= 1.6) {
        this.isCompleted = true;
        sound.playSuccessChime();
      }
    } else {
      this.parkedTimer = Math.max(0, this.parkedTimer - dt * 2.0);
    }
  }

  public getTelemetry(): VehicleTelemetry {
    const target = this.level.parkingTarget;
    const dx = this.x - target.x;
    const dz = this.z - target.z;
    const distToTarget = Math.sqrt(dx * dx + dz * dz);

    const normCarRot = ((this.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const normTargetRot = ((target.rotation % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    let angleDiff = Math.abs(normCarRot - normTargetRot);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
    const revAngleDiff = Math.abs(normCarRot - ((normTargetRot + Math.PI) % (Math.PI * 2)));
    const minAngleDiff = Math.min(angleDiff, revAngleDiff > Math.PI ? 2 * Math.PI - revAngleDiff : revAngleDiff);

    const alignPercent = Math.max(0, Math.round((1 - (minAngleDiff / 0.4)) * 100));

    let gearDisplay = 'D';
    if (this.transmission === 'automatic') {
      if (this.autoGear === 'P') gearDisplay = 'P';
      else if (this.autoGear === 'R') gearDisplay = 'R';
      else if (this.autoGear === 'N') gearDisplay = 'N';
      else gearDisplay = `D${this.currentGear}`;
    } else {
      if (this.currentGear === -1) gearDisplay = 'R';
      else if (this.currentGear === 0) gearDisplay = 'N';
      else gearDisplay = `M${this.currentGear}`;
    }

    return {
      speedKmh: Math.round(Math.abs(this.speed * 3.6)),
      rpm: Math.round(this.rpm),
      gearDisplay,
      currentGear: this.currentGear,
      autoGear: this.autoGear,
      fuelPercent: Math.round(this.fuel),
      damagePercent: Math.min(100, Math.round(this.damage)),
      steeringAngleNorm: Math.max(-1, Math.min(1, this.steerAngle / ((this.vehicle.specs.steeringLockDeg * Math.PI) / 180))),
      handbrake: this.handbrake,
      isBraking: this.brake > 0.05,
      isReversing: this.speed < -0.1 || (this.transmission === 'automatic' && this.autoGear === 'R'),
      inParkingZone: distToTarget < 3.2,
      alignmentScorePercent: alignPercent,
      parkingTimeProgress: Math.min(1, this.parkedTimer / 1.6),
      proximityDistance: Math.max(0.2, distToTarget),
    };
  }
}
