import { ipcMain } from 'electron';
import { openRouterService, type ResearchResponse, type ResearchOptions, type StreamChunk as OpenRouterStreamChunk } from '../services/OpenRouterService';
import { geminiService, type DeepResearchResponse, type DeepResearchOptions, type GeminiStreamChunk, type ProgressCheckpoint } from '../services/GeminiService';
import { researchRouter, type ResearchMode, type ProjectPhase, type ResearchProvider, type UnifiedResearchResponse, type RoutedResearchOptions, type UnifiedStreamChunk } from '../services/ResearchRouter';

export function register() {
  // OpenRouter service handlers (Perplexity via OpenRouter)
  ipcMain.handle('openRouter:initialize', async (_, apiKey: string): Promise<boolean> => {
    return await openRouterService.initialize(apiKey);
  });

  ipcMain.handle('openRouter:isInitialized', (): boolean => {
    return openRouterService.isInitialized();
  });

  ipcMain.handle('openRouter:validateApiKey', async (_, apiKey: string): Promise<boolean> => {
    return await openRouterService.validateApiKey(apiKey);
  });

  ipcMain.handle('openRouter:research', async (_, query: string, options?: ResearchOptions): Promise<ResearchResponse> => {
    return await openRouterService.research(query, options);
  });

  ipcMain.handle('openRouter:researchStream', async (event, query: string, options?: ResearchOptions): Promise<void> => {
    const webContents = event.sender;

    await openRouterService.researchStream(
      query,
      (chunk: OpenRouterStreamChunk) => {
        webContents.send('openRouter:streamChunk', chunk);
      },
      options
    );
  });

  ipcMain.handle('openRouter:getModel', (): string => {
    return openRouterService.getModel();
  });

  // Gemini service handlers (Deep Research)
  ipcMain.handle('gemini:initialize', async (_, apiKey: string): Promise<boolean> => {
    return await geminiService.initialize(apiKey);
  });

  ipcMain.handle('gemini:isInitialized', (): boolean => {
    return geminiService.isInitialized();
  });

  ipcMain.handle('gemini:validateApiKey', async (_, apiKey: string): Promise<boolean> => {
    return await geminiService.validateApiKey(apiKey);
  });

  ipcMain.handle('gemini:deepResearch', async (event, query: string, options?: DeepResearchOptions): Promise<DeepResearchResponse> => {
    const webContents = event.sender;

    // Wrap the options to forward progress events via IPC
    const optionsWithProgress: DeepResearchOptions = {
      ...options,
      onProgress: (progress: ProgressCheckpoint) => {
        webContents.send('gemini:progressCheckpoint', progress);
      },
    };

    return await geminiService.deepResearch(query, optionsWithProgress);
  });

  ipcMain.handle('gemini:deepResearchStream', async (event, query: string, options?: DeepResearchOptions): Promise<void> => {
    const webContents = event.sender;

    await geminiService.deepResearchStream(
      query,
      (chunk: GeminiStreamChunk) => {
        webContents.send('gemini:streamChunk', chunk);
      },
      options
    );
  });

  ipcMain.handle('gemini:getModel', (): string => {
    return geminiService.getModel();
  });

  ipcMain.handle('gemini:getProgressCheckpoints', (): number[] => {
    return geminiService.getProgressCheckpoints();
  });

  // Research router handlers
  ipcMain.handle('researchRouter:getProvider', (_, mode: ResearchMode, phase?: ProjectPhase): ResearchProvider => {
    return researchRouter.getProvider(mode, phase);
  });

  ipcMain.handle('researchRouter:isProviderAvailable', (_, provider: ResearchProvider): boolean => {
    return researchRouter.isProviderAvailable(provider);
  });

  ipcMain.handle('researchRouter:getAvailableProviders', (): ResearchProvider[] => {
    return researchRouter.getAvailableProviders();
  });

  ipcMain.handle('researchRouter:setDefaultMode', (_, mode: ResearchMode): void => {
    researchRouter.setDefaultMode(mode);
  });

  ipcMain.handle('researchRouter:getDefaultMode', (): ResearchMode => {
    return researchRouter.getDefaultMode();
  });

  ipcMain.handle('researchRouter:getPhaseRouting', (_, phase: ProjectPhase) => {
    return researchRouter.getPhaseRouting(phase);
  });

  ipcMain.handle('researchRouter:research', async (_, query: string, options?: RoutedResearchOptions): Promise<UnifiedResearchResponse> => {
    return await researchRouter.research(query, options);
  });

  ipcMain.handle('researchRouter:researchStream', async (event, query: string, options?: RoutedResearchOptions): Promise<void> => {
    const webContents = event.sender;

    await researchRouter.researchStream(
      query,
      (chunk: UnifiedStreamChunk) => {
        webContents.send('researchRouter:streamChunk', chunk);
      },
      options
    );
  });

  ipcMain.handle('researchRouter:getModeDescriptions', () => {
    return researchRouter.getModeDescriptions();
  });

  ipcMain.handle('researchRouter:getPhaseDescriptions', () => {
    return researchRouter.getPhaseDescriptions();
  });

  ipcMain.handle('researchRouter:getAvailableModes', (): ResearchMode[] => {
    return researchRouter.getAvailableModes();
  });

  ipcMain.handle('researchRouter:getProjectPhases', (): ProjectPhase[] => {
    return researchRouter.getProjectPhases();
  });

  // Research cancellation handlers
  ipcMain.handle('researchRouter:startSession', (): string => {
    return researchRouter.startResearchSession();
  });

  ipcMain.handle('researchRouter:cancelResearch', (_, sessionId: string): boolean => {
    return researchRouter.cancelResearch(sessionId);
  });

  ipcMain.handle('researchRouter:endSession', (_, sessionId: string): void => {
    researchRouter.endResearchSession(sessionId);
  });

  ipcMain.handle('researchRouter:getActiveSessions', (): string[] => {
    return researchRouter.getActiveResearchSessions();
  });
}
