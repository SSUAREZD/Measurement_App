import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-instruction-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './instruction-list.component.html',
  styleUrl: './instruction-list.component.css',
})
export class InstructionListComponent {
  @Input({ required: true }) items: string[] = [];
  @Input() title = 'Consejos para una mejor captura';
}
