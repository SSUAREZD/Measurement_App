import { BrowserName, DeviceInfo, DeviceType, PlatformName } from './models/device-info.model';

export function detectDeviceInfo(userAgent: string = globalThis.navigator?.userAgent ?? ''): DeviceInfo {
  return {
    userAgent,
    deviceType: detectDeviceType(userAgent),
    platform: detectPlatform(userAgent),
    browser: detectBrowser(userAgent),
  };
}

function detectDeviceType(userAgent: string): DeviceType {
  const normalizedUserAgent = userAgent.toLowerCase();

  if (/ipad|tablet|playbook|silk/i.test(normalizedUserAgent)) {
    return 'tablet';
  }

  if (
    /android|iphone|ipod|iemobile|blackberry|opera mini|mobile/i.test(
      normalizedUserAgent,
    )
  ) {
    return 'mobile';
  }

  return 'desktop';
}

function detectPlatform(userAgent: string): PlatformName {
  if (/android/i.test(userAgent)) {
    return 'Android';
  }

  if (/iphone|ipad|ipod/i.test(userAgent)) {
    return 'iOS';
  }

  if (/windows/i.test(userAgent)) {
    return 'Windows';
  }

  if (/mac os|macintosh/i.test(userAgent)) {
    return 'macOS';
  }

  if (/linux/i.test(userAgent)) {
    return 'Linux';
  }

  return 'Unknown';
}

function detectBrowser(userAgent: string): BrowserName {
  if (/edg/i.test(userAgent)) {
    return 'Edge';
  }

  if (/firefox/i.test(userAgent)) {
    return 'Firefox';
  }

  if (/chrome|crios/i.test(userAgent) && !/edg/i.test(userAgent)) {
    return 'Chrome';
  }

  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) {
    return 'Safari';
  }

  return 'Unknown';
}
