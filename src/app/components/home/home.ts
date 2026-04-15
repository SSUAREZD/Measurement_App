import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DeviceDetectorService, DeviceInfo } from '../../services/device-detector.service';
import { PhoneService } from '../../services/phone.service';
import { PhoneDTO } from '../../models/models';
import { Navbar } from '../navbar/navbar';

type HomeState = 'loading' | 'not-phone' | 'unsupported-phone' | 'supported-phone';

@Component({
  selector: 'app-home',
  imports: [CommonModule, Navbar],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  state: HomeState = 'loading';
  phone: PhoneDTO | null = null;
  debug: { device: DeviceInfo; apiError: string | null } | null = null;

  constructor(
    private deviceDetector: DeviceDetectorService,
    private phoneService: PhoneService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const device = this.deviceDetector.device;
    this.debug = { device, apiError: null };

    if (!device.isMobile) {
      this.state = 'not-phone';
      return;
    }

    this.phoneService.getByBrandAndName(device.brand, device.model).subscribe({
      next: (phone) => {
        this.phone = phone;
        this.state = 'supported-phone';
      },
      error: (err) => {
        this.debug!.apiError = `${err.status} ${err.message}`;
        this.state = 'unsupported-phone';
      },
    });
  }

  private async requestPermissions(): Promise<void> {
    // Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      stream.getTracks().forEach(t => t.stop());
    } catch { /* denied or unavailable */ }

    // Accelerometer & Gyroscope (iOS 13+ requires explicit permission)
    const dme = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme.requestPermission === 'function') {
      try { await dme.requestPermission(); } catch { /* denied */ }
    }

    const doe = DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof doe.requestPermission === 'function') {
      try { await doe.requestPermission(); } catch { /* denied */ }
    }

    // Ambient Light Sensor (Generic Sensor API – limited browser support)
    if ('AmbientLightSensor' in window) {
      try {
        await (navigator as Navigator & { permissions?: { query: (d: { name: string }) => Promise<{ state: string }> } })
          .permissions?.query({ name: 'ambient-light-sensor' });
      } catch { /* not supported */ }
    }
  }

  async onStart(): Promise<void> {
    await this.requestPermissions();
    this.router.navigate(['/measure']);
  }

  async onPruebaMedicion(): Promise<void> {
    await this.requestPermissions();
    this.router.navigate(['/medicion']);
  }
}
