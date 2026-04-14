import { bootstrapApplication, BootstrapContext } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';


export default (context?: unknown) => (bootstrapApplication as any)(AppComponent, config, context);
