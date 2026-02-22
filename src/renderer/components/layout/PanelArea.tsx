/**
 * PanelArea - Left panel content switcher
 *
 * Renders the appropriate panel based on the active navigation section.
 * Extracted from App.tsx LeftPaneContent for clarity and separation of concerns.
 */
import { useState } from 'react';
import type { Section } from '../../hooks/useAppState';
import type { ChatMessageData, AskUserQuestionData } from '../chat';
import FileBrowser from '../explorer/FileBrowser';
import ThemeToggle from '../settings/ThemeToggle';
import ApiKeySettings from '../settings/ApiKeySettings';
import { ContextPanel } from '../context';
import { CitationVerificationPanel } from '../citation';
import { ReviewQueue } from '../review';
import { HallucinationDashboard } from '../dashboard';
import { ChatContainer } from '../chat';
import { SearchPanel } from '../search';
import { ImageEditorPanel } from '../image-editor';
import { EXPORT_ICONS } from '../icons';

export interface PanelAreaProps {
  section: Section;
  onFileSelect: (path: string) => void;
  chatMessages: ChatMessageData[];
  isChatLoading: boolean;
  onSendMessage: (content: string) => void;
  streamingContent?: string;
  isStreaming?: boolean;
  activeQuestion?: AskUserQuestionData | null;
  onAnswerQuestion?: (questionId: string, answer: string | string[]) => void;
  agentSessionId?: string | null;
  projectPath?: string | null;
  onProjectPathChange?: (path: string | null) => void;
  onOpenExportModal?: () => void;
  activeDocumentPath?: string | null;
  onScrollToCitation?: (citationNumber: number, line?: number, offset?: number) => void;
}

