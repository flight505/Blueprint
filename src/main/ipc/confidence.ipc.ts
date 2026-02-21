import { ipcMain } from 'electron';
import { confidenceScoringService } from '../services/ConfidenceScoringService';
import type {
  ParagraphConfidence,
  DocumentConfidence,
  ConfidenceScoringConfig,
  ConfidenceStreamUpdate,
} from '../../shared/types';

export function register() {
  // Confidence Scoring handlers
  ipcMain.handle('confidence:computeParagraph', (
    _,
    text: string,
    paragraphIndex?: number
  ): ParagraphConfidence => {
    return confidenceScoringService.computeParagraphConfidence(text, paragraphIndex);
  });

  ipcMain.handle('confidence:computeDocument', (
    _,
    content: string,
    documentPath?: string
  ): DocumentConfidence => {
    return confidenceScoringService.computeDocumentConfidence(content, documentPath);
  });

  ipcMain.handle('confidence:getCached', (
    _,
    documentPath: string
  ): DocumentConfidence | undefined => {
    return confidenceScoringService.getCachedDocumentConfidence(documentPath);
  });

  ipcMain.handle('confidence:clearCache', (
    _,
    documentPath?: string
  ): void => {
    confidenceScoringService.clearCache(documentPath);
  });

  ipcMain.handle('confidence:getThreshold', (): number => {
    return confidenceScoringService.getLowConfidenceThreshold();
  });

  ipcMain.handle('confidence:setThreshold', (
    _,
    threshold: number
  ): void => {
    confidenceScoringService.setLowConfidenceThreshold(threshold);
  });

  ipcMain.handle('confidence:getConfig', (): ConfidenceScoringConfig => {
    return confidenceScoringService.getConfig();
  });

  ipcMain.handle('confidence:updateConfig', (
    _,
    config: Partial<ConfidenceScoringConfig>
  ): void => {
    confidenceScoringService.updateConfig(config);
  });

  ipcMain.handle('confidence:processStreaming', (
    event,
    sessionId: string,
    newText: string,
    fullText: string
  ): void => {
    confidenceScoringService.processStreamingText(
      sessionId,
      newText,
      fullText,
      (update: ConfidenceStreamUpdate) => {
        event.sender.send('confidence:streamUpdate', update);
      }
    );
  });
}
