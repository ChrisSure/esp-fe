import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/container/app';

bootstrapApplication(App, appConfig).catch((error) => console.error(error));
