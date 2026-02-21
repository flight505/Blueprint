import { ipcMain } from 'electron';
import { reviewQueueService } from '../services/ReviewQueueService';
import type {
  DocumentReviewQueue,
  ReviewItem,
  ReviewScanOptions,
} from '../../shared/types';

export function register() {
  // Review Queue handlers
  ipcMain.handle('review:scanDocument', async (
    _,
    documentPath: string,
    content: string,
    options?: ReviewScanOptions
  ): Promise<DocumentReviewQueue> => {
    return await reviewQueueService.scanDocument(documentPath, content, options);
  });

  ipcMain.handle('review:getQueue', (
    _,
    documentPath: string
  ): DocumentReviewQueue | undefined => {
    return reviewQueueService.getQueue(documentPath);
  });

  ipcMain.handle('review:getItem', (
    _,
    documentPath: string,
    itemId: string
  ): ReviewItem | undefined => {
    return reviewQueueService.getItem(documentPath, itemId);
  });

  ipcMain.handle('review:getPendingItems', (
    _,
    documentPath: string
  ): ReviewItem[] => {
    return reviewQueueService.getPendingItems(documentPath);
  });

  ipcMain.handle('review:acceptItem', (
    _,
    documentPath: string,
    itemId: string
  ): ReviewItem | undefined => {
    return reviewQueueService.acceptItem(documentPath, itemId);
  });

  ipcMain.handle('review:editItem', (
    _,
    documentPath: string,
    itemId: string,
    editedText: string
  ): ReviewItem | undefined => {
    return reviewQueueService.editItem(documentPath, itemId, editedText);
  });

  ipcMain.handle('review:removeItem', (
    _,
    documentPath: string,
    itemId: string,
    reason?: string
  ): ReviewItem | undefined => {
    return reviewQueueService.removeItem(documentPath, itemId, reason);
  });

  ipcMain.handle('review:dismissItem', (
    _,
    documentPath: string,
    itemId: string
  ): ReviewItem | undefined => {
    return reviewQueueService.dismissItem(documentPath, itemId);
  });

  ipcMain.handle('review:clearQueue', (
    _,
    documentPath: string
  ): void => {
    reviewQueueService.clearQueue(documentPath);
  });

  ipcMain.handle('review:getDocumentsWithPendingReviews', (): string[] => {
    return reviewQueueService.getDocumentsWithPendingReviews();
  });

  ipcMain.handle('review:getThreshold', (): number => {
    return reviewQueueService.getConfidenceThreshold();
  });

  ipcMain.handle('review:setThreshold', (
    _,
    threshold: number
  ): void => {
    reviewQueueService.setConfidenceThreshold(threshold);
  });
}
