import { BrowserName, DeviceInfo, DeviceType, PlatformName } from './device-info.model';

export type FootSide = 'left' | 'right';
export type ReferenceType = 'card_id1';

export interface FootCapture {
  footSide: FootSide;
  imageBase64: string;
  imageBlob: Blob;
  fileName: string;
  mimeType: string;
  previewUrl: string;
  timestamp: string;
  width: number;
  height: number;
  referenceType: ReferenceType;
  captureQualityHint?: string;
  userAgent: string;
  deviceType: DeviceType;
  platform: PlatformName;
  browser: BrowserName;
  deviceInfo: DeviceInfo;
}
