import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FootSide } from '../models/foot-capture.model';

@Component({
  selector: 'app-camera-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './camera-overlay.component.html',
  styleUrl: './camera-overlay.component.css',
})
export class CameraOverlayComponent {
  @Input({ required: true }) footSide: FootSide = 'left';
}
