import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
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

  onStart(): void {
    // TODO: request peripheral access and navigate to measurement flow
  }
}
