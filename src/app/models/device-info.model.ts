export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export type PlatformName =
  | 'Android'
  | 'iOS'
  | 'Windows'
  | 'macOS'
  | 'Linux'
  | 'Unknown';

export type BrowserName =
  | 'Chrome'
  | 'Safari'
  | 'Firefox'
  | 'Edge'
  | 'Unknown';

export interface DeviceInfo {
  userAgent: string;
  deviceType: DeviceType;
  platform: PlatformName;
  browser: BrowserName;
}
