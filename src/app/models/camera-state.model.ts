export type UiStatus =
  | 'idle'
  | 'requestingPermission'
  | 'cameraReady'
  | 'capturing'
  | 'captured'
  | 'error'
  | 'submitting'
  | 'submitted';

export type CameraErrorCode =
  | 'unsupported-browser'
  | 'missing-media-devices'
  | 'missing-get-user-media'
  | 'permission-denied'
  | 'camera-not-found'
  | 'camera-in-use'
  | 'unexpected-error';

export interface CameraState {
  status: UiStatus;
  streamActive: boolean;
  hasPermission: boolean;
  preferredFacingMode: 'environment';
  orientation: 'portrait' | 'landscape';
  errorCode?: CameraErrorCode;
  errorMessage?: string;
}
