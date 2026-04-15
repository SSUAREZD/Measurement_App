import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { MeasurementFlowPageComponent } from './measurement-flow-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'measure',
    component: MeasurementFlowPageComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
