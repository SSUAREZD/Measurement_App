import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';

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
  invalidated              = false; // true when measurement was stopped due to high speed
  debugMotion: string | null = null;
  readonly showDebug = false;

  get isTracking()    { return this.state === 'tracking'; }
  get isCalibrating() { return this.state === 'calibrating'; }

  // ── Speed-gated time integration ──────────────────────────────────────────
  readonly TARGET_SPEED_CM_S     = 2;
  private readonly SPEED_IDLE_MS = 0.005; // 0.5 cm/s — below = idle
  private readonly SPEED_MIN_MS  = 0.010; // 1.0 cm/s — below idle = too slow
  private readonly SPEED_MAX_MS  = 0.040; // 4.0 cm/s — above = too fast (invalidates)

  // ── ZUPT ──────────────────────────────────────────────────────────────────
  private readonly ZUPT_WINDOW    = 6;
  private readonly ZUPT_THRESHOLD = 0.08;
  private readonly ZUPT_VEL_GATE  = 0.003; // 0.3 cm/s — well below idle threshold
  private accelMagWindow: number[] = [];

  // ── Calibration ───────────────────────────────────────────────────────────
  private readonly CALIB_SAMPLES = 60;
  private calibSamples: Array<{ x: number; y: number; z: number }> = [];
  private bias = { x: 0, y: 0, z: 0 };

  // ── Audio metronome ───────────────────────────────────────────────────────
  private audioCtx: AudioContext | null = null;
  private metronomeTimer: ReturnType<typeof setInterval> | null = null;

  private videoStream: MediaStream | null = null;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;

  private lastTimestamp: number | null = null;
  private velocity = { x: 0, y: 0, z: 0 };
  private totalDistanceCm = 0;

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopMotionListener();
    this.stopMetronome();
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

  // ── Metronome ─────────────────────────────────────────────────────────────
  // Plays a click every second — at TARGET_SPEED_CM_S the user should move
  // exactly TARGET_SPEED_CM_S cm between each click.

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
      this.state           = 'idle';
      this.stopMotionListener();
      this.stopMetronome();
      this.totalDistanceCm = 0;
      this.distanceCm      = 0;
      this.velocity        = { x: 0, y: 0, z: 0 };
      this.lastTimestamp   = null;
      this.calibSamples    = [];
      this.calibProgress   = 0;
      this.speedStatus     = 'idle';
      this.invalidated     = false;
      return;
    }

    this.invalidated = false;

    const dme = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme.requestPermission === 'function') {
      const result = await dme.requestPermission();
      if (result !== 'granted') return;
    }

    this.calibSamples  = [];
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
      this.calibProgress = Math.round((this.calibSamples.length / this.CALIB_SAMPLES) * 100);

      if (this.calibSamples.length >= this.CALIB_SAMPLES) {
        const n = this.calibSamples.length;
        this.bias.x = this.calibSamples.reduce((s, v) => s + v.x, 0) / n;
        this.bias.y = this.calibSamples.reduce((s, v) => s + v.y, 0) / n;
        this.bias.z = this.calibSamples.reduce((s, v) => s + v.z, 0) / n;

        this.totalDistanceCm = 0;
        this.distanceCm      = 0;
        this.velocity        = { x: 0, y: 0, z: 0 };
        this.lastTimestamp   = null;
        this.accelMagWindow  = [];
        this.speedStatus     = 'idle';
        this.state           = 'tracking';
        this.startMetronome();
      }
      return;
    }

    if (this.state !== 'tracking') return;

    // ── Tracking phase ───────────────────────────────────────────────────
    const now = performance.now();
    if (this.lastTimestamp === null) { this.lastTimestamp = now; return; }

    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.05);
    this.lastTimestamp = now;

    const ax = (acc.x ?? 0) - this.bias.x;
    const ay = (acc.y ?? 0) - this.bias.y;
    const az = (acc.z ?? 0) - this.bias.z;

    const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);
    const speedNow = Math.sqrt(
      this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
    );

    // ZUPT with velocity gate
    this.accelMagWindow.push(accelMag);
    if (this.accelMagWindow.length > this.ZUPT_WINDOW) this.accelMagWindow.shift();
    if (
      this.accelMagWindow.length === this.ZUPT_WINDOW &&
      Math.max(...this.accelMagWindow) < this.ZUPT_THRESHOLD &&
      speedNow < this.ZUPT_VEL_GATE
    ) {
      this.velocity = { x: 0, y: 0, z: 0 };
    }

    const DZ = 0.03;
    const fx = Math.abs(ax) > DZ ? ax : 0;
    const fy = Math.abs(ay) > DZ ? ay : 0;
    const fz = Math.abs(az) > DZ ? az : 0;

    this.velocity.x += fx * dt;
    this.velocity.y += fy * dt;
    this.velocity.z += fz * dt;

    const speed = Math.sqrt(
      this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2
    );
    const tau   = speed > 0.008 ? 3.0 : 0.4;
    const decay = Math.exp(-dt / tau);
    this.velocity.x *= decay;
    this.velocity.y *= decay;
    this.velocity.z *= decay;

    // ── Speed classification ─────────────────────────────────────────────
    if      (speed < this.SPEED_IDLE_MS) this.speedStatus = 'idle';
    else if (speed < this.SPEED_MIN_MS) this.speedStatus = 'slow';
    else if (speed > this.SPEED_MAX_MS) this.speedStatus = 'fast';
    else                                this.speedStatus = 'ok';

    // Too fast → invalidate and stop immediately
    if (this.speedStatus === 'fast') {
      navigator.vibrate?.(400);
      this.invalidated     = true;
      this.state           = 'idle';
      this.stopMotionListener();
      this.stopMetronome();
      this.totalDistanceCm = 0;
      this.distanceCm      = 0;
      this.velocity        = { x: 0, y: 0, z: 0 };
      this.lastTimestamp   = null;
      return;
    }

    // Accumulate distance only in OK zone
    if (this.speedStatus === 'ok') {
      this.totalDistanceCm += this.TARGET_SPEED_CM_S * dt;
      this.distanceCm = Math.round(this.totalDistanceCm * 10) / 10;
    }
  }
}
