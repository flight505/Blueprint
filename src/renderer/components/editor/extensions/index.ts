// Tiptap Extensions
export {
  AIInlineEdit,
  type AIEditRequest,
  type AIEditResult,
  type AIInlineEditOptions,
  type AIInlineEditStorage,
  getPendingEdit,
  getEditHistory,
  applyPendingEdit,
  clearPendingEdit,
  setupAIEditHandlers,
} from './AIInlineEdit';

export {
  MermaidBlock,
  type MermaidBlockOptions,
  type MermaidBlockStorage,
  requestMermaidRender,
  setMermaidRendered,
  emitMermaidResult,
} from './MermaidBlock';

export {
  createCollaboration,
  getYDoc,
  destroyYDoc,
  getActiveDocumentNames,
  getCollaborationState,
  connectToCollaborationServer,
  disconnectFromCollaborationServer,
  type CollaborationConfig,
  type CollaborationState,
  Y,
} from './CollaborationSetup';
