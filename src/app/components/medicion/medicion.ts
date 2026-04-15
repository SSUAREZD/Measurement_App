import { Component, AfterViewInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-medicion',
  imports: [CommonModule, Navbar],
  templateUrl: './medicion.html',
  styleUrl: './medicion.css',
})
export class MedicionComponent implements AfterViewInit, OnDestroy {
  @ViewChild('cameraPreview') cameraPreview!: ElementRef<HTMLVideoElement>;

  isTracking = false;
  distanceCm = 0;
  cameraError = false;
  debugMotion: string | null = null;
  readonly showDebug = false; // set to true to reveal sensor debug overlay

  private videoStream: MediaStream | null = null;
  private motionHandler: ((e: DeviceMotionEvent) => void) | null = null;

  // Integration state
  private lastTimestamp: number | null = null;
  private velocity = { x: 0, y: 0, z: 0 };
  private totalDistanceCm = 0;

  async ngAfterViewInit(): Promise<void> {
    await this.startCamera();
  }

  ngOnDestroy(): void {
    this.stopCamera();
    this.stopMotionListener();
  }

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

  async toggleTracking(): Promise<void> {
    if (this.isTracking) {
      this.isTracking = false;
      this.stopMotionListener();
      this.totalDistanceCm = 0;
      this.distanceCm = 0;
      this.velocity = { x: 0, y: 0, z: 0 };
      this.lastTimestamp = null;
    } else {
      // iOS 13+ requires permission from a user gesture
      const dme = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      if (typeof dme.requestPermission === 'function') {
        const result = await dme.requestPermission();
        if (result !== 'granted') return;
      }

      this.totalDistanceCm = 0;
      this.distanceCm = 0;
      this.velocity = { x: 0, y: 0, z: 0 };
      this.lastTimestamp = null;
      this.isTracking = true;

      this.motionHandler = (e: DeviceMotionEvent) => this.onDeviceMotion(e);
      window.addEventListener('devicemotion', this.motionHandler);
    }
  }

  private onDeviceMotion(event: DeviceMotionEvent): void {
    const acc = event.acceleration;
    const accG = event.accelerationIncludingGravity;

    // Debug: show first few raw values
    this.debugMotion =
      `acc: ${acc?.x?.toFixed(2) ?? 'null'}, ${acc?.y?.toFixed(2) ?? 'null'}, ${acc?.z?.toFixed(2) ?? 'null'} | ` +
      `accG: ${accG?.x?.toFixed(2) ?? 'null'}, ${accG?.y?.toFixed(2) ?? 'null'}, ${accG?.z?.toFixed(2) ?? 'null'} | ` +
      `interval: ${event.interval} | dt: ${this.lastTimestamp ? ((performance.now() - this.lastTimestamp) / 1000).toFixed(4) : 'n/a'}s`;

    if (!acc) return;

    const now = performance.now();

    if (this.lastTimestamp === null) {
      this.lastTimestamp = now;
      return;
    }

    // Use wall-clock delta (ms) — event.interval is unreliable across browsers
    const dt = Math.min((now - this.lastTimestamp) / 1000, 0.1); // seconds, capped at 100ms
    this.lastTimestamp = now;

    const ax = acc.x ?? 0;
    const ay = acc.y ?? 0;
    const az = acc.z ?? 0;

    // Dead-zone filter: ignore accelerations below noise floor (~0.12 m/s²)
    const THRESHOLD = 0.12;
    const fx = Math.abs(ax) > THRESHOLD ? ax : 0;
    const fy = Math.abs(ay) > THRESHOLD ? ay : 0;
    const fz = Math.abs(az) > THRESHOLD ? az : 0;

    // Integrate acceleration → velocity
    this.velocity.x += fx * dt;
    this.velocity.y += fy * dt;
    this.velocity.z += fz * dt;

    // Exponential velocity decay to combat sensor drift
    // tau ≈ 0.3 s  →  decay = exp(-dt / tau)
    const decay = Math.exp(-dt / 0.3);
    this.velocity.x *= decay;
    this.velocity.y *= decay;
    this.velocity.z *= decay;

    // Integrate velocity → incremental displacement (metres)
    const dx = this.velocity.x * dt;
    const dy = this.velocity.y * dt;
    const dz = this.velocity.z * dt;

    // Accumulate total path length
    const increment = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.totalDistanceCm += increment * 100;
    this.distanceCm = Math.round(this.totalDistanceCm * 10) / 10;
  }
}
