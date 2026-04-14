import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MeasurementStep } from '../models/measurement-step.model';

@Component({
  selector: 'app-step-progress',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './step-progress.component.html',
  styleUrl: './step-progress.component.css',
})
export class StepProgressComponent {
  @Input({ required: true }) steps: MeasurementStep[] = [];
  @Input({ required: true }) currentStepIndex = 0;
  @Input({ required: true }) progressValue = 0;
}
