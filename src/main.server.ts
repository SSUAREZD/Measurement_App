import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

// Angular 19 passes a BootstrapContext as the first argument when discovering
// routes (getRoutesFromAngularRouterConfig). It must be forwarded to
// bootstrapApplication — the third parameter is internal and not in the
// public TS types, hence the cast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default (context?: unknown) => (bootstrapApplication as any)(AppComponent, config, context);
