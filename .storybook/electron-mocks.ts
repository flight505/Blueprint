/**
 * Electron API Mocks for Storybook
 *
 * This file provides mock implementations of window.electronAPI for testing
 * Blueprint components in isolation without requiring the Electron runtime.
 *
 * Usage in stories:
 * - Mocks are automatically injected via preview.ts
 * - Override specific mocks in individual stories as needed
 *
 * Example override in a story:
 * ```ts
 * beforeEach(() => {
 *   window.electronAPI.readFile = async () => ({
 *     path: '/test.md',
 *     content: '# Custom content',
 *     encoding: 'utf-8'
 *   });
 * });
 * ```
 */

// Helper to create a mock that logs calls for debugging
const createMock = <T>(name: string, returnValue: T) => {
  return (...args: unknown[]) => {
    console.log(`[Electron Mock] ${name}`, args);
    return Promise.resolve(returnValue);
  };
};

// Helper to create event listener mocks
const createEventMock = (name: string) => {
  return (_callback: (...args: unknown[]) => void) => {
    console.log(`[Electron Mock] Registered listener: ${name}`);
    // Return unsubscribe function
    return () => {
      console.log(`[Electron Mock] Unregistered listener: ${name}`);
    };
  };
};

// Mock file system data
const mockFileTree = [
  {
    name: 'src',
    path: '/project/src',
    type: 'directory' as const,
    children: [
      { name: 'App.tsx', path: '/project/src/App.tsx', type: 'file' as const },
      { name: 'index.tsx', path: '/project/src/index.tsx', type: 'file' as const },
    ],
  },
  { name: 'README.md', path: '/project/README.md', type: 'file' as const },
  { name: 'package.json', path: '/project/package.json', type: 'file' as const },
];

const mockFileContent = {
  path: '/project/README.md',
  content: '# Blueprint Project\n\nThis is a mock file for Storybook testing.',
  encoding: 'utf-8',
};

// Mock session data
const mockSession = {
  id: 'mock-session-123',
  createdAt: new Date(),
  messages: [],
  model: 'claude-sonnet-4-20250514',
};

// Mock database stats
const mockDbStats = {
  sessionCount: 5,
  documentCount: 23,
  dbSize: 1024 * 1024 * 2, // 2MB
};

// Mock model info
const mockModels = [
  { id: 'claude-3-5-haiku-20241022', name: 'Haiku', complexity: 'simple' as const, description: 'Fast, efficient model' },
  { id: 'claude-sonnet-4-20250514', name: 'Sonnet', complexity: 'medium' as const, description: 'Balanced performance' },
  { id: 'claude-opus-4-20250514', name: 'Opus', complexity: 'complex' as const, description: 'Most capable model' },
];

// Mock citation data
const mockCitation = {
  id: 'citation-1',
  number: 1,
  url: 'https://example.com/research',
  title: 'Example Research Paper',
  authors: ['John Doe', 'Jane Smith'],
  date: '2024-01-15',
  publisher: 'Academic Press',
  accessedAt: new Date().toISOString(),
  source: 'perplexity' as const,
  usages: [],
};

// Mock confidence data
const mockDocumentConfidence = {
  overallConfidence: 0.85,
  paragraphs: [
    {
      paragraphIndex: 0,
      text: 'This is a high confidence paragraph with citations.',
      confidence: 0.92,
      breakdown: {
        hedgingScore: 0.1,
        assertionScore: 0.9,
        factualScore: 0.85,
        citationScore: 0.95,
        lengthScore: 0.8,
        questionPenalty: 0,
      },
      isLowConfidence: false,
      indicators: [],
    },
  ],
  lowConfidenceParagraphs: [],
  summary: {
    totalParagraphs: 1,
    lowConfidenceCount: 0,
    averageConfidence: 0.92,
    lowestConfidence: 0.92,
    highestConfidence: 0.92,
  },
};

