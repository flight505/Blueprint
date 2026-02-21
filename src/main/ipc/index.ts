import type { BrowserWindow } from 'electron';
import * as system from './system.ipc';
import * as filesystem from './filesystem.ipc';
import * as settings from './settings.ipc';
import * as models from './models.ipc';
import * as database from './database.ipc';

export function registerAllHandlers(_mainWindow?: BrowserWindow) {
  system.register();
  filesystem.register();
  settings.register();
  models.register();
  database.register();
}
