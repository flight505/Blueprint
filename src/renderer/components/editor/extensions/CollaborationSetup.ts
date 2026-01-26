import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';

/**
 * CollaborationSetup - Configuration for Tiptap collaboration with Yjs
 *
 * This module provides the setup for collaborative editing using Yjs.
 * Currently configured for local-only editing, ready to be extended
 * with WebSocket/WebRTC providers in v2.0.
 *
 * Future enhancements (v2.0):
 * - WebSocket provider for real-time sync
 * - Awareness protocol for cursor positions
 * - Offline support with IndexedDB persistence
 */

export interface CollaborationConfig {
  /** Document name for Yjs */
  documentName: string;
  /** Optional existing Y.Doc instance */
  doc?: Y.Doc;
  /** Field name for content (default: 'content') */
  field?: string;
}

// Store active documents by name
const activeDocuments = new Map<string, Y.Doc>();

/**
 * Get or create a Y.Doc for a given document name
 */
export function getYDoc(documentName: string): Y.Doc {
  let doc = activeDocuments.get(documentName);
  if (!doc) {
    doc = new Y.Doc();
    activeDocuments.set(documentName, doc);
  }
  return doc;
}

/**
 * Destroy a Y.Doc and clean up
 */
export function destroyYDoc(documentName: string): void {
  const doc = activeDocuments.get(documentName);
  if (doc) {
    doc.destroy();
    activeDocuments.delete(documentName);
  }
}

/**
 * Get all active document names
 */
export function getActiveDocumentNames(): string[] {
  return Array.from(activeDocuments.keys());
}

/**
 * Create the Collaboration extension configured for a document
 *
 * Usage:
 * ```typescript
 * const editor = useEditor({
 *   extensions: [
 *     StarterKit,
 *     createCollaboration({ documentName: 'my-doc' }),
 *   ],
 * });
 * ```
 */
export function createCollaboration(config: CollaborationConfig) {
  const { documentName, doc: existingDoc, field = 'content' } = config;

  // Get or create the Y.Doc
  const ydoc = existingDoc || getYDoc(documentName);

  // Create the Collaboration extension
  return Collaboration.configure({
    document: ydoc,
    field,
  });
}

/**
 * Export Yjs for use in other modules
 */
export { Y };

/**
 * Collaboration state for a document
 */
export interface CollaborationState {
  documentName: string;
  doc: Y.Doc;
  isConnected: boolean;
  connectedUsers: number;
}

/**
 * Get the collaboration state for a document
 */
export function getCollaborationState(documentName: string): CollaborationState | null {
  const doc = activeDocuments.get(documentName);
  if (!doc) return null;

  return {
    documentName,
    doc,
    isConnected: false, // Will be true when WebSocket provider is connected in v2.0
    connectedUsers: 1, // Local user only for now
  };
}

/**
 * Placeholder for v2.0 WebSocket connection
 * This will be implemented when we add real-time collaboration
 */
export function connectToCollaborationServer(
  _documentName: string,
  _serverUrl: string
): Promise<void> {
  console.warn('Collaboration server connection not yet implemented (planned for v2.0)');
  return Promise.resolve();
}

/**
 * Placeholder for v2.0 disconnect
 */
export function disconnectFromCollaborationServer(_documentName: string): void {
  console.warn('Collaboration server disconnection not yet implemented (planned for v2.0)');
}

export default createCollaboration;
