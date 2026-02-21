import * as system from './system.ipc';
import * as filesystem from './filesystem.ipc';
import * as settings from './settings.ipc';
import * as models from './models.ipc';
import * as database from './database.ipc';
import * as agent from './agent.ipc';
import * as research from './research.ipc';
import * as context from './context.ipc';
import * as confidence from './confidence.ipc';
import * as citation from './citation.ipc';
import * as orchestrator from './orchestrator.ipc';
import * as review from './review.ipc';
import * as dashboard from './dashboard.ipc';
import * as exportHandlers from './export.ipc';
import * as imageEditor from './imageEditor.ipc';
import * as update from './update.ipc';

export function registerAllHandlers() {
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

  // Batch 3: Remaining domain handlers
  citation.register();
  orchestrator.register();
  review.register();
  dashboard.register();
  exportHandlers.register();
  imageEditor.register();
  update.register();
}
