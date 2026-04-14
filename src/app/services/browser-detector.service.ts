import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type BrowserName =
  | 'Chrome'
  | 'Firefox'
  | 'Safari'
  | 'Edge'
  | 'Opera'
  | 'Samsung Internet'
  | 'Unknown';

export interface BrowserInfo {
  name: BrowserName;
  version: string;
  isChrome: boolean;
  isFirefox: boolean;
  isSafari: boolean;
  isEdge: boolean;
  isOpera: boolean;
}

@Injectable({ providedIn: 'root' })
export class BrowserDetectorService {
  readonly browser: BrowserInfo;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.browser = isPlatformBrowser(platformId) ? this.detect() : this.unknown();
  }

  private unknown(): BrowserInfo {
    return { name: 'Unknown', version: '', isChrome: false, isFirefox: false, isSafari: false, isEdge: false, isOpera: false };
  }

  private detect(): BrowserInfo {
    const ua = navigator.userAgent;

    let name: BrowserName = 'Unknown';
    let version = '';

    if (/Samsung/i.test(ua)) {
      name = 'Samsung Internet';
      version = this.extractVersion(ua, /SamsungBrowser\/([\d.]+)/);
    } else if (/OPR\/|Opera\//i.test(ua)) {
      name = 'Opera';
      version = this.extractVersion(ua, /(?:OPR|Opera)\/([\d.]+)/);
    } else if (/Edg\//i.test(ua)) {
      name = 'Edge';
      version = this.extractVersion(ua, /Edg\/([\d.]+)/);
    } else if (/Firefox\//i.test(ua)) {
      name = 'Firefox';
      version = this.extractVersion(ua, /Firefox\/([\d.]+)/);
    } else if (/Chrome\//i.test(ua)) {
      name = 'Chrome';
      version = this.extractVersion(ua, /Chrome\/([\d.]+)/);
    } else if (/Safari\//i.test(ua)) {
      name = 'Safari';
      version = this.extractVersion(ua, /Version\/([\d.]+)/);
    }

    return {
      name,
      version,
      isChrome: name === 'Chrome',
      isFirefox: name === 'Firefox',
      isSafari: name === 'Safari',
      isEdge: name === 'Edge',
      isOpera: name === 'Opera',
    };
  }

  private extractVersion(ua: string, regex: RegExp): string {
    return ua.match(regex)?.[1] ?? '';
  }
}
