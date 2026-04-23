import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home';
import { MedicionComponent } from './components/medicion/medicion';

export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
  },
  {
    path: 'medicion',
    component: MedicionComponent,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
