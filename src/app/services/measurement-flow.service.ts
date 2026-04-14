import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FootCapture, FootSide } from '../models/foot-capture.model';
import { MeasurementStep, MeasurementStepKey } from '../models/measurement-step.model';

interface StoredMeasurementState {
  currentStepKey: MeasurementStepKey;
  captures: Partial<Record<FootSide, Omit<FootCapture, 'imageBlob'>>>;
}

@Injectable({ providedIn: 'root' })
export class MeasurementFlowService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly storageKey = 'measurement-app.flow-state';

  readonly steps: MeasurementStep[] = [
    { key: 'welcome', title: 'Bienvenido', subtitle: 'Prepara una medicion clara de ambos pies' },
    { key: 'instructions', title: 'Instrucciones', subtitle: 'Antes de usar la camara' },
    { key: 'capture-left', title: 'Pie izquierdo', subtitle: 'Toma la foto del pie izquierdo' },
    { key: 'confirm-left', title: 'Confirmar izquierdo', subtitle: 'Verifica que la captura sea util' },
    { key: 'capture-right', title: 'Pie derecho', subtitle: 'Toma la foto del pie derecho' },
    { key: 'confirm-right', title: 'Confirmar derecho', subtitle: 'Verifica que la captura sea util' },
    { key: 'summary', title: 'Resumen', subtitle: 'Listo para enviar al backend' },
  ];

  readonly currentStepKey = signal<MeasurementStepKey>('welcome');
  readonly leftCapture = signal<FootCapture | null>(null);
  readonly rightCapture = signal<FootCapture | null>(null);
  readonly currentStepIndex = computed(() =>
    this.steps.findIndex((step) => step.key === this.currentStepKey()),
  );
  readonly currentStep = computed(() => this.steps[this.currentStepIndex()] ?? this.steps[0]);
  readonly progressValue = computed(() => ((this.currentStepIndex() + 1) / this.steps.length) * 100);
  readonly hasBothCaptures = computed(() => Boolean(this.leftCapture() && this.rightCapture()));

  constructor() {
    this.restore();
  }

  setStep(stepKey: MeasurementStepKey): void {
    this.currentStepKey.set(stepKey);
    this.persist();
  }

  goBack(): void {
    const previousIndex = Math.max(this.currentStepIndex() - 1, 0);
    this.currentStepKey.set(this.steps[previousIndex].key);
    this.persist();
  }

  saveCapture(capture: FootCapture): void {
    if (capture.footSide === 'left') {
      this.leftCapture.set(capture);
      this.currentStepKey.set('confirm-left');
    } else {
      this.rightCapture.set(capture);
      this.currentStepKey.set('confirm-right');
    }

    this.persist();
  }

  clearCapture(footSide: FootSide): void {
    if (footSide === 'left') {
      this.leftCapture.set(null);
      this.currentStepKey.set('capture-left');
    } else {
      this.rightCapture.set(null);
      this.currentStepKey.set('capture-right');
    }

    this.persist();
  }

  continueAfterConfirmation(footSide: FootSide): void {
    this.currentStepKey.set(footSide === 'left' ? 'capture-right' : 'summary');
    this.persist();
  }

  buildRequestPayload() {
    return {
      referenceType: 'card_id1' as const,
      referenceDimensionsMm: {
        width: 85.6,
        height: 53.98,
      },
      captures: [this.leftCapture(), this.rightCapture()].filter(
        (capture): capture is FootCapture => Boolean(capture),
      ),
    };
  }

  reset(): void {
    this.currentStepKey.set('welcome');
    this.leftCapture.set(null);
    this.rightCapture.set(null);

    if (this.isBrowser()) {
      localStorage.removeItem(this.storageKey);
    }
  }

  private persist(): void {
    if (!this.isBrowser()) {
      return;
    }

    const state: StoredMeasurementState = {
      currentStepKey: this.currentStepKey(),
      captures: {
        left: this.serializeCapture(this.leftCapture()),
        right: this.serializeCapture(this.rightCapture()),
      },
    };

    localStorage.setItem(this.storageKey, JSON.stringify(state));
  }

  private restore(): void {
    if (!this.isBrowser()) {
      return;
    }

    const rawState = localStorage.getItem(this.storageKey);
    if (!rawState) {
      return;
    }

    try {
      const parsedState = JSON.parse(rawState) as StoredMeasurementState;
      this.currentStepKey.set(parsedState.currentStepKey ?? 'welcome');
      this.leftCapture.set(this.deserializeCapture(parsedState.captures.left));
      this.rightCapture.set(this.deserializeCapture(parsedState.captures.right));
    } catch {
      localStorage.removeItem(this.storageKey);
    }
  }

  private serializeCapture(capture: FootCapture | null): Omit<FootCapture, 'imageBlob'> | undefined {
    if (!capture) {
      return undefined;
    }

    const { imageBlob, ...serializableCapture } = capture;
    return serializableCapture;
  }

  private deserializeCapture(capture?: Omit<FootCapture, 'imageBlob'>): FootCapture | null {
    if (!capture) {
      return null;
    }

    return {
      ...capture,
      imageBlob: this.base64ToBlob(capture.imageBase64, capture.mimeType),
    };
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const content = base64.split(',')[1] ?? '';
    const byteCharacters = atob(content);
    const byteNumbers = new Array(byteCharacters.length)
      .fill(0)
      .map((_, index) => byteCharacters.charCodeAt(index));

    return new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  }

  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }
}
