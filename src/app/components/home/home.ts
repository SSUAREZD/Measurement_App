import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DeviceDetectorService, DeviceInfo } from '../../services/device-detector.service';
import { PhoneService } from '../../services/phone.service';
import { PhoneDTO } from '../../models/models';
import { Navbar } from '../navbar/navbar';

type HomeState =
  | 'loading'
  | 'not-phone'
  | 'unsupported-phone'
  | 'supported-phone'
  | 'manual-selection';

@Component({
  selector: 'app-home',
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class HomeComponent implements OnInit {
  state: HomeState = 'loading';
  phone: PhoneDTO | null = null;
  allPhones: PhoneDTO[] = [];
  availableBrands: string[] = [];
  availableModels: PhoneDTO[] = [];
  selectedBrand = '';
  selectedPhoneName = '';
  debug: {
    device: DeviceInfo;
    apiError: string | null;
    lookupSkipped: boolean;
    fallbackReason: string | null;
  } | null = null;

  constructor(
    private deviceDetector: DeviceDetectorService,
    private phoneService: PhoneService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const device = this.deviceDetector.device;
    this.debug = {
      device,
      apiError: null,
      lookupSkipped: false,
      fallbackReason: null,
    };

    if (!device.isMobile) {
      this.state = 'not-phone';
      return;
    }

    if (!this.hasReliableDeviceInfo(device.brand, device.model)) {
      this.debug.lookupSkipped = true;
      this.debug.fallbackReason = 'device-detection-unreliable';
      this.enableManualSelection();
      return;
    }

    this.phoneService.getByBrandAndName(device.brand, device.model).subscribe({
      next: (phone) => {
        this.proceedToApp(phone);
      },
      error: (err) => {
        this.debug!.apiError = `${err.status} ${err.message}`;
        this.debug!.fallbackReason = 'automatic-lookup-failed';
        this.enableManualSelection();
      },
    });
  }

  onBrandChange(): void {
    this.selectedPhoneName = '';
    this.availableModels = this.allPhones.filter(
      (phone) => phone.brand === this.selectedBrand,
    );
  }

  onManualSelectionContinue(): void {
    const selectedPhone =
      this.allPhones.find(
        (phone) =>
          phone.brand === this.selectedBrand && phone.name === this.selectedPhoneName,
      ) ?? null;

    if (!selectedPhone) {
      return;
    }

    this.proceedToApp(selectedPhone);
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
    this.router.navigate(['/medicion']);
  }

  async onPruebaMedicion(): Promise<void> {
    await this.requestPermissions();
    this.router.navigate(['/medicion']);
  }

  private hasReliableDeviceInfo(brand: string, model: string): boolean {
    return this.isKnownValue(brand) && this.isKnownValue(model);
  }

  private isKnownValue(value: string | null | undefined): boolean {
    if (!value) {
      return false;
    }

    const normalizedValue = value.trim().toLowerCase();
    return normalizedValue !== '' && normalizedValue !== 'unknown';
  }

  private enableManualSelection(): void {
    this.phoneService.getAll().subscribe({
      next: (phones) => {
        this.allPhones = phones;
        this.availableBrands = [...new Set(phones.map((phone) => phone.brand))].sort();
        this.availableModels = [];
        this.selectedBrand = '';
        this.selectedPhoneName = '';
        this.state = 'manual-selection';
      },
      error: (err) => {
        this.debug!.apiError = `${err.status} ${err.message}`;
        this.state = 'unsupported-phone';
      },
    });
  }

  private proceedToApp(phone: PhoneDTO): void {
    this.phone = phone;
    this.state = 'supported-phone';
    this.router.navigate(['/medicion']);
  }
}
