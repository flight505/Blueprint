import type { BrowserWindow } from 'electron';
import * as system from './system.ipc';
import * as filesystem from './filesystem.ipc';
import * as settings from './settings.ipc';
import * as models from './models.ipc';
import * as database from './database.ipc';
import * as agent from './agent.ipc';
import * as research from './research.ipc';
import * as context from './context.ipc';
import * as confidence from './confidence.ipc';

export function registerAllHandlers(_mainWindow?: BrowserWindow) {
  // Batch 1: Simple handlers (no streaming)
  system.register();
  filesystem.register();
  settings.register();
  models.register();
  database.register();

  // Batch 2: Streaming handlers (use event.sender)
  agent.register();
  research.register();
  context.register();
  confidence.register();
}