// Complete Electron API mock
export const electronMocks = {
  // Permissions
  checkPermissions: createMock('checkPermissions', {
    fileAccess: { granted: true },
    networkAccess: { granted: true },
  }),
  openSystemPreferences: createMock('openSystemPreferences', undefined),

  // App info
  getPlatform: () => 'darwin',
  getAppVersion: createMock('getAppVersion', '0.1.0'),

  // File system
  selectDirectory: createMock('selectDirectory', '/Users/test/projects'),
  readDirectory: createMock('readDirectory', mockFileTree),
  readFile: createMock('readFile', mockFileContent),
  listAllFiles: createMock('listAllFiles', [
    { name: 'App.tsx', path: '/project/src/App.tsx', relativePath: 'src/App.tsx' },
    { name: 'index.tsx', path: '/project/src/index.tsx', relativePath: 'src/index.tsx' },
  ]),
  searchInFiles: createMock('searchInFiles', []),
  writeFile: createMock('writeFile', undefined),
  setProjectPath: createMock('setProjectPath', undefined),
  isPathAllowed: createMock('isPathAllowed', true),

  // Agent service
  agentInitialize: createMock('agentInitialize', true),
  agentIsInitialized: createMock('agentIsInitialized', true),
  agentValidateApiKey: createMock('agentValidateApiKey', true),
  agentCreateSession: createMock('agentCreateSession', mockSession),
  agentGetSession: createMock('agentGetSession', mockSession),
  agentDeleteSession: createMock('agentDeleteSession', true),
  agentListSessions: createMock('agentListSessions', [mockSession]),
  agentSendMessage: createMock('agentSendMessage', {
    id: 'msg-1',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: 'This is a mock response from Claude.' }],
    model: 'claude-sonnet-4-20250514',
    stop_reason: 'end_turn',
    usage: { input_tokens: 100, output_tokens: 50 },
  }),
  agentSendMessageStream: createMock('agentSendMessageStream', undefined),
  agentResumeSession: createMock('agentResumeSession', mockSession),
  agentGetConversationHistory: createMock('agentGetConversationHistory', []),
  agentClearConversationHistory: createMock('agentClearConversationHistory', true),
  onAgentStreamChunk: createEventMock('onAgentStreamChunk'),

  // Database service
  dbIsInitialized: createMock('dbIsInitialized', true),
  dbSaveSession: createMock('dbSaveSession', undefined),
  dbGetSession: createMock('dbGetSession', null),
  dbGetSessionByProjectPath: createMock('dbGetSessionByProjectPath', null),
  dbListSessions: createMock('dbListSessions', []),
  dbDeleteSession: createMock('dbDeleteSession', true),
  dbSaveDocument: createMock('dbSaveDocument', undefined),
  dbGetDocument: createMock('dbGetDocument', null),
  dbGetDocumentsBySession: createMock('dbGetDocumentsBySession', []),
  dbDeleteDocument: createMock('dbDeleteDocument', true),
  dbSearchDocumentsByEmbedding: createMock('dbSearchDocumentsByEmbedding', []),
  dbGetStats: createMock('dbGetStats', mockDbStats),

  // Recent projects
  recentProjectsAdd: createMock('recentProjectsAdd', {
    id: 'proj-1',
    path: '/Users/test/project',
    name: 'Test Project',
    lastOpenedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }),
  recentProjectsList: createMock('recentProjectsList', []),
  recentProjectsRemove: createMock('recentProjectsRemove', true),
  recentProjectsRemoveByPath: createMock('recentProjectsRemoveByPath', true),
  recentProjectsClear: createMock('recentProjectsClear', 0),
  recentProjectsGetByPath: createMock('recentProjectsGetByPath', null),

  // Secure storage
  secureStorageSetApiKey: createMock('secureStorageSetApiKey', true),
  secureStorageGetApiKey: createMock('secureStorageGetApiKey', null),
  secureStorageDeleteApiKey: createMock('secureStorageDeleteApiKey', true),
  secureStorageHasApiKey: createMock('secureStorageHasApiKey', false),
  secureStorageListStoredKeys: createMock('secureStorageListStoredKeys', []),
  secureStorageIsEncryptionAvailable: createMock('secureStorageIsEncryptionAvailable', true),

  // Model router
  modelRouterClassifyTask: createMock('modelRouterClassifyTask', {
    complexity: 'medium' as const,
    model: 'claude-sonnet-4-20250514',
    confidence: 0.85,
    reasoning: 'Standard complexity task',
  }),
  modelRouterGetModelForComplexity: createMock('modelRouterGetModelForComplexity', 'claude-sonnet-4-20250514'),
  modelRouterGetModelByName: createMock('modelRouterGetModelByName', 'claude-sonnet-4-20250514'),
  modelRouterGetAvailableModels: createMock('modelRouterGetAvailableModels', mockModels),
  modelRouterSetDefaultModel: createMock('modelRouterSetDefaultModel', undefined),
  modelRouterGetDefaultModel: createMock('modelRouterGetDefaultModel', 'claude-sonnet-4-20250514'),
  modelRouterGetModelConstants: createMock('modelRouterGetModelConstants', {
    HAIKU: 'claude-3-5-haiku-20241022',
    SONNET: 'claude-sonnet-4-20250514',
    OPUS: 'claude-opus-4-20250514',
  }),

  // Context manager
  contextManagerInitialize: createMock('contextManagerInitialize', undefined),
  contextManagerIsInitialized: createMock('contextManagerIsInitialized', true),
  contextManagerAddEvent: createMock('contextManagerAddEvent', {
    id: 'event-1',
    timestamp: new Date(),
    type: 'user_message' as const,
    content: 'Test event',
    tokenEstimate: 10,
  }),
  contextManagerGetEvents: createMock('contextManagerGetEvents', []),
  contextManagerGetActiveEvents: createMock('contextManagerGetActiveEvents', []),
  contextManagerGetStats: createMock('contextManagerGetStats', null),
  contextManagerShouldCompact: createMock('contextManagerShouldCompact', false),
  contextManagerCompact: createMock('contextManagerCompact', { success: true, tokensSaved: 0 }),
  contextManagerGetFullContext: createMock('contextManagerGetFullContext', ''),
  contextManagerGetContextAsMessages: createMock('contextManagerGetContextAsMessages', []),
  contextManagerClearSession: createMock('contextManagerClearSession', true),
  contextManagerConfigure: createMock('contextManagerConfigure', undefined),
  contextManagerGetConfiguration: createMock('contextManagerGetConfiguration', {
    compactionThreshold: 50000,
    recentEventsToKeep: 10,
  }),
  contextManagerGetSummaries: createMock('contextManagerGetSummaries', []),

  // Prompt library
  promptSave: createMock('promptSave', undefined),
  promptGet: createMock('promptGet', null),
  promptListAll: createMock('promptListAll', []),
  promptDelete: createMock('promptDelete', true),

  // OpenRouter/Perplexity
  openRouterInitialize: createMock('openRouterInitialize', true),
  openRouterIsInitialized: createMock('openRouterIsInitialized', false),
  openRouterValidateApiKey: createMock('openRouterValidateApiKey', true),
  openRouterResearch: createMock('openRouterResearch', {
    id: 'research-1',
    content: 'Mock research results',
    citations: [],
    model: 'perplexity/sonar',
    usage: { prompt_tokens: 100, completion_tokens: 200, total_tokens: 300 },
    finishReason: 'stop',
  }),
  openRouterResearchStream: createMock('openRouterResearchStream', undefined),
  openRouterGetModel: createMock('openRouterGetModel', 'perplexity/sonar'),
  onOpenRouterStreamChunk: createEventMock('onOpenRouterStreamChunk'),

  // Gemini
  geminiInitialize: createMock('geminiInitialize', true),
  geminiIsInitialized: createMock('geminiIsInitialized', false),
  geminiValidateApiKey: createMock('geminiValidateApiKey', true),
  geminiDeepResearch: createMock('geminiDeepResearch', {
    id: 'gemini-1',
    content: 'Mock deep research results',
    model: 'gemini-2.0-flash',
    usage: { promptTokens: 100, candidatesTokens: 500, totalTokens: 600 },
    finishReason: 'STOP',
  }),
  geminiDeepResearchStream: createMock('geminiDeepResearchStream', undefined),
  geminiGetModel: createMock('geminiGetModel', 'gemini-2.0-flash'),
  geminiGetProgressCheckpoints: createMock('geminiGetProgressCheckpoints', [25, 50, 75, 100]),
  onGeminiProgressCheckpoint: createEventMock('onGeminiProgressCheckpoint'),
  onGeminiStreamChunk: createEventMock('onGeminiStreamChunk'),

  // Research router
  researchRouterGetProvider: createMock('researchRouterGetProvider', 'perplexity' as const),
  researchRouterIsProviderAvailable: createMock('researchRouterIsProviderAvailable', true),
  researchRouterGetAvailableProviders: createMock('researchRouterGetAvailableProviders', ['perplexity', 'gemini']),
  researchRouterSetDefaultMode: createMock('researchRouterSetDefaultMode', undefined),
  researchRouterGetDefaultMode: createMock('researchRouterGetDefaultMode', 'balanced' as const),
  researchRouterGetPhaseRouting: createMock('researchRouterGetPhaseRouting', {
    quick: 'perplexity' as const,
    balanced: 'perplexity' as const,
    comprehensive: 'gemini' as const,
  }),
  researchRouterResearch: createMock('researchRouterResearch', {
    id: 'unified-1',
    content: 'Mock unified research results',
    provider: 'perplexity' as const,
    model: 'perplexity/sonar',
    usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
    finishReason: 'stop',
  }),
  researchRouterResearchStream: createMock('researchRouterResearchStream', undefined),
  researchRouterGetModeDescriptions: createMock('researchRouterGetModeDescriptions', {
    quick: 'Fast research with Perplexity',
    balanced: 'Balanced research approach',
    comprehensive: 'Deep research with Gemini',
  }),
  researchRouterGetPhaseDescriptions: createMock('researchRouterGetPhaseDescriptions', {}),
  researchRouterGetAvailableModes: createMock('researchRouterGetAvailableModes', ['quick', 'balanced', 'comprehensive']),
  researchRouterGetProjectPhases: createMock('researchRouterGetProjectPhases', [
    'market_research',
    'competitive_analysis',
    'technical_feasibility',
    'architecture_design',
    'risk_assessment',
    'sprint_planning',
    'general',
  ]),
  researchRouterStartSession: createMock('researchRouterStartSession', 'session-1'),
  researchRouterCancelResearch: createMock('researchRouterCancelResearch', true),
  researchRouterEndSession: createMock('researchRouterEndSession', undefined),
  researchRouterGetActiveSessions: createMock('researchRouterGetActiveSessions', []),
  onResearchRouterStreamChunk: createEventMock('onResearchRouterStreamChunk'),

  // Citation management
  citationLoadCitations: createMock('citationLoadCitations', {
    version: '1.0' as const,
    documentPath: '/test.md',
    updatedAt: new Date().toISOString(),
    citations: [],
    nextNumber: 1,
  }),
  citationSaveCitations: createMock('citationSaveCitations', undefined),
  citationAddCitation: createMock('citationAddCitation', mockCitation),
  citationAddCitations: createMock('citationAddCitations', [mockCitation]),
  citationUpdateCitation: createMock('citationUpdateCitation', mockCitation),
  citationRemoveCitation: createMock('citationRemoveCitation', true),
  citationAddUsage: createMock('citationAddUsage', true),
  citationGetCitationByNumber: createMock('citationGetCitationByNumber', mockCitation),
  citationGenerateReferenceList: createMock('citationGenerateReferenceList', []),
  citationGenerateReferenceListMarkdown: createMock('citationGenerateReferenceListMarkdown', ''),
  citationFormatTextWithCitations: createMock('citationFormatTextWithCitations', ''),
  citationHasCitations: createMock('citationHasCitations', false),
  citationGetCitationCount: createMock('citationGetCitationCount', 0),
  citationDeleteCitationFile: createMock('citationDeleteCitationFile', true),
  citationGetCitationFilePath: createMock('citationGetCitationFilePath', '/test.citations.json'),

  // Citation verification
  citationVerifyCitation: createMock('citationVerifyCitation', {
    status: 'verified' as const,
    confidence: 0.95,
    source: 'openalex' as const,
    fromCache: false,
  }),
  citationVerifyCitations: createMock('citationVerifyCitations', new Map()),
  citationVerificationClearCache: createMock('citationVerificationClearCache', 0),
  citationVerificationGetCacheStats: createMock('citationVerificationGetCacheStats', {
    totalEntries: 0,
    expiredEntries: 0,
    cacheSize: 0,
  }),

  // Citation attachment
  citationAttachCitations: createMock('citationAttachCitations', {
    annotatedText: '',
    claims: [],
    addedCitations: [],
    totalCitations: 0,
  }),
  citationRelocateCitations: createMock('citationRelocateCitations', { relocated: 0, lost: 0 }),
  citationGetSourceClaimLinks: createMock('citationGetSourceClaimLinks', []),
  citationCleanupOrphanedLinks: createMock('citationCleanupOrphanedLinks', 0),
  citationConvertResearchCitations: createMock('citationConvertResearchCitations', []),

  // Confidence scoring
  confidenceComputeParagraph: createMock('confidenceComputeParagraph', mockDocumentConfidence.paragraphs[0]),
  confidenceComputeDocument: createMock('confidenceComputeDocument', mockDocumentConfidence),
  confidenceGetCached: createMock('confidenceGetCached', undefined),
  confidenceClearCache: createMock('confidenceClearCache', undefined),
  confidenceGetThreshold: createMock('confidenceGetThreshold', 0.6),
  confidenceSetThreshold: createMock('confidenceSetThreshold', undefined),
  confidenceGetConfig: createMock('confidenceGetConfig', {
    lowConfidenceThreshold: 0.6,
    enableTokenProbabilities: false,
    weights: {
      hedging: 0.2,
      assertion: 0.2,
      factual: 0.2,
      citation: 0.2,
      length: 0.1,
      question: 0.1,
    },
  }),
  confidenceUpdateConfig: createMock('confidenceUpdateConfig', undefined),
  confidenceProcessStreaming: createMock('confidenceProcessStreaming', undefined),
  onConfidenceStreamUpdate: createEventMock('onConfidenceStreamUpdate'),

  // Review queue
  reviewScanDocument: createMock('reviewScanDocument', {
    documentPath: '/test.md',
    items: [],
    stats: {
      total: 0,
      pending: 0,
      accepted: 0,
      edited: 0,
      removed: 0,
      dismissed: 0,
      lowConfidenceCount: 0,
      unverifiedCitationCount: 0,
    },
    lastUpdated: new Date(),
  }),
  reviewGetQueue: createMock('reviewGetQueue', undefined),
  reviewGetItem: createMock('reviewGetItem', undefined),
  reviewGetPendingItems: createMock('reviewGetPendingItems', []),
  reviewAcceptItem: createMock('reviewAcceptItem', undefined),
  reviewEditItem: createMock('reviewEditItem', undefined),
  reviewRemoveItem: createMock('reviewRemoveItem', undefined),
  reviewDismissItem: createMock('reviewDismissItem', undefined),
  reviewClearQueue: createMock('reviewClearQueue', undefined),
  reviewGetDocumentsWithPendingReviews: createMock('reviewGetDocumentsWithPendingReviews', []),
  reviewGetThreshold: createMock('reviewGetThreshold', 0.6),
  reviewSetThreshold: createMock('reviewSetThreshold', undefined),

  // Hallucination dashboard
  dashboardAnalyzeDocument: createMock('dashboardAnalyzeDocument', {
    documentPath: '/test.md',
    documentName: 'test.md',
    averageConfidence: 0.85,
    totalParagraphs: 10,
    lowConfidenceParagraphs: 1,
    totalCitations: 5,
    verifiedCitations: 4,
    partialCitations: 1,
    unverifiedCitations: 0,
    verificationRate: 0.8,
    qualityScore: 0.82,
    lastAnalyzedAt: new Date().toISOString(),
  }),
  dashboardGetDocumentMetrics: createMock('dashboardGetDocumentMetrics', null),
  dashboardGetProjectMetrics: createMock('dashboardGetProjectMetrics', {
    projectPath: '/project',
    documents: [],
    overallConfidence: 0,
    overallVerificationRate: 0,
    overallQualityScore: 0,
    totalDocuments: 0,
    totalParagraphs: 0,
    totalLowConfidenceParagraphs: 0,
    totalCitations: 0,
    totalVerifiedCitations: 0,
    lastAnalyzedAt: new Date().toISOString(),
  }),
  dashboardGetTrendData: createMock('dashboardGetTrendData', {
    projectPath: '/project',
    dataPoints: [],
    movingAverages: { confidence: 0, verificationRate: 0, qualityScore: 0 },
  }),
  dashboardExportReport: createMock('dashboardExportReport', '{}'),
  dashboardClearProjectMetrics: createMock('dashboardClearProjectMetrics', 0),
  dashboardClearAllMetrics: createMock('dashboardClearAllMetrics', 0),

  // PDF generation
  pdfIsPandocAvailable: createMock('pdfIsPandocAvailable', true),
  pdfGetPandocVersion: createMock('pdfGetPandocVersion', '3.1.0'),
  pdfGeneratePDF: createMock('pdfGeneratePDF', { success: true, outputPath: '/output.pdf', pageCount: 5 }),
  pdfGeneratePDFFromDocument: createMock('pdfGeneratePDFFromDocument', { success: true, outputPath: '/output.pdf' }),
  pdfGeneratePDFFromSections: createMock('pdfGeneratePDFFromSections', { success: true, outputPath: '/output.pdf' }),
  pdfGeneratePreview: createMock('pdfGeneratePreview', { success: true }),
  pdfCleanup: createMock('pdfCleanup', undefined),

  // DOCX generation
  docxGenerateDOCX: createMock('docxGenerateDOCX', { success: true, outputPath: '/output.docx' }),
  docxGenerateDOCXFromDocument: createMock('docxGenerateDOCXFromDocument', { success: true, outputPath: '/output.docx' }),
  docxGenerateDOCXFromSections: createMock('docxGenerateDOCXFromSections', { success: true, outputPath: '/output.docx' }),

  // PPTX generation
  pptxGeneratePPTX: createMock('pptxGeneratePPTX', { success: true, outputPath: '/output.pptx', slideCount: 10 }),
  pptxGeneratePPTXFromDocument: createMock('pptxGeneratePPTXFromDocument', { success: true, outputPath: '/output.pptx' }),
  pptxGeneratePPTXFromSections: createMock('pptxGeneratePPTXFromSections', { success: true, outputPath: '/output.pptx' }),
  pptxGetAvailableThemes: createMock('pptxGetAvailableThemes', ['default', 'dark', 'professional']),
  pptxGetTheme: createMock('pptxGetTheme', null),

  // Phase orchestrator
  orchestratorStart: createMock('orchestratorStart', undefined),
  orchestratorPause: createMock('orchestratorPause', true),
  orchestratorResume: createMock('orchestratorResume', undefined),
  orchestratorStop: createMock('orchestratorStop', true),
  orchestratorSkipCurrentPhase: createMock('orchestratorSkipCurrentPhase', true),
  orchestratorGetExecutionState: createMock('orchestratorGetExecutionState', null),
  orchestratorIsRunning: createMock('orchestratorIsRunning', false),
  orchestratorIsPaused: createMock('orchestratorIsPaused', false),
  orchestratorIsWaitingForApproval: createMock('orchestratorIsWaitingForApproval', false),
  orchestratorApproveAndContinue: createMock('orchestratorApproveAndContinue', true),
  orchestratorRevisePhase: createMock('orchestratorRevisePhase', true),
  orchestratorGetCurrentPhase: createMock('orchestratorGetCurrentPhase', null),
  orchestratorGetPhaseDisplayName: createMock('orchestratorGetPhaseDisplayName', 'Phase Name'),
  orchestratorGetOverallProgress: createMock('orchestratorGetOverallProgress', 0),
  orchestratorGetPhaseStates: createMock('orchestratorGetPhaseStates', []),
  orchestratorCleanup: createMock('orchestratorCleanup', undefined),
  onOrchestratorPhaseStart: createEventMock('onOrchestratorPhaseStart'),
  onOrchestratorPhaseProgress: createEventMock('onOrchestratorPhaseProgress'),
  onOrchestratorPhaseComplete: createEventMock('onOrchestratorPhaseComplete'),
  onOrchestratorPhaseError: createEventMock('onOrchestratorPhaseError'),
  onOrchestratorPhaseAwaitingApproval: createEventMock('onOrchestratorPhaseAwaitingApproval'),
  onOrchestratorStart: createEventMock('onOrchestratorStart'),
  onOrchestratorPause: createEventMock('onOrchestratorPause'),
  onOrchestratorResume: createEventMock('onOrchestratorResume'),
  onOrchestratorComplete: createEventMock('onOrchestratorComplete'),
  onOrchestratorError: createEventMock('onOrchestratorError'),
  onOrchestratorStateUpdate: createEventMock('onOrchestratorStateUpdate'),

  // Checkpoint
  checkpointSave: createMock('checkpointSave', null),
  checkpointHasResumable: createMock('checkpointHasResumable', false),
  checkpointGetForProject: createMock('checkpointGetForProject', null),
  checkpointResumeFromCheckpoint: createMock('checkpointResumeFromCheckpoint', undefined),
  checkpointDelete: createMock('checkpointDelete', true),
  checkpointDeleteForProject: createMock('checkpointDeleteForProject', 0),
  checkpointGetCurrentId: createMock('checkpointGetCurrentId', null),
  onCheckpointSaved: createEventMock('onCheckpointSaved'),
  onCheckpointResumed: createEventMock('onCheckpointResumed'),

  // Update service
  updateCheckForUpdates: createMock('updateCheckForUpdates', null),
  updateDownloadUpdate: createMock('updateDownloadUpdate', undefined),
  updateQuitAndInstall: createMock('updateQuitAndInstall', undefined),
  updateGetStatus: createMock('updateGetStatus', {
    checking: false,
    available: false,
    downloaded: false,
    downloading: false,
    error: null,
    progress: 0,
    updateInfo: null,
  }),
  updateGetUpdateInfo: createMock('updateGetUpdateInfo', null),
  updateGetCurrentVersion: createMock('updateGetCurrentVersion', '0.1.0'),
  updateGetReleaseNotes: createMock('updateGetReleaseNotes', ''),
  updateSetAutoDownload: createMock('updateSetAutoDownload', undefined),
  updateSetAllowPrerelease: createMock('updateSetAllowPrerelease', undefined),
  updateResetStatus: createMock('updateResetStatus', undefined),
  onUpdateEvent: createEventMock('onUpdateEvent'),
};

// Inject mocks into window.electronAPI
if (typeof window !== 'undefined') {
  (window as { electronAPI?: typeof electronMocks }).electronAPI = electronMocks;
}

export default electronMocks;
