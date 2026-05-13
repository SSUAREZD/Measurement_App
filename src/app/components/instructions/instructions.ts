import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Slide {
  text: string;
  animClass: string;
}

@Component({
  selector: 'app-instructions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instructions.html',
  styleUrl: './instructions.css',
})
export class InstructionsComponent {
  @Input() visible = false;
  @Output() dismissed = new EventEmitter<void>();

  currentSlide = 0;
  slideDirection: 'next' | 'prev' | null = null;
  readonly TOTAL_SLIDES = 6;

  slides: Slide[] = [
    {
      text: 'Quítate los zapatos y calcetines, y siéntate en un lugar cómodo.',
      animClass: 'slide-1',
    },
    {
      text: 'Cruza el pie sobre tu pierna opuesta para que quede estable y con la planta accesible.',
      animClass: 'slide-2',
    },
    {
      text: 'Apoya el celular contra la planta del pie con la cámara mirando hacia ella. El borde inferior va al talón y el lado del volumen va hacia el dedo gordo.',
      animClass: 'slide-3',
    },
    {
      text: 'Sostén el celular quieto. Cuando la pantalla diga "Quieto", deslízalo suavemente hasta la punta del dedo gordo y tocalo cuando hayas llegado a la punta del dedo gordo.',
      animClass: 'slide-4',
    },
    {
      text: 'Devuelve el celular al talón sin tocar la pantalla para completar la medida.',
      animClass: 'slide-5',
    },
    {
      text: 'Al terminar las 3 repeticiones, toca "Guardar medidas".',
      animClass: 'slide-6',
    },
  ];

  onTap(event: MouseEvent): void {
    const element = event.currentTarget as HTMLElement;
    const half = element.clientWidth / 2;

    if (event.clientX > half) {
      this.goNext();
    } else {
      this.goPrev();
    }
  }

  goNext(): void {
    if (this.currentSlide === this.TOTAL_SLIDES - 1) return;
    this.slideDirection = 'next';
    this.currentSlide++;
    setTimeout(() => {
      this.slideDirection = null;
    }, 350);
  }

  goPrev(): void {
    if (this.currentSlide === 0) return;
    this.slideDirection = 'prev';
    this.currentSlide--;
    setTimeout(() => {
      this.slideDirection = null;
    }, 350);
  }

  onEntendido(): void {
    this.dismissed.emit();
  }

  get isLastSlide(): boolean {
    return this.currentSlide === this.TOTAL_SLIDES - 1;
  }
}