export function PanelArea({
  section,
  onFileSelect,
  chatMessages,
  isChatLoading,
  onSendMessage,
  streamingContent,
  isStreaming,
  activeQuestion,
  onAnswerQuestion,
  agentSessionId,
  projectPath,
  onProjectPathChange,
  onOpenExportModal,
  activeDocumentPath,
  onScrollToCitation,
}: PanelAreaProps) {
  // Context section tab state
  const [contextTab, setContextTab] = useState<'context' | 'citations' | 'review' | 'dashboard'>('context');

  switch (section) {
    case 'chat':
      return (
        <ChatContainer
          messages={chatMessages}
          onSendMessage={onSendMessage}
          isLoading={isChatLoading}
          placeholder="Type a message to start planning..."
          streamingContent={streamingContent}
          isStreaming={isStreaming}
          activeQuestion={activeQuestion}
          onAnswerQuestion={onAnswerQuestion}
        />
      );
    case 'explorer':
      return (
        <FileBrowser
          onFileSelect={onFileSelect}
          projectPath={projectPath}
          onProjectPathChange={onProjectPathChange}
        />
      );
    case 'search':
      return (
        <SearchPanel
          projectPath={projectPath ?? null}
          onFileSelect={onFileSelect}
        />
      );
    case 'context':
      return (
        <div className="flex flex-col h-full">
          {/* Tab switcher */}
          <div className="flex border-b border-white/[0.06] bg-white/[0.02]">
            <button
              onClick={() => setContextTab('context')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                contextTab === 'context'
                  ? 'text-purple-400 border-b-2 border-purple-400 shadow-[0_2px_8px_rgba(167,139,250,0.15)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              }`}
              aria-selected={contextTab === 'context'}
              role="tab"
            >
              Context
            </button>
            <button
              onClick={() => setContextTab('citations')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                contextTab === 'citations'
                  ? 'text-purple-400 border-b-2 border-purple-400 shadow-[0_2px_8px_rgba(167,139,250,0.15)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              }`}
              aria-selected={contextTab === 'citations'}
              role="tab"
            >
              Citations
            </button>
            <button
              onClick={() => setContextTab('review')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                contextTab === 'review'
                  ? 'text-purple-400 border-b-2 border-purple-400 shadow-[0_2px_8px_rgba(167,139,250,0.15)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              }`}
              aria-selected={contextTab === 'review'}
              role="tab"
            >
              Review
            </button>
            <button
              onClick={() => setContextTab('dashboard')}
              className={`flex-1 px-3 py-1.5 text-xs font-medium transition-all duration-150 ${
                contextTab === 'dashboard'
                  ? 'text-purple-400 border-b-2 border-purple-400 shadow-[0_2px_8px_rgba(167,139,250,0.15)]'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
              }`}
              aria-selected={contextTab === 'dashboard'}
              role="tab"
            >
              Dashboard
            </button>
          </div>
          {/* Tab content */}
          <div className="flex-1 overflow-hidden">
            {contextTab === 'context' ? (
              <ContextPanel
                sessionId={agentSessionId}
                maxTokens={200000}
              />
            ) : contextTab === 'citations' ? (
              <CitationVerificationPanel
                documentPath={activeDocumentPath ?? null}
                onScrollToCitation={onScrollToCitation}
              />
            ) : contextTab === 'review' ? (
              <ReviewQueue
                documentPath={activeDocumentPath ?? null}
              />
            ) : (
              <HallucinationDashboard
                projectPath={projectPath}
              />
            )}
          </div>
        </div>
      );
    case 'planning':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium mb-2">Planning Dashboard</p>
            <p className="text-xs">Create a new project to see planning phases</p>
          </div>
        </div>
      );
    case 'image':
      return (
        <ImageEditorPanel
          projectId={projectPath ?? undefined}
        />
      );
    case 'export':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div className="text-gray-400">
              <p className="text-sm font-medium mb-2 text-gray-200">Export Documents</p>
              <p className="text-xs mb-4">Generate PDF, DOCX, or PPTX from your project</p>
            </div>

            {/* Export format options */}
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={onOpenExportModal}
                className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.07] hover:border-purple-400/30 hover:shadow-[0_0_12px_rgba(167,139,250,0.12)] transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-300 group-hover:scale-110 transition-transform">
                    <EXPORT_ICONS.pdf size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-100">PDF Document</p>
                    <p className="text-xs text-gray-400">Professional format with precise layout</p>
                  </div>
                </div>
              </button>

              <button
                onClick={onOpenExportModal}
                className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.07] hover:border-purple-400/30 hover:shadow-[0_0_12px_rgba(167,139,250,0.12)] transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-300 group-hover:scale-110 transition-transform">
                    <EXPORT_ICONS.docx size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-100">Word Document</p>
                    <p className="text-xs text-gray-400">Editable DOCX for collaboration</p>
                  </div>
                </div>
              </button>

              <button
                onClick={onOpenExportModal}
                className="p-4 rounded-lg border border-white/[0.06] bg-white/[0.04] hover:bg-white/[0.07] hover:border-purple-400/30 hover:shadow-[0_0_12px_rgba(167,139,250,0.12)] transition-all duration-200 text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="text-gray-300 group-hover:scale-110 transition-transform">
                    <EXPORT_ICONS.pptx size={24} />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-100">PowerPoint</p>
                    <p className="text-xs text-gray-400">Presentation slides for meetings</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    case 'history':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-gray-500 dark:text-gray-400">
            <p className="text-sm font-medium mb-2">Session History</p>
            <p className="text-xs">No previous sessions</p>
          </div>
        </div>
      );
    case 'settings':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-6">
            <ApiKeySettings />
            <hr className="border-gray-200 dark:border-gray-700" />
            <ThemeToggle />
          </div>
        </div>
      );
    case 'help':
      return (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Keyboard Shortcuts</p>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>Cmd+1-8 - Switch sections</p>
                <p>Cmd+6 - Image Editor</p>
                <p>Cmd+Shift+P - Command palette</p>
                <p>Cmd+Shift+F - Search in project</p>
                <p>Cmd+P - Quick open file</p>
                <p>Cmd+K - Inline edit</p>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Documentation</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">View docs at github.com/flight505/Blueprint</p>
            </div>
          </div>
        </div>
      );
  }
}
