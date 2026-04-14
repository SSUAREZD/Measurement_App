import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BrowserDetectorService } from './browser-detector.service';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface DeviceInfo {
  type: DeviceType;
  brand: string;
  model: string;
  os: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeviceDetectorService {
  readonly device: DeviceInfo;

  constructor(
    private browserDetector: BrowserDetectorService,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.device = isPlatformBrowser(platformId) ? this.detect() : this.unknown();
  }

  private unknown(): DeviceInfo {
    return { type: 'desktop', brand: 'Unknown', model: 'Unknown', os: 'Unknown', isMobile: false, isTablet: false, isDesktop: true };
  }

  private detect(): DeviceInfo {
    const ua = navigator.userAgent;

    const type = this.detectType(ua);
    const os = this.detectOS(ua);
    const { brand, model } = this.detectBrandModel(ua, os);

    return {
      type,
      brand,
      model,
      os,
      isMobile: type === 'mobile',
      isTablet: type === 'tablet',
      isDesktop: type === 'desktop',
    };
  }

  private detectType(ua: string): DeviceType {
    if (/tablet|ipad|playbook|silk|(android(?!.*mobile))/i.test(ua)) return 'tablet';
    if (/mobi|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  private detectOS(ua: string): string {
    if (/iphone|ipad|ipod/i.test(ua)) {
      const version = ua.match(/OS ([\d_]+)/)?.[1]?.replace(/_/g, '.') ?? '';
      return `iOS${version ? ' ' + version : ''}`;
    }
    if (/android/i.test(ua)) {
      const version = ua.match(/Android ([\d.]+)/)?.[1] ?? '';
      return `Android${version ? ' ' + version : ''}`;
    }
    if (/windows phone/i.test(ua)) return 'Windows Phone';
    if (/windows/i.test(ua)) return 'Windows';
    if (/macintosh|mac os x/i.test(ua)) return 'macOS';
    if (/linux/i.test(ua)) return 'Linux';
    return 'Unknown';
  }

  private detectBrandModel(ua: string, os: string): { brand: string; model: string } {
    // --- Apple ---
    if (/iphone/i.test(ua)) return { brand: 'Apple', model: this.iphoneModel() };
    if (/ipad/i.test(ua)) return { brand: 'Apple', model: 'iPad' };
    if (/ipod/i.test(ua)) return { brand: 'Apple', model: 'iPod touch' };

    if (os.startsWith('Android')) {
      // Samsung: "SAMSUNG SM-G991B" or "Samsung Galaxy S23"
      const samsung = ua.match(/(?:SAMSUNG\s+|Samsung\s*)([\w-]+)/i);
      if (samsung) return { brand: 'Samsung', model: samsung[1] };

      // Google Pixel
      const pixel = ua.match(/Pixel\s+([\w]+)/i);
      if (pixel) return { brand: 'Google', model: `Pixel ${pixel[1]}` };

      const xiaomi = ua.match(/(?:Xiaomi|Redmi|POCO)\s+([\w\s-]+?)(?:\s+Build|\))/i);
      if (xiaomi) {
        const brand = /redmi/i.test(ua) ? 'Xiaomi (Redmi)' : /poco/i.test(ua) ? 'Xiaomi (POCO)' : 'Xiaomi';
        return { brand, model: xiaomi[1].trim() };
      }

      // Huawei / Honor
      const huawei = ua.match(/(?:Huawei|Honor)\s+([\w-]+)/i);
      if (huawei) return { brand: /honor/i.test(ua) ? 'Honor' : 'Huawei', model: huawei[1] };

      // OnePlus
      const oneplus = ua.match(/OnePlus\s*([\w]+)/i);
      if (oneplus) return { brand: 'OnePlus', model: oneplus[1] };

      // Sony
      const sony = ua.match(/Sony\s+([\w-]+)/i);
      if (sony) return { brand: 'Sony', model: sony[1] };

      // Motorola
      const moto = ua.match(/(?:Motorola|moto\s+)([\w\s]+?)(?:\s+Build|\))/i);
      if (moto) return { brand: 'Motorola', model: moto[1].trim() };

      // LG
      const lg = ua.match(/LG[-\s]([\w]+)/i);
      if (lg) return { brand: 'LG', model: lg[1] };

      // Generic Android fallback: grab model from "Build/..." section
      const generic = ua.match(/\(Linux.*?;\s*Android[^;]*;\s*(.*?)\s*Build/i);
      if (generic) return { brand: 'Android', model: generic[1].trim() };
    }

    // --- Desktop / unknown ---
    return { brand: 'Unknown', model: 'Unknown' };
  }

  

  /** Rough iPhone generation mapping from screen resolution + JS hints. */
  private iphoneModel(): string {
    const w = screen.width;
    const h = screen.height;
    const ratio = window.devicePixelRatio;
    const long = Math.max(w, h);
    const short = Math.min(w, h);

    // Logical point size → model map.
    // NOTE: models that share identical CSS dimensions cannot be told apart
    // from the browser — no JS API exposes the physical model name on iOS.
    // Groups that are indistinguishable are listed together.
    const map: Array<[number, number, number, string]> = [
      // ── Unique screen sizes (can be identified precisely) ────────────────
      [402, 874, 3, 'iPhone 16 Pro'],
      [440, 956, 3, 'iPhone 16 Pro Max'],
      // ── Shared 393×852 @ 3× ─────────────────────────────────────────────
      // iPhone 14 Pro, 15, 15 Pro and 16 all share this size
      [393, 852, 3, 'iPhone 14 Pro / 15 / 15 Pro / 16'],
      // ── Shared 430×932 @ 3× ─────────────────────────────────────────────
      // iPhone 14 Plus, 14 Pro Max, 15 Plus, 15 Pro Max and 16 Plus
      [430, 932, 3, 'iPhone 14 Plus / 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus'],
      // ── Shared 390×844 @ 3× ─────────────────────────────────────────────
      [390, 844, 3, 'iPhone 12 / 12 Pro / 13 / 13 Pro / 14'],
      // ── Shared 428×926 @ 3× ─────────────────────────────────────────────
      [428, 926, 3, 'iPhone 12 Pro Max / 13 Pro Max'],
      // ── Shared 375×812 @ 3× ─────────────────────────────────────────────
      // iPhone X, XS, 11 Pro, 12 mini, 13 mini
      [375, 812, 3, 'iPhone X / XS / 11 Pro / 12 mini / 13 mini'],
      // ── Older models ─────────────────────────────────────────────────────
      [414, 896, 3, 'iPhone 11 Pro Max / XS Max'],
      [414, 896, 2, 'iPhone 11 / XR'],
      [414, 736, 3, 'iPhone 8 Plus / 7 Plus / 6s Plus'],
      [375, 667, 2, 'iPhone SE (2nd/3rd gen) / 8 / 7 / 6s'],
      [320, 568, 2, 'iPhone SE (1st gen) / 5s'],
      [320, 480, 2, 'iPhone 4s'],
    ];

    for (const [sw, sh, r, name] of map) {
      if (short === sw && long === sh && ratio === r) return name;
    }

    return 'iPhone';
  }
}
