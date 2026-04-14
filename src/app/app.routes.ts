import { Routes } from '@angular/router';
import { MeasurementFlowPageComponent } from './measurement-flow-page.component';

export const routes: Routes = [
  {
    path: '',
    component: MeasurementFlowPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
