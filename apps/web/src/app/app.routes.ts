import type { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home').then((module) => module.Home),
  },
  {
    path: 'films',
    loadComponent: () => import('./pages/library/library').then((module) => module.Library),
    data: { type: 'filme' },
  },
  {
    path: 'books',
    loadComponent: () => import('./pages/library/library').then((module) => module.Library),
    data: { type: 'livro' },
  },
  {
    path: 'item/:id',
    loadComponent: () => import('./pages/detail/detail').then((module) => module.Detail),
  },
  {
    path: 'statistics',
    loadComponent: () =>
      import('./pages/statistics/statistics').then((module) => module.Statistics),
  },
  { path: '', pathMatch: 'full', redirectTo: 'home' },
];
