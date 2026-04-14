import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { CameraOverlayComponent } from './camera-overlay.component';
import { CameraErrorCode, CameraState } from '../models/camera-state.model';
import { FootCapture, FootSide } from '../models/foot-capture.model';
import { detectDeviceInfo } from '../device-info.util';

@Component({
  selector: 'app-camera-capture',
  standalone: true,
  imports: [CommonModule, CameraOverlayComponent],
  templateUrl: './camera-capture.component.html',
  styleUrl: './camera-capture.component.css',
})
export class CameraCaptureComponent implements AfterViewInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private mediaStream: MediaStream | null = null;

  @ViewChild('videoElement') private readonly videoElement?: ElementRef<HTMLVideoElement>;
  @ViewChild('captureCanvas') private readonly captureCanvas?: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) footSide: FootSide = 'left';
  @Output() captureCreated = new EventEmitter<FootCapture>();

  readonly cameraState = signal<CameraState>({
    status: 'idle',
    streamActive: false,
    hasPermission: false,
    preferredFacingMode: 'environment',
    orientation: this.getOrientation(),
  });

  readonly previewBase64 = signal<string | null>(null);
  readonly previewMessage = signal('Alinea el pie y la tarjeta dentro de la guia antes de capturar.');

  async ngAfterViewInit(): Promise<void> {
    if (this.isBrowser()) {
      await this.startCamera();
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.cameraState.update((state) => ({
      ...state,
      orientation: this.getOrientation(),
    }));
  }

  async startCamera(): Promise<void> {
    if (!this.isBrowser()) {
      return;
    }

    if (!window.isSecureContext && location.hostname !== 'localhost') {
      this.setError(
        'unsupported-browser',
        'La camara solo funciona en conexiones HTTPS o en localhost.',
      );
      return;
    }

    if (!('mediaDevices' in navigator)) {
      this.setError('missing-media-devices');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      this.setError('missing-get-user-media');
      return;
    }

    this.cameraState.set({
      ...this.cameraState(),
      status: 'requestingPermission',
      errorCode: undefined,
      errorMessage: undefined,
    });

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      const video = this.videoElement?.nativeElement;
      if (!video) {
        this.setError('unexpected-error', 'No se pudo preparar el visor de la camara.');
        return;
      }

      video.srcObject = this.mediaStream;
      await video.play();

      this.cameraState.set({
        status: 'cameraReady',
        streamActive: true,
        hasPermission: true,
        preferredFacingMode: 'environment',
        orientation: this.getOrientation(),
      });
    } catch (error) {
      this.handleCameraError(error);
    }
  }

  stopCamera(): void {
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    this.mediaStream = null;

    const video = this.videoElement?.nativeElement;
    if (video) {
      video.srcObject = null;
    }

    this.cameraState.update((state) => ({
      ...state,
      status: 'idle',
      streamActive: false,
    }));
  }

  async capturePhoto(): Promise<void> {
    const video = this.videoElement?.nativeElement;
    const canvas = this.captureCanvas?.nativeElement;

    if (!video || !canvas) {
      this.setError('unexpected-error', 'No fue posible capturar la imagen.');
      return;
    }

    this.cameraState.update((state) => ({
      ...state,
      status: 'capturing',
    }));

    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      this.setError('unexpected-error', 'No fue posible preparar el canvas para la captura.');
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      this.setError('unexpected-error', 'No fue posible generar la foto capturada.');
      return;
    }

    const imageBase64 = await this.readBlobAsDataUrl(blob);
    this.previewBase64.set(imageBase64);
    this.previewMessage.set(
      'Revisa que el talon, la punta del dedo mas largo y la tarjeta se vean completos.',
    );

    const deviceInfo = detectDeviceInfo();
    const capture: FootCapture = {
      footSide: this.footSide,
      imageBase64,
      imageBlob: blob,
      fileName: `${this.footSide}-foot-${Date.now()}.jpg`,
      mimeType: blob.type || 'image/jpeg',
      previewUrl: imageBase64,
      timestamp: new Date().toISOString(),
      width,
      height,
      referenceType: 'card_id1',
      captureQualityHint: width >= 1280 ? 'high' : 'medium',
      userAgent: deviceInfo.userAgent,
      deviceType: deviceInfo.deviceType,
      platform: deviceInfo.platform,
      browser: deviceInfo.browser,
      deviceInfo,
    };

    this.cameraState.update((state) => ({
      ...state,
      status: 'captured',
    }));
    this.captureCreated.emit(capture);
  }

  restartCamera(): void {
    this.previewBase64.set(null);
    this.previewMessage.set('Alinea el pie y la tarjeta dentro de la guia antes de capturar.');
    this.stopCamera();
    void this.startCamera();
  }

  private handleCameraError(error: unknown): void {
    const domException = error as DOMException | undefined;

    switch (domException?.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        this.setError('permission-denied');
        break;
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        this.setError('camera-not-found');
        break;
      case 'NotReadableError':
      case 'TrackStartError':
        this.setError('camera-in-use');
        break;
      default:
        this.setError('unexpected-error');
        break;
    }
  }

  private setError(errorCode: CameraErrorCode, customMessage?: string): void {
    this.cameraState.set({
      status: 'error',
      streamActive: false,
      hasPermission: false,
      preferredFacingMode: 'environment',
      orientation: this.getOrientation(),
      errorCode,
      errorMessage: customMessage ?? this.getErrorMessage(errorCode),
    });
  }

  private getErrorMessage(errorCode: CameraErrorCode): string {
    switch (errorCode) {
      case 'unsupported-browser':
        return 'Este navegador no soporta la captura requerida para la medicion.';
      case 'missing-media-devices':
        return 'navigator.mediaDevices no esta disponible en este dispositivo.';
      case 'missing-get-user-media':
        return 'getUserMedia no esta disponible en este navegador.';
      case 'permission-denied':
        return 'Se rechazo el permiso de camara. Habilitalo e intenta de nuevo.';
      case 'camera-not-found':
        return 'No se encontro una camara disponible en este dispositivo.';
      case 'camera-in-use':
        return 'La camara esta siendo usada por otra aplicacion o pestaña.';
      default:
        return 'Ocurrio un error inesperado al iniciar la camara.';
    }
  }

  private getOrientation(): 'portrait' | 'landscape' {
    if (!this.isBrowser()) {
      return 'portrait';
    }

    return window.innerHeight >= window.innerWidth ? 'portrait' : 'landscape';
  }

  private readBlobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('No fue posible leer la imagen capturada.'));
      reader.readAsDataURL(blob);
    });
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
