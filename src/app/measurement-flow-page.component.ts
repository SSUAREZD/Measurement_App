import { Component, DestroyRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CameraCaptureComponent } from './components/camera-capture.component';
import { InstructionListComponent } from './components/instruction-list.component';
import { StepProgressComponent } from './components/step-progress.component';
import { MeasurementApiService } from './services/measurement-api.service';
import { MeasurementFlowService } from './services/measurement-flow.service';
import { FootCapture, FootSide } from './models/foot-capture.model';

@Component({
  selector: 'app-measurement-flow-page',
  standalone: true,
  imports: [
    CommonModule,
    StepProgressComponent,
    InstructionListComponent,
    CameraCaptureComponent,
  ],
  template: `
    <main class="dashboard-shell">
      <div class="dashboard-backdrop" aria-hidden="true"></div>

      @if (isSidebarOpen()) {
        <button
          type="button"
          class="sidebar-scrim"
          aria-label="Cerrar menu lateral"
          (click)="closeSidebar()"
        ></button>
      }

      <aside class="sidebar glass-panel" [class.sidebar--open]="isSidebarOpen()">
        <div class="brand-block">
          <div class="brand-mark">T</div>
          <div>
            <p class="brand-kicker">Measurement AI</p>
            <h2 class="brand-title">Thoth-style Capture</h2>
          </div>
        </div>

        <section class="side-section">
          <p class="side-label">Flujo</p>
          <nav class="step-nav">
            @for (step of flow.steps; track step.key; let index = $index) {
              <button
                type="button"
                class="step-nav__item"
                [class.step-nav__item--active]="step.key === flow.currentStep().key"
                [class.step-nav__item--done]="index < flow.currentStepIndex()"
                (click)="goToStep(step.key)"
              >
                <span class="step-nav__index">{{ index + 1 }}</span>
                <span class="step-nav__copy">
                  <strong>{{ step.title }}</strong>
                  <small>{{ step.subtitle }}</small>
                </span>
              </button>
            }
          </nav>
        </section>

        <section class="assistant-card">
          <div class="assistant-orb"></div>
          <div>
            <p class="assistant-title">Guia inteligente</p>
            <p class="assistant-copy">
              Mantiene un flujo claro, guarda tu progreso y prepara cada captura para analisis futuro.
            </p>
          </div>
        </section>
      </aside>

      <section class="workspace">
        <header class="topbar glass-panel">
          <div class="topbar__left">
            <button type="button" class="icon-button mobile-only" (click)="toggleSidebar()">
              <span></span>
              <span></span>
              <span></span>
            </button>

            <div>
              <p class="topbar__eyebrow">Dashboard futurista</p>
              <h1 class="topbar__title">{{ flow.currentStep().title }}</h1>
            </div>
          </div>

          <div class="topbar__right">
            <div class="status-pill">
              <span class="status-pill__dot"></span>
              Flujo activo
            </div>

          </div>
        </header>

        <section class="hero-band glass-panel">
          <div class="hero-band__content">
            <p class="hero-band__eyebrow">MVP frontend</p>
            <h2 class="hero-band__title">Captura precisa con atmosfera tipo Thoth</h2>
            <p class="hero-band__copy">
              Medicion guiada de ambos pies con camara, referencia ID-1 y una interfaz tecnica, elegante y calida.
            </p>
          </div>

          <div class="hero-band__meta">
            <div>
              <strong>{{ flow.currentStepIndex() + 1 }}/{{ flow.steps.length }}</strong>
              <span>pasos completando el flujo</span>
            </div>
            <div>
              <strong>{{ flow.hasBothCaptures() ? '2/2' : 'en curso' }}</strong>
              <span>capturas preparadas</span>
            </div>
          </div>
        </section>

        <app-step-progress
          [steps]="flow.steps"
          [currentStepIndex]="flow.currentStepIndex()"
          [progressValue]="flow.progressValue()"
        />

        <section class="main-panel glass-panel">
          @switch (flow.currentStep().key) {
            @case ('welcome') {
              <div class="content-grid">
                <section class="panel panel--hero">
                  <div class="panel__badge">Onboarding</div>
                  <h2>Medicion guiada con camara</h2>
                  <p>
                    Esta app captura el pie izquierdo y derecho usando la camara del celular y una tarjeta
                    estandar ID-1 como referencia visual. El analisis final quedara listo para conectarse
                    despues a un backend.
                  </p>

                  <div class="pill-row">
                    <span>Solo frontend</span>
                    <span>Optimizada para movil</span>
                    <span>Lista para backend</span>
                  </div>

                  <div class="action-row">
                    <button type="button" class="primary-button" (click)="goToInstructions()">
                      Ver instrucciones
                    </button>
                    <button type="button" class="secondary-button" (click)="startMeasurement()">
                      Ir directo a capturar
                    </button>
                  </div>
                </section>

                <app-instruction-list
                  [items]="preparationInstructions"
                  title="Antes de empezar"
                />
              </div>
            }

            @case ('instructions') {
              <div class="content-grid">
                <app-instruction-list
                  [items]="captureInstructions"
                  title="Como tomar una foto util"
                />

                <section class="panel panel--accent">
                  <div class="panel__badge">Sistema</div>
                  <h2>Que valida el frontend</h2>
                  <p>
                    La app te guia, muestra vista previa, controla permisos de camara y evita avanzar sin
                    foto. El analisis automatico y la talla final vendran luego desde el backend.
                  </p>

                  <div class="info-stack">
                    <article>
                      <strong>Referencia</strong>
                      <span>Tarjeta ID-1, 85.60 mm x 53.98 mm.</span>
                    </article>
                    <article>
                      <strong>Modo de captura</strong>
                      <span>Preferencia por camara trasera con facingMode environment.</span>
                    </article>
                    <article>
                      <strong>Persistencia</strong>
                      <span>Las capturas se guardan temporalmente en el navegador para reanudar el flujo.</span>
                    </article>
                  </div>

                  <div class="action-row">
                    <button type="button" class="secondary-button" (click)="flow.goBack()">
                      Volver
                    </button>
                    <button type="button" class="primary-button" (click)="startMeasurement()">
                      Empezar con pie izquierdo
                    </button>
                  </div>
                </section>
              </div>
            }

            @case ('capture-left') {
              <div class="content-grid content-grid--camera">
                <section class="panel">
                  <div class="panel__badge">Captura</div>
                  <h2>Pie izquierdo</h2>
                  <p>
                    Manten el pie completo dentro del marco y la tarjeta al costado. No avances hasta ver
                    una foto clara.
                  </p>

                  <app-instruction-list
                    [items]="captureInstructions"
                    title="Checklist rapida"
                  />
                </section>

                <app-camera-capture footSide="left" (captureCreated)="onCaptureCreated($event)" />
              </div>
            }

            @case ('confirm-left') {
              <div class="content-grid">
                <section class="panel">
                  <div class="panel__badge">Revision</div>
                  <h2>Confirmar pie izquierdo</h2>
                  <p>
                    Revisa la captura. Si el pie o la tarjeta no estan completos, repitela antes de continuar.
                  </p>

                  <div class="capture-meta">
                    <span>Estado: {{ flow.leftCapture() ? 'capturado' : 'pendiente' }}</span>
                    <span>Referencia: tarjeta ID-1</span>
                  </div>

                  <div class="action-row">
                    <button type="button" class="secondary-button" (click)="onRetake('left')">
                      Repetir captura
                    </button>
                    <button
                      type="button"
                      class="primary-button"
                      [disabled]="!flow.leftCapture()"
                      (click)="onContinueFromConfirmation('left')"
                    >
                      Continuar con pie derecho
                    </button>
                  </div>
                </section>

                <section class="preview-card">
                  @if (flow.leftCapture(); as capture) {
                    <img [src]="capture.previewUrl" alt="Vista previa del pie izquierdo" />
                    <div class="preview-copy">
                      <strong>Resolucion</strong>
                      <span>{{ capture.width }} x {{ capture.height }}</span>
                    </div>
                  }
                </section>
              </div>
            }

            @case ('capture-right') {
              <div class="content-grid content-grid--camera">
                <section class="panel">
                  <div class="panel__badge">Captura</div>
                  <h2>Pie derecho</h2>
                  <p>
                    Repite la toma desde arriba, con la misma referencia visual y buena iluminacion.
                  </p>

                  <app-instruction-list
                    [items]="captureInstructions"
                    title="Checklist rapida"
                  />
                </section>

                <app-camera-capture footSide="right" (captureCreated)="onCaptureCreated($event)" />
              </div>
            }

            @case ('confirm-right') {
              <div class="content-grid">
                <section class="panel">
                  <div class="panel__badge">Revision</div>
                  <h2>Confirmar pie derecho</h2>
                  <p>
                    Si todo se ve claro, pasamos al resumen final con ambas imagenes listas para enviar.
                  </p>

                  <div class="capture-meta">
                    <span>Estado: {{ flow.rightCapture() ? 'capturado' : 'pendiente' }}</span>
                    <span>Referencia: tarjeta ID-1</span>
                  </div>

                  <div class="action-row">
                    <button type="button" class="secondary-button" (click)="onRetake('right')">
                      Repetir captura
                    </button>
                    <button
                      type="button"
                      class="primary-button"
                      [disabled]="!flow.rightCapture()"
                      (click)="onContinueFromConfirmation('right')"
                    >
                      Ir al resumen
                    </button>
                  </div>
                </section>

                <section class="preview-card">
                  @if (flow.rightCapture(); as capture) {
                    <img [src]="capture.previewUrl" alt="Vista previa del pie derecho" />
                    <div class="preview-copy">
                      <strong>Resolucion</strong>
                      <span>{{ capture.width }} x {{ capture.height }}</span>
                    </div>
                  }
                </section>
              </div>
            }

            @case ('summary') {
              <div class="content-grid">
                <section class="panel">
                  <div class="panel__badge">Resumen</div>
                  <h2>Resumen final</h2>
                  <p>
                    Ambas capturas quedan listas para enviar al backend futuro. Desde aqui puedes reenviar,
                    repetir una toma o reiniciar el flujo.
                  </p>

                  <div class="summary-status">
                    @for (item of summaryChecklist; track item) {
                      <div class="summary-chip" [class.summary-chip--done]="flow.hasBothCaptures()">
                        {{ item }}
                      </div>
                    }
                  </div>

                  <div
                    class="submission-box"
                    [class.submission-box--error]="submissionState() === 'error'"
                    [class.submission-box--success]="submissionState() === 'submitted'"
                  >
                    <p>{{ submissionMessage() }}</p>
                  </div>

                  <div class="action-row action-row--wrap">
                    <button type="button" class="secondary-button" (click)="goToCapture('left')">
                      Repetir izquierdo
                    </button>
                    <button type="button" class="secondary-button" (click)="goToCapture('right')">
                      Repetir derecho
                    </button>
                    <button
                      type="button"
                      class="primary-button"
                      [disabled]="!flow.hasBothCaptures() || submissionState() === 'submitting'"
                      (click)="submitCaptures()"
                    >
                      @if (submissionState() === 'submitting') {
                        Enviando...
                      } @else {
                        Enviar al backend
                      }
                    </button>
                    <button type="button" class="ghost-button" (click)="restartFlow()">
                      Reiniciar flujo
                    </button>
                  </div>
                </section>

                <section class="summary-preview-grid">
                  <article class="preview-card">
                    <header>
                      <h3>Pie izquierdo</h3>
                      <button type="button" class="link-button" (click)="goToCapture('left')">
                        Repetir
                      </button>
                    </header>

                    @if (getCaptureFor('left'); as leftCapture) {
                      <img [src]="leftCapture.previewUrl" alt="Miniatura del pie izquierdo" />
                      <p class="preview-status">Captura lista</p>
                    } @else {
                      <p class="preview-empty">Pendiente de captura</p>
                    }
                  </article>

                  <article class="preview-card">
                    <header>
                      <h3>Pie derecho</h3>
                      <button type="button" class="link-button" (click)="goToCapture('right')">
                        Repetir
                      </button>
                    </header>

                    @if (getCaptureFor('right'); as rightCapture) {
                      <img [src]="rightCapture.previewUrl" alt="Miniatura del pie derecho" />
                      <p class="preview-status">Captura lista</p>
                    } @else {
                      <p class="preview-empty">Pendiente de captura</p>
                    }
                  </article>
                </section>
              </div>
            }
          }
        </section>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
    }

    .dashboard-shell {
      --shell-background: var(--bg-base);
      --shell-surface: var(--surface);
      --shell-surface-strong: var(--surface-strong);
      --shell-border: var(--border-soft);
      --shell-text: var(--text-primary);
      --shell-muted: var(--text-muted);
      --shell-shadow: var(--shadow-soft);
      --text-primary: var(--shell-text);
      --text-secondary: #cbd5e1;
      --text-muted: var(--shell-muted);
      --surface: var(--shell-surface);
      --surface-strong: var(--shell-surface-strong);
      --border-soft: var(--shell-border);
      --shadow-soft: var(--shell-shadow);
      min-height: 100dvh;
      display: grid;
      grid-template-columns: 18.5rem minmax(0, 1fr);
      gap: 1.25rem;
      padding: 1.25rem;
      background: var(--shell-background);
      color: var(--shell-text);
      position: relative;
      overflow: hidden;
    }

    .dashboard-backdrop {
      position: fixed;
      inset: 0;
      background:
        radial-gradient(circle at 16% 18%, rgba(124, 58, 237, 0.26), transparent 24%),
        radial-gradient(circle at 88% 12%, rgba(37, 99, 235, 0.22), transparent 26%),
        radial-gradient(circle at 62% 82%, rgba(96, 165, 250, 0.12), transparent 28%);
      pointer-events: none;
    }

    .glass-panel {
      background: var(--shell-surface);
      border: 1px solid var(--shell-border);
      box-shadow: var(--shell-shadow);
      backdrop-filter: blur(22px);
    }

    .sidebar {
      position: sticky;
      top: 1.25rem;
      display: grid;
      align-content: start;
      gap: 1.25rem;
      min-height: calc(100dvh - 2.5rem);
      padding: 1.2rem;
      border-radius: 1.5rem;
      z-index: 3;
    }

    .brand-block {
      display: flex;
      align-items: center;
      gap: 0.95rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.12);
    }

    .brand-mark {
      width: 3rem;
      height: 3rem;
      display: grid;
      place-items: center;
      border-radius: 1rem;
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.95), rgba(37, 99, 235, 0.85));
      color: white;
      font-weight: 800;
      font-size: 1.1rem;
      box-shadow: 0 18px 32px rgba(37, 99, 235, 0.24);
    }

    .brand-kicker,
    .side-label,
    .topbar__eyebrow,
    .hero-band__eyebrow {
      margin: 0;
      color: var(--shell-muted);
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.74rem;
    }

    .brand-title,
    .topbar__title,
    .hero-band__title,
    h2,
    h3,
    p {
      margin: 0;
    }

    .brand-title {
      font-size: 1rem;
      line-height: 1.2;
    }

    .side-section {
      display: grid;
      gap: 0.85rem;
    }

    .step-nav {
      display: grid;
      gap: 0.55rem;
    }

    .step-nav__item {
      display: grid;
      grid-template-columns: 2.25rem minmax(0, 1fr);
      gap: 0.8rem;
      align-items: center;
      padding: 0.8rem;
      border-radius: 1rem;
      border: 1px solid transparent;
      background: rgba(15, 23, 42, 0.24);
      color: var(--shell-text);
      cursor: pointer;
      transition: transform 180ms ease, border-color 180ms ease, background 180ms ease;
      text-align: left;
    }

    .step-nav__item:hover {
      transform: translateY(-1px);
      border-color: rgba(124, 58, 237, 0.28);
      background: rgba(124, 58, 237, 0.12);
    }

    .step-nav__item--done {
      background: rgba(34, 197, 94, 0.1);
    }

    .step-nav__item--active {
      background: linear-gradient(135deg, rgba(124, 58, 237, 0.18), rgba(37, 99, 235, 0.14));
      border-color: rgba(124, 58, 237, 0.34);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }

    .step-nav__index {
      width: 2.25rem;
      height: 2.25rem;
      display: grid;
      place-items: center;
      border-radius: 0.8rem;
      background: rgba(148, 163, 184, 0.12);
      color: var(--shell-text);
      font-weight: 700;
      font-size: 0.9rem;
    }

    .step-nav__copy {
      display: grid;
      gap: 0.15rem;
      min-width: 0;
    }

    .step-nav__copy strong {
      font-size: 0.92rem;
      font-weight: 650;
    }

    .step-nav__copy small {
      color: var(--shell-muted);
      font-size: 0.75rem;
      line-height: 1.35;
    }

    .assistant-card {
      display: grid;
      gap: 0.9rem;
      padding: 1rem;
      border-radius: 1.25rem;
      background:
        radial-gradient(circle at top left, rgba(124, 58, 237, 0.18), transparent 50%),
        rgba(15, 23, 42, 0.48);
      border: 1px solid rgba(148, 163, 184, 0.12);
    }

    .assistant-orb {
      width: 4.5rem;
      height: 4.5rem;
      border-radius: 50%;
      background:
        radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.92), rgba(124, 58, 237, 0.8) 35%, rgba(37, 99, 235, 0.4) 70%, transparent 75%);
      box-shadow: 0 0 44px rgba(124, 58, 237, 0.28);
    }

    .assistant-title {
      font-weight: 700;
      margin-bottom: 0.35rem;
    }

    .assistant-copy {
      color: var(--shell-muted);
      line-height: 1.5;
      font-size: 0.9rem;
    }

    .workspace {
      display: grid;
      align-content: start;
      gap: 1rem;
      min-width: 0;
      position: relative;
      z-index: 1;
    }

    .topbar {
      position: sticky;
      top: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.1rem;
      border-radius: 1.4rem;
      z-index: 2;
    }

    .topbar__left,
    .topbar__right {
      display: flex;
      align-items: center;
      gap: 0.9rem;
    }

    .topbar__title {
      font-size: clamp(1.15rem, 1.8vw, 1.55rem);
      line-height: 1.05;
      letter-spacing: -0.04em;
      color: var(--shell-text);
    }

    .status-pill,
    .capture-meta span,
    .pill-row span,
    .summary-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      min-height: 2.5rem;
      padding: 0 0.95rem;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.14);
      background: rgba(15, 23, 42, 0.34);
      color: var(--shell-text);
    }

    .status-pill__dot {
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 14px rgba(34, 197, 94, 0.6);
    }

    .hero-band {
      display: grid;
      grid-template-columns: minmax(0, 1.35fr) minmax(16rem, 0.72fr);
      gap: 1.1rem;
      align-items: stretch;
      padding: 1.15rem 1.2rem;
      border-radius: 1.45rem;
    }

    .hero-band__content {
      min-width: 0;
    }

    .hero-band__title {
      margin-top: 0.35rem;
      max-width: 14ch;
      font-size: clamp(1.7rem, 3vw, 2.45rem);
      line-height: 1.04;
      letter-spacing: -0.04em;
      color: var(--shell-text);
    }

    .hero-band__copy {
      margin-top: 0.7rem;
      max-width: 42rem;
      color: var(--shell-muted);
      line-height: 1.55;
      font-size: 0.96rem;
    }

    .hero-band__meta {
      display: grid;
      gap: 0.8rem;
      align-content: center;
      padding: 0.95rem 1rem;
      border-radius: 1.2rem;
      background: rgba(148, 163, 184, 0.06);
      border: 1px solid rgba(148, 163, 184, 0.12);
    }

    .hero-band__meta div {
      display: grid;
      gap: 0.15rem;
    }

    .hero-band__meta strong {
      font-size: 1.05rem;
      color: var(--shell-text);
    }

    .hero-band__meta span {
      color: var(--shell-muted);
      font-size: 0.8rem;
    }

    .main-panel {
      display: grid;
      gap: 1.2rem;
      padding: 1.2rem;
      border-radius: 1.55rem;
    }

    .content-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
      gap: 1rem;
      align-items: start;
    }

    .content-grid--camera {
      grid-template-columns: minmax(18rem, 0.9fr) minmax(0, 1.1fr);
    }

    .panel,
    .preview-card {
      display: grid;
      gap: 1rem;
      padding: 1.2rem;
      border-radius: 1.4rem;
      background: var(--shell-surface-strong);
      border: 1px solid var(--shell-border);
      box-shadow: var(--shell-shadow);
    }

    .panel--hero {
      background:
        radial-gradient(circle at top left, rgba(124, 58, 237, 0.18), transparent 38%),
        linear-gradient(180deg, rgba(14, 23, 39, 0.88), rgba(12, 19, 33, 0.76));
    }

    .panel--accent {
      background:
        radial-gradient(circle at top right, rgba(37, 99, 235, 0.18), transparent 34%),
        linear-gradient(180deg, rgba(16, 26, 45, 0.88), rgba(12, 19, 33, 0.76));
    }

    .panel__badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: fit-content;
      min-height: 1.95rem;
      padding: 0 0.7rem;
      border-radius: 999px;
      border: 1px solid rgba(124, 58, 237, 0.24);
      background: rgba(124, 58, 237, 0.12);
      color: #c4b5fd;
      font-size: 0.76rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
    }

    h2 {
      font-size: clamp(1.2rem, 2.6vw, 1.7rem);
      letter-spacing: -0.03em;
      color: var(--shell-text);
      line-height: 1.08;
    }

    h3 {
      color: var(--shell-text);
      font-size: 1rem;
    }

    .panel p,
    .preview-copy,
    .preview-status,
    .preview-empty,
    .submission-box p {
      color: var(--shell-muted);
      line-height: 1.6;
    }

    .pill-row,
    .capture-meta,
    .summary-status,
    .action-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .summary-chip--done {
      border-color: rgba(34, 197, 94, 0.24);
      background: rgba(34, 197, 94, 0.12);
      color: #86efac;
    }

    .info-stack,
    .summary-preview-grid {
      display: grid;
      gap: 1rem;
    }

    .info-stack article {
      display: grid;
      gap: 0.3rem;
      padding: 0.95rem 1rem;
      border-radius: 1.05rem;
      background: rgba(148, 163, 184, 0.06);
      border: 1px solid rgba(148, 163, 184, 0.1);
    }

    .info-stack strong {
      color: var(--shell-text);
    }

    .info-stack span {
      color: var(--shell-muted);
      line-height: 1.5;
    }

    .primary-button,
    .secondary-button,
    .ghost-button,
    .link-button,
    .icon-button {
      font: inherit;
      cursor: pointer;
      transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, background 180ms ease;
    }

    .primary-button,
    .secondary-button,
    .ghost-button {
      min-height: 3.2rem;
      padding: 0 1.1rem;
      border-radius: 1rem;
      border: 1px solid transparent;
      font-weight: 700;
    }

    .primary-button {
      background: linear-gradient(135deg, #7c3aed, #2563eb);
      color: #f8fafc;
      box-shadow: 0 16px 34px rgba(96, 76, 255, 0.28);
    }

    .primary-button:hover:not(:disabled),
    .secondary-button:hover,
    .ghost-button:hover,
    .icon-button:hover {
      transform: translateY(-1px);
    }

    .primary-button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
      box-shadow: none;
    }

    .secondary-button,
    .ghost-button,
    .icon-button {
      background: rgba(148, 163, 184, 0.08);
      color: var(--shell-text);
      border: 1px solid rgba(148, 163, 184, 0.14);
    }

    .ghost-button {
      color: var(--shell-muted);
    }

    .preview-card img {
      width: 100%;
      aspect-ratio: 4 / 5;
      object-fit: cover;
      border-radius: 1.2rem;
      border: 1px solid rgba(148, 163, 184, 0.1);
    }

    .preview-copy {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      color: var(--shell-text);
    }

    .summary-preview-grid .preview-card header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .link-button {
      padding: 0;
      border: 0;
      background: none;
      color: #a78bfa;
      font-weight: 700;
    }

    .submission-box {
      padding: 1rem;
      border-radius: 1.1rem;
      border: 1px solid rgba(148, 163, 184, 0.12);
      background: rgba(15, 23, 42, 0.32);
    }

    .submission-box--error {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.2);
    }

    .submission-box--success {
      background: rgba(34, 197, 94, 0.1);
      border-color: rgba(34, 197, 94, 0.18);
    }

    .icon-button {
      width: 2.9rem;
      height: 2.9rem;
      display: none;
      place-items: center;
      gap: 0.22rem;
      border-radius: 0.95rem;
    }

    .icon-button span {
      display: block;
      width: 1.1rem;
      height: 2px;
      border-radius: 999px;
      background: currentColor;
    }

    .sidebar-scrim {
      position: fixed;
      inset: 0;
      z-index: 2;
      border: 0;
      background: rgba(3, 7, 18, 0.58);
      backdrop-filter: blur(4px);
    }

    @media (max-width: 1100px) {
      .dashboard-shell {
        grid-template-columns: 1fr;
      }

      .sidebar {
        position: fixed;
        top: 0.9rem;
        left: 0.9rem;
        bottom: 0.9rem;
        width: min(21rem, calc(100vw - 1.8rem));
        min-height: auto;
        transform: translateX(calc(-100% - 1.2rem));
        transition: transform 220ms ease;
      }

      .sidebar--open {
        transform: translateX(0);
      }

      .icon-button.mobile-only {
        display: inline-grid;
      }
    }

    @media (max-width: 900px) {
      .hero-band,
      .content-grid,
      .content-grid--camera {
        grid-template-columns: 1fr;
      }

      .hero-band {
        padding: 1rem;
      }

      .hero-band__title {
        max-width: none;
      }
    }

    @media (max-width: 680px) {
      .dashboard-shell {
        padding: 0.8rem;
      }

      .topbar,
      .topbar__left,
      .topbar__right {
        align-items: flex-start;
      }

      .topbar,
      .topbar__left,
      .topbar__right,
      .action-row {
        flex-direction: column;
      }

      .hero-band__copy {
        font-size: 0.92rem;
      }
    }
  `],
})
export class MeasurementFlowPageComponent {
  private readonly apiService = inject(MeasurementApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly flow = inject(MeasurementFlowService);
  readonly submissionState = signal<'idle' | 'submitting' | 'submitted' | 'error'>('idle');
  readonly isSidebarOpen = signal(false);
  readonly submissionMessage = signal(
    'Todavia no se han enviado las imagenes. Cuando quieras, podemos enviarlas al backend.',
  );

  readonly captureInstructions = [
    'Coloca el pie completo dentro del encuadre.',
    'Coloca la tarjeta al lado del pie.',
    'Usa buena iluminacion y evita sombras fuertes.',
    'Toma la foto desde arriba y evita inclinar demasiado la camara.',
    'Asegurate de que el talon y la punta del dedo mas largo se vean completos.',
  ];

  readonly preparationInstructions = [
    'Ubica el celular en una posicion estable y a buena altura.',
    'Quita medias o elementos que cubran la silueta del pie.',
    'Usa una superficie plana y un fondo que contraste con tu piel.',
    'Ten lista una tarjeta estandar ID-1 de 85.60 mm x 53.98 mm.',
    'Haz una foto para cada pie por separado.',
  ];

  readonly summaryChecklist = [
    'Pie izquierdo capturado',
    'Pie derecho capturado',
    'Referencia visual lista para analisis',
    'Payload preparado para backend',
  ];

  onCaptureCreated(capture: FootCapture): void {
    this.flow.saveCapture(capture);
    this.isSidebarOpen.set(false);
  }

  onContinueFromConfirmation(footSide: FootSide): void {
    this.flow.continueAfterConfirmation(footSide);
  }

  onRetake(footSide: FootSide): void {
    this.flow.clearCapture(footSide);
  }

  goToInstructions(): void {
    this.flow.setStep('instructions');
    this.isSidebarOpen.set(false);
  }

  startMeasurement(): void {
    this.flow.setStep('capture-left');
    this.isSidebarOpen.set(false);
  }

  restartFlow(): void {
    this.submissionState.set('idle');
    this.submissionMessage.set(
      'Todavia no se han enviado las imagenes. Cuando quieras, podemos enviarlas al backend.',
    );
    this.flow.reset();
  }

  goToCapture(footSide: FootSide): void {
    this.flow.setStep(footSide === 'left' ? 'capture-left' : 'capture-right');
    this.isSidebarOpen.set(false);
  }

  goToStep(stepKey: Parameters<MeasurementFlowService['setStep']>[0]): void {
    this.flow.setStep(stepKey);
    this.isSidebarOpen.set(false);
  }

  toggleSidebar(): void {
    this.isSidebarOpen.update((value) => !value);
  }

  closeSidebar(): void {
    this.isSidebarOpen.set(false);
  }

  submitCaptures(): void {
    if (!this.flow.hasBothCaptures()) {
      this.submissionState.set('error');
      this.submissionMessage.set(
        'Necesitamos ambas capturas antes de preparar el envio al backend.',
      );
      return;
    }

    this.submissionState.set('submitting');
    this.submissionMessage.set('Enviando capturas al backend preparado para analisis...');

    this.apiService
      .analyzeFeet(this.flow.buildRequestPayload())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (this.submissionState() === 'submitting') {
            this.submissionState.set('idle');
          }
        }),
      )
      .subscribe({
        next: (response) => {
          this.submissionState.set('submitted');
          this.submissionMessage.set(
            `Solicitud enviada. Estado: ${response.status}. ID: ${response.measurementId}.`,
          );
        },
        error: (error: Error) => {
          this.submissionState.set('error');
          this.submissionMessage.set(error.message);
        },
      });
  }

  getCaptureFor(footSide: FootSide): FootCapture | null {
    return footSide === 'left' ? this.flow.leftCapture() : this.flow.rightCapture();
  }
}
