import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';
import { FeetMeasurement } from '../../models/models';

type MedicionState = 'idle' | 'calibrating' | 'tracking';
type SpeedStatus   = 'idle' | 'slow' | 'ok' | 'fast';

@Component({
  selector: 'app-medicion',
  imports: [CommonModule, Navbar],
  templateUrl: './medicion.html',
  styleUrl: './medicion.css',
})
export class MedicionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cameraPreview') cameraPreview!: ElementRef<HTMLVideoElement>;

  state: MedicionState     = 'idle';
  distanceCm               = 0;
  cameraError              = false;
  calibProgress            = 0;
  speedStatus: SpeedStatus = 'idle';
  invalidated              = false;
  debugMotion: string | null = null;
  readonly showDebug = false;

  // ── 3-phase measurement (3 samples each → median) ─────────────────────────
  // Phase order: footLength → ballWidth → heelWidth
  // ballGirth and instepGirth are always sent as 0 (calculated server-side).
  footLengthSamples: number[] = [];
  ballWidthSamples:  number[] = [];
  heelWidthSamples:  number[] = [];

  private readonly PHASE_LABELS = ['Largo del pie', 'Ancho del antepié', 'Ancho del talón'];

  private weightedAverage(s: number[]): number {
    const sorted = [...s].sort((a, b) => a - b);
    // Weights [0.25, 0.50, 0.25]: middle sample counts double, outliers dampened
    const result = sorted[0] * 0.25 + sorted[1] * 0.50 + sorted[2] * 0.25;
    return Math.round(result * 10) / 10;
  }

  // Computed weighted average for each phase (null until 3 samples collected)
  get footLength(): number | null { return this.footLengthSamples.length >= 3 ? this.weightedAverage(this.footLengthSamples) : null; }
  get ballWidth():  number | null { return this.ballWidthSamples.length  >= 3 ? this.weightedAverage(this.ballWidthSamples)  : null; }
  get heelWidth():  number | null { return this.heelWidthSamples.length  >= 3 ? this.weightedAverage(this.heelWidthSamples)  : null; }

  /** How many phases have all 3 samples (0–3). */
  get phasesCompleted(): number {
    return (this.footLengthSamples.length >= 3 ? 1 : 0) +
           (this.ballWidthSamples.length  >= 3 ? 1 : 0) +
           (this.heelWidthSamples.length  >= 3 ? 1 : 0);
  }

  private get currentPhaseSamples(): number[] | null {
    if (this.footLengthSamples.length < 3) return this.footLengthSamples;
    if (this.ballWidthSamples.length  < 3) return this.ballWidthSamples;
    if (this.heelWidthSamples.length  < 3) return this.heelWidthSamples;
    return null;
  }

  /** Sub-measurement number within the current phase (1–3). */
  get measurementNumber(): number { return (this.currentPhaseSamples?.length ?? 3) + 1; }

  get currentPhaseLabel(): string { return this.PHASE_LABELS[this.phasesCompleted] ?? ''; }

  get finalResult(): FeetMeasurement | null {
    const fl = this.footLength, bw = this.ballWidth, hw = this.heelWidth;
    if (fl === null || bw === null || hw === null) return null;
    return { footLength: fl, ballWidth: bw, heelWidth: hw, ballGirth: 0, instepGirth: 0 };
  }

  private saveMeasurement(): void {
    if (this.distanceCm <= 0) return;
    if (this.distanceCm < 1 || this.distanceCm > 20) {
      this.invalidated = true;
      return;
    }
    // Stale scan: distance was non-zero but stopped updating for too long
    if (performance.now() - this.lastDistanceChangedAt > this.STALE_DISTANCE_MS) {
      this.invalidated = true;
      return;
    }
    this.currentPhaseSamples?.push(this.distanceCm);
  }

  resetMeasurements(): void {
    this.footLengthSamples     = [];
    this.ballWidthSamples      = [];
    this.heelWidthSamples      = [];
    this.distanceCm            = 0;
    this.totalDistanceCm       = 0;
    this.lastDistanceChangedAt = 0;
  }

  get isIdle()        { return this.state === 'idle'; }
  get isTracking()    { return this.state === 'tracking'; }
  get isCalibrating() { return this.state === 'calibrating'; }

  // ── Speed range ───────────────────────────────────────────────────────────
  private readonly SPEED_IDLE_MS  = 0.0025; // 0.25 cm/s — below = idle
  private readonly SPEED_MIN_MS   = 0.005; // 0.5 cm/s — below = too slow
  private readonly SPEED_MAX_MS   = 0.060; // 7.0 cm/s — above = too fast (invalidates)
  private readonly SPEED_MID_CM_S = 4.0;   // fixed assumed speed for distance (empirically calibrated ~4 cm/s)
  readonly speedRangeLabel = `${this.SPEED_MIN_MS * 100}–${this.SPEED_MAX_MS * 100} cm/s`;

  // ── ZUPT ──────────────────────────────────────────────────────────────────
  // DZ and ZUPT_THRESHOLD are kept equal: any acceleration that can drive
  // velocity also prevents ZUPT from resetting it, and vice versa.
  private readonly ZUPT_WINDOW   = 6;
  private readonly ZUPT_VEL_GATE = 0.015; // 1.5 cm/s — allows ZUPT to clear noise-induced velocity
  private accelMagWindow: number[] = [];

  // ── Calibration ───────────────────────────────────────────────────────────
  private readonly CALIB_SAMPLES = 60;
  private calibSamples:  Array<{ x: number; y: number; z: number }> = [];
  private calibSamplesG: Array<{ x: number; y: number; z: number }> = [];
  private bias         = { x: 0, y: 0, z: 0 };
  private adaptiveDZ   = 0.02; // m/s² — set to 3×noise-σ at end of calibration
  private settleFrames = 0;    // frames remaining where velocity is forced to zero
  // Unit vector pointing in the gravity direction (updated each calibration)
  private gravityUnit  = { x: 0, y: 1, z: 0 };

  // ── Audio metronome ───────────────────────────────────────────────────────
  private audioCtx: AudioContext | null = null;
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;

  // ── Brightness monitor ────────────────────────────────────────────────────
  // Two-phase: wait for camera to go dark (foot covers lens), then detect
  // when it brightens again (foot lifted = scan ended).
  // cameraIsCovered bypasses hasRecentMotion so smooth skin still accumulates.
  private brightnessCtx: CanvasRenderingContext2D | null = null;
  private brightnessTimer: ReturnType<typeof setInterval> | null = null;
  cameraIsCovered = false;

  private videoStream: MediaStream | null = null;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;

  private lastTimestamp: number | null = null;
  private velocity = { x: 0, y: 0, z: 0 };
  private totalDistanceCm = 0;
  private lastDistanceChangedAt = 0; // ms — last time distanceCm increased
  private readonly STALE_DISTANCE_MS = 2000; // 2s without progress = stale scan
  // Phone's long axis (Y) — always the heel-to-toe scan direction
  private readonly SCAN_AXIS = { x: 0, y: 1, z: 0 };

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopMotionListener();
    this.stopMetronome();
    this.stopBrightnessMonitor();
  }

  // ── Camera ────────────────────────────────────────────────────────────────

  private async startCamera(): Promise<void> {
    try {
      this.videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      const video = this.cameraPreview.nativeElement;
      video.srcObject = this.videoStream;
      video.play();
    } catch {
      this.cameraError = true;
    }
  }

  private stopCamera(): void {
    this.videoStream?.getTracks().forEach(t => t.stop());
    this.videoStream = null;
  }

  private stopMotionListener(): void {
    if (this.motionHandler) {
      window.removeEventListener('devicemotion', this.motionHandler);
      this.motionHandler = null;
    }
  }

  // ── Brightness monitor ────────────────────────────────────────────────────

  private startBrightnessMonitor(): void {
    if (!this.videoStream) return;
    const canvas = document.createElement('canvas');
    canvas.width  = 32;
    canvas.height = 24;
    this.brightnessCtx  = canvas.getContext('2d');
    this.cameraIsCovered = false;

    // Score-based: bright frames add +1, dark frames subtract 1.
    // Hysteresis: cover gate (< 30) is higher than uncover gate (> 20)
    // so borderline readings don't flip state. Need score >= 5 (~0.5s).
    const COVER_THRESHOLD   = 30;
    const UNCOVER_THRESHOLD = 20;
    const UNCOVER_TARGET    = 5;
    let uncoverScore = 0;

    this.brightnessTimer = setInterval(() => {
      const b = this.sampleBrightness();
      if (b === null) return;
      if (!this.cameraIsCovered) {
        // Phase 1: wait for foot to fully block the lens
        if (b < COVER_THRESHOLD) { this.cameraIsCovered = true; uncoverScore = 0; }
      } else {
        // Phase 2: score-based — bright frame +1, dark frame -1
        if (b > UNCOVER_THRESHOLD) {
          uncoverScore++;
          if (uncoverScore >= UNCOVER_TARGET) this.onCameraUncovered();
        } else {
          uncoverScore = Math.max(0, uncoverScore - 1);
        }
      }
    }, 100);
  }

  private sampleBrightness(): number | null {
    if (!this.brightnessCtx) return null;
    const video = this.cameraPreview?.nativeElement;
    if (!video || video.readyState < 2) return null;
    this.brightnessCtx.drawImage(video, 0, 0, 32, 24);
    const pixels = this.brightnessCtx.getImageData(0, 0, 32, 24).data;
    let sum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      sum += (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    }
    return sum / (pixels.length / 4);
  }

  private stopBrightnessMonitor(): void {
    if (this.brightnessTimer !== null) {
      clearInterval(this.brightnessTimer);
      this.brightnessTimer = null;
    }
    this.brightnessCtx   = null;
    this.cameraIsCovered = false;
  }

  private onCameraUncovered(): void {
    this.invalidated   = false; // reset before save so saveMeasurement can flag it
    this.state         = 'idle';
    this.stopMotionListener();
    this.stopMetronome();
    this.stopBrightnessMonitor();
    this.velocity      = { x: 0, y: 0, z: 0 };
    this.lastTimestamp = null;
    this.speedStatus   = 'idle';
    this.saveMeasurement();
  }

  // ── Metronome ─────────────────────────────────────────────────────────────

  private startMetronome(): void {
    this.audioCtx = new AudioContext();
    this.playClick();
    this.metronomeTimer = setInterval(() => this.playClick(), 1000);
  }

  private stopMetronome(): void {
    if (this.metronomeTimer !== null) {
      clearInterval(this.metronomeTimer);
      this.metronomeTimer = null;
    }
    this.audioCtx?.close();
    this.audioCtx = null;
  }

  private playClick(): void {
    if (!this.audioCtx) return;
    const ctx  = this.audioCtx;
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880; // A5 — crisp, audible through phone speaker
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  // ── Toggle ────────────────────────────────────────────────────────────────

  async toggleTracking(): Promise<void> {
    if (this.state !== 'idle') {
      this.invalidated     = false; // reset before save so saveMeasurement can flag it
      this.saveMeasurement();
      this.state           = 'idle';
      this.stopMotionListener();
      this.stopMetronome();
      this.stopBrightnessMonitor();
      this.totalDistanceCm = 0;
      this.velocity        = { x: 0, y: 0, z: 0 };
      this.lastTimestamp   = null;
      this.calibSamples    = [];
      this.calibSamplesG   = [];
      this.calibProgress   = 0;
      this.speedStatus     = 'idle';
      return;
    }

    // Auto-reset after all 3 phases are complete
    if (this.finalResult !== null) this.resetMeasurements();

    this.invalidated = false;

    const dme = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme.requestPermission === 'function') {
      const result = await dme.requestPermission();
      if (result !== 'granted') return;
    }

    this.calibSamples  = [];
    this.calibSamplesG = [];
    this.calibProgress = 0;
    this.bias          = { x: 0, y: 0, z: 0 };
    this.state         = 'calibrating';

    this.motionHandler = (e: DeviceMotionEvent) => this.onDeviceMotion(e);
    window.addEventListener('devicemotion', this.motionHandler);
  }

  // ── Motion handler ────────────────────────────────────────────────────────

  private onDeviceMotion(event: DeviceMotionEvent): void {
    const acc  = event.acceleration;
    const accG = event.accelerationIncludingGravity;

    this.debugMotion =
      `acc: ${acc?.x?.toFixed(2) ?? 'null'}, ${acc?.y?.toFixed(2) ?? 'null'}, ${acc?.z?.toFixed(2) ?? 'null'} | ` +
      `accG: ${accG?.x?.toFixed(2) ?? 'null'}, ${accG?.y?.toFixed(2) ?? 'null'}, ${accG?.z?.toFixed(2) ?? 'null'} | ` +
      `dt: ${this.lastTimestamp ? ((performance.now() - this.lastTimestamp) / 1000).toFixed(4) : 'n/a'}s | ` +
      `spd: ${Math.sqrt(this.velocity.x**2+this.velocity.y**2+this.velocity.z**2).toFixed(3)}m/s`;

    if (!acc) return;

    // ── Calibration phase ────────────────────────────────────────────────
    if (this.state === 'calibrating') {
      this.calibSamples.push({ x: acc.x ?? 0, y: acc.y ?? 0, z: acc.z ?? 0 });
      if (accG) this.calibSamplesG.push({ x: accG.x ?? 0, y: accG.y ?? 0, z: accG.z ?? 0 });
      this.calibProgress = Math.round((this.calibSamples.length / this.CALIB_SAMPLES) * 100);

      if (this.calibSamples.length >= this.CALIB_SAMPLES) {
        const n = this.calibSamples.length;
        this.bias.x = this.calibSamples.reduce((s, v) => s + v.x, 0) / n;
        this.bias.y = this.calibSamples.reduce((s, v) => s + v.y, 0) / n;
        this.bias.z = this.calibSamples.reduce((s, v) => s + v.z, 0) / n;

        // Compute gravity unit vector from accG average (at rest, accG ≈ gravity)
        if (this.calibSamplesG.length > 0) {
          const ng = this.calibSamplesG.length;
          const gx = this.calibSamplesG.reduce((s, v) => s + v.x, 0) / ng;
          const gy = this.calibSamplesG.reduce((s, v) => s + v.y, 0) / ng;
          const gz = this.calibSamplesG.reduce((s, v) => s + v.z, 0) / ng;
          const gMag = Math.sqrt(gx * gx + gy * gy + gz * gz);
          if (gMag > 0.5) this.gravityUnit = { x: gx / gMag, y: gy / gMag, z: gz / gMag };
        }
        this.calibSamplesG = [];

        // Adaptive dead zone: 3× per-axis noise std dev measured during calibration
        const varX = this.calibSamples.reduce((s, v) => s + (v.x - this.bias.x) ** 2, 0) / n;
        const varY = this.calibSamples.reduce((s, v) => s + (v.y - this.bias.y) ** 2, 0) / n;
        const varZ = this.calibSamples.reduce((s, v) => s + (v.z - this.bias.z) ** 2, 0) / n;
        this.adaptiveDZ = Math.max(0.08, 2 * Math.sqrt((varX + varY + varZ) / 3));

        this.totalDistanceCm        = 0;
        this.distanceCm             = 0;
        this.lastDistanceChangedAt  = 0;
        this.velocity               = { x: 0, y: 0, z: 0 };
        this.lastTimestamp          = null;
        // Pre-fill with zeros so ZUPT is ready to fire from frame 1
        this.accelMagWindow  = new Array(this.ZUPT_WINDOW).fill(0);
        this.settleFrames    = 20; // ~330 ms of forced-zero velocity after calibration
        this.speedStatus     = 'idle';
        this.state           = 'tracking';
        this.startMetronome();
        this.startBrightnessMonitor();
      }
      return;
    }

    if (this.state !== 'tracking') return;

    // ── Tracking phase ───────────────────────────────────────────────────
    const now = performance.now();
    if (this.lastTimestamp === null) { this.lastTimestamp = now; return; }

    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = now;

    // Settling window: guarantee zero immediately after calibration
    if (this.settleFrames > 0) {
      this.velocity    = { x: 0, y: 0, z: 0 };
      this.speedStatus = 'idle';
      this.settleFrames--;
      return;
    }

    const rx = (acc.x ?? 0) - this.bias.x;
    const ry = (acc.y ?? 0) - this.bias.y;
    const rz = (acc.z ?? 0) - this.bias.z;

    // Project out the gravity axis so vertical-phone noise doesn't accumulate
    const dot = rx * this.gravityUnit.x + ry * this.gravityUnit.y + rz * this.gravityUnit.z;
    const ax  = rx - dot * this.gravityUnit.x;
    const ay  = ry - dot * this.gravityUnit.y;
    const az  = rz - dot * this.gravityUnit.z;

    const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);
    const speedNow = Math.sqrt(
      this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
    );

    // ZUPT with velocity gate
    this.accelMagWindow.push(accelMag);
    if (this.accelMagWindow.length > this.ZUPT_WINDOW) this.accelMagWindow.shift();
    if (
      this.accelMagWindow.length === this.ZUPT_WINDOW &&
      Math.max(...this.accelMagWindow) < this.adaptiveDZ &&
      speedNow < this.ZUPT_VEL_GATE
    ) {
      this.velocity = { x: 0, y: 0, z: 0 };
    }

    const DZ = this.adaptiveDZ;
    const fx = Math.abs(ax) > DZ ? ax : 0;
    const fy = Math.abs(ay) > DZ ? ay : 0;
    // Z-axis (perpendicular to phone face) is excluded — contributes only noise

    this.velocity.x += fx * dt;
    this.velocity.y += fy * dt;
    // velocity.z intentionally not updated — always stays 0

    const speed = Math.sqrt(
      this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
    );
    // Fast decay only below SPEED_IDLE (true stillness). In the 'slow' zone
    // the velocity must be maintained long enough to span the full scan.
    const tau   = speed > this.SPEED_IDLE_MS ? 3.0 : 0.4;
    const decay = Math.exp(-dt / tau);
    this.velocity.x *= decay;
    this.velocity.y *= decay;
    this.velocity.z *= decay;

    // Use 3D magnitude so the classification is axis-agnostic — a scan along
    // X or Z (phone held at an angle) is treated the same as along Y.
    const scanSpeed = Math.sqrt(
      this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
    );

    // ── Speed classification (1D forward speed) ───────────────────────────
    if      (scanSpeed < this.SPEED_IDLE_MS) this.speedStatus = 'idle';
    else if (scanSpeed < this.SPEED_MIN_MS)  this.speedStatus = 'slow';
    else if (scanSpeed > this.SPEED_MAX_MS)  this.speedStatus = 'fast';
    else                                     this.speedStatus = 'ok';

    // Projected (DZ-filtered) acceleration along scan axis
    // Negative = decelerating/reversing → pause accumulation
    const projF = fx * this.SCAN_AXIS.x + fy * this.SCAN_AXIS.y;

    // hasRecentMotion: at least one frame in the window exceeded the dead zone.
    // Prevents drift on rough surfaces (table) where coasting produces no accel.
    // On smooth skin, accel spikes may never break DZ → this would block all
    // accumulation. The camera coverage flag bypasses it: once the foot covers
    // the lens the scan is confirmed real, so smooth-surface scanning is allowed.
    const hasRecentMotion = this.accelMagWindow.some(a => a > this.adaptiveDZ);
    const activeGate = this.cameraIsCovered || hasRecentMotion;

    // 'fast' is included so the scan keeps accumulating instead of being lost —
    // the speed overlay warns the user. 'slow' requires camera covered or
    // positive projection to avoid accumulating during drift/ramp-up.
    const inMoveWindow = this.speedStatus === 'ok' || this.speedStatus === 'fast' ||
                         (this.speedStatus === 'slow' && (this.cameraIsCovered || projF > 0));
    if (inMoveWindow && activeGate) {
      this.totalDistanceCm += this.SPEED_MID_CM_S * dt;
      const newDist = Math.round(this.totalDistanceCm * 10) / 10;
      if (newDist !== this.distanceCm) {
        this.distanceCm = newDist;
        this.lastDistanceChangedAt = performance.now();
      }
    }
  }
}
