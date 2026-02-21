import { ipcMain } from 'electron';
import { citationManager, type Citation } from '../services/CitationManager';
import { citationVerificationService } from '../services/CitationVerificationService';
import { citationAttachmentService } from '../services/CitationAttachmentService';
import type {
  CitationFile,
  AddCitationInput,
  ReferenceListOptions,
  FormattedReference,
  CitationVerificationResult,
  CitationVerificationQuery,
  CitationVerificationCacheStats,
  RAGSource,
  AttachmentResult,
  AttachmentOptions,
  SourceClaimLink,
} from '../../shared/types';

export function register() {
  // Citation manager handlers
  ipcMain.handle('citation:loadCitations', async (_, documentPath: string): Promise<CitationFile> => {
    return await citationManager.loadCitations(documentPath);
  });

  ipcMain.handle('citation:saveCitations', async (_, documentPath: string, citationFile: CitationFile): Promise<void> => {
    await citationManager.saveCitations(documentPath, citationFile);
  });

  ipcMain.handle('citation:addCitation', async (_, documentPath: string, input: AddCitationInput): Promise<Citation> => {
    return await citationManager.addCitation(documentPath, input);
  });

  ipcMain.handle('citation:addCitations', async (_, documentPath: string, inputs: AddCitationInput[]): Promise<Citation[]> => {
    return await citationManager.addCitations(documentPath, inputs);
  });

  ipcMain.handle('citation:updateCitation', async (_, documentPath: string, citationId: string, updates: Partial<AddCitationInput>): Promise<Citation | null> => {
    return await citationManager.updateCitation(documentPath, citationId, updates);
  });

  ipcMain.handle('citation:removeCitation', async (_, documentPath: string, citationId: string): Promise<boolean> => {
    return await citationManager.removeCitation(documentPath, citationId);
  });

  ipcMain.handle('citation:addUsage', async (_, documentPath: string, citationId: string, usage: { claim: string; line?: number; offset?: number }): Promise<boolean> => {
    return await citationManager.addUsage(documentPath, citationId, usage);
  });

  ipcMain.handle('citation:getCitationByNumber', async (_, documentPath: string, number: number): Promise<Citation | null> => {
    return await citationManager.getCitationByNumber(documentPath, number);
  });

  ipcMain.handle('citation:generateReferenceList', async (_, documentPath: string, options?: ReferenceListOptions): Promise<FormattedReference[]> => {
    return await citationManager.generateReferenceList(documentPath, options);
  });

  ipcMain.handle('citation:generateReferenceListMarkdown', async (_, documentPath: string, options?: ReferenceListOptions): Promise<string> => {
    return await citationManager.generateReferenceListMarkdown(documentPath, options);
  });

  ipcMain.handle('citation:formatTextWithCitations', (_, text: string, citations: Citation[]): string => {
    return citationManager.formatTextWithCitations(text, citations);
  });

  ipcMain.handle('citation:hasCitations', async (_, documentPath: string): Promise<boolean> => {
    return await citationManager.hasCitations(documentPath);
  });

  ipcMain.handle('citation:getCitationCount', async (_, documentPath: string): Promise<number> => {
    return await citationManager.getCitationCount(documentPath);
  });

  ipcMain.handle('citation:deleteCitationFile', async (_, documentPath: string): Promise<boolean> => {
    return await citationManager.deleteCitationFile(documentPath);
  });

  ipcMain.handle('citation:getCitationFilePath', (_, documentPath: string): string => {
    return citationManager.getCitationFilePath(documentPath);
  });

  // Citation verification handlers (OpenAlex + Crossref APIs)
  ipcMain.handle('citationVerification:verifyCitation', async (_, query: CitationVerificationQuery): Promise<CitationVerificationResult> => {
    return await citationVerificationService.verifyCitation(query);
  });

  ipcMain.handle('citationVerification:verifyCitations', async (_, queries: CitationVerificationQuery[]): Promise<Map<number, CitationVerificationResult>> => {
    return await citationVerificationService.verifyCitations(queries);
  });

  ipcMain.handle('citationVerification:clearCache', (): number => {
    return citationVerificationService.clearCache();
  });

  ipcMain.handle('citationVerification:getCacheStats', (): CitationVerificationCacheStats => {
    return citationVerificationService.getCacheStats();
  });

  // Citation Attachment handlers
  ipcMain.handle('citationAttachment:attachCitations', async (
    _,
    documentPath: string,
    generatedText: string,
    sources: RAGSource[],
    options?: AttachmentOptions
  ): Promise<AttachmentResult> => {
    return await citationAttachmentService.attachCitations(documentPath, generatedText, sources, options);
  });

  ipcMain.handle('citationAttachment:relocateCitations', async (
    _,
    documentPath: string,
    newText: string
  ): Promise<{ relocated: number; lost: number }> => {
    return await citationAttachmentService.relocateCitationsAfterEdit(documentPath, newText);
  });

  ipcMain.handle('citationAttachment:getSourceClaimLinks', async (
    _,
    documentPath: string
  ): Promise<SourceClaimLink[]> => {
    return await citationAttachmentService.getSourceClaimLinks(documentPath);
  });

  ipcMain.handle('citationAttachment:cleanupOrphanedLinks', async (
    _,
    documentPath: string
  ): Promise<number> => {
    return await citationAttachmentService.cleanupOrphanedLinks(documentPath);
  });

  ipcMain.handle('citationAttachment:convertResearchCitations', (
    _,
    citations: Array<{ url: string; title?: string; snippet?: string; domain?: string }>,
    provider: 'perplexity' | 'gemini'
  ): RAGSource[] => {
    return citationAttachmentService.convertResearchCitations(citations, provider);
  });
}
