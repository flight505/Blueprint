/**
 * ReviewQueue - Human review interface for flagged content
 *
 * Features:
 * - Displays low-confidence sections and unverified citations
 * - Side-by-side comparison of original + sources
 * - Accept/Edit/Remove actions for each flagged item
 * - Summary statistics and progress tracking
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Types from ReviewQueueService (matching main process)
type ReviewItemType = 'low_confidence' | 'unverified_citation' | 'partial_citation';
type ReviewItemStatus = 'pending' | 'accepted' | 'edited' | 'removed' | 'dismissed';

interface ReviewSource {
  id: string;
  type: 'citation' | 'context' | 'generated';
  title?: string;
  url?: string;
  content: string;
  relevanceScore?: number;
}

interface ReviewItemAction {
  type: 'accept' | 'edit' | 'remove' | 'dismiss';
  timestamp: Date;
  editedText?: string;
  reason?: string;
}

interface LowConfidenceReviewItem {
  id: string;
  type: 'low_confidence';
  documentPath: string;
  paragraphIndex: number;
  originalText: string;
  confidence: number;
  indicators: string[];
  sources: ReviewSource[];
  status: ReviewItemStatus;
  action?: ReviewItemAction;
  createdAt: Date;
  updatedAt: Date;
}

interface CitationReviewItem {
  id: string;
  type: 'unverified_citation' | 'partial_citation';
  documentPath: string;
  citationId: string;
  citationNumber: number;
  citationTitle: string;
  citationUrl: string;
  verificationStatus: 'unverified' | 'partial' | 'error';
  verificationConfidence: number;
  sources: ReviewSource[];
  usages: Array<{
    claim: string;
    line?: number;
    offset?: number;
  }>;
  status: ReviewItemStatus;
  action?: ReviewItemAction;
  createdAt: Date;
  updatedAt: Date;
}

type ReviewItem = LowConfidenceReviewItem | CitationReviewItem;

interface DocumentReviewQueue {
  documentPath: string;
  items: ReviewItem[];
  stats: {
    total: number;
    pending: number;
    accepted: number;
    edited: number;
    removed: number;
    dismissed: number;
    lowConfidenceCount: number;
    unverifiedCitationCount: number;
  };
  lastUpdated: Date;
}

interface ReviewQueueProps {
  documentPath: string | null;
  documentContent?: string;
  onScrollToItem?: (item: ReviewItem) => void;
  className?: string;
}

// Get type badge styles
function getTypeBadge(type: ReviewItemType): { text: string; className: string } {
  switch (type) {
    case 'low_confidence':
      return {
        text: 'Low Confidence',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      };
    case 'unverified_citation':
      return {
        text: 'Unverified',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
    case 'partial_citation':
      return {
        text: 'Partial Match',
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      };
  }
}

// Get status badge styles
function getStatusBadge(status: ReviewItemStatus): { text: string; className: string } {
  switch (status) {
    case 'pending':
      return {
        text: 'Pending',
        className: 'bg-surface-raised text-fg',
      };
    case 'accepted':
      return {
        text: 'Accepted',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    case 'edited':
      return {
        text: 'Edited',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      };
    case 'removed':
      return {
        text: 'Removed',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
    case 'dismissed':
      return {
        text: 'Dismissed',
        className: 'bg-surface-raised text-fg-muted',
      };
  }
}

// Format confidence percentage
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

export default function ReviewQueue({
  documentPath,
  documentContent,
  onScrollToItem,
  className = '',
}: ReviewQueueProps) {
  const [queue, setQueue] = useState<DocumentReviewQueue | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | ReviewItemType>('pending');

  // Scan document for flagged items
  const scanDocument = useCallback(async () => {
    if (!documentPath || !documentContent) return;

    setIsScanning(true);
    setError(null);

    try {
      const result = await window.electronAPI.reviewScanDocument(
        documentPath,
        documentContent,
        { confidenceThreshold: 0.6, includePartialCitations: true }
      );
      setQueue(result);
    } catch (err) {
      console.error('Failed to scan document:', err);
      setError('Failed to scan document for review items');
    } finally {
      setIsScanning(false);
    }
  }, [documentPath, documentContent]);

  // Load existing queue or scan when document changes
  useEffect(() => {
    if (!documentPath) {
      setQueue(null);
      return;
    }

    async function loadQueue() {
      setIsLoading(true);
      setError(null);

      try {
        const existingQueue = await window.electronAPI.reviewGetQueue(documentPath!);
        if (existingQueue) {
          setQueue(existingQueue);
        } else if (documentContent) {
          // Auto-scan if no existing queue
          await scanDocument();
        }
      } catch (err) {
        console.error('Failed to load review queue:', err);
        setError('Failed to load review queue');
      } finally {
        setIsLoading(false);
      }
    }

    loadQueue();
  }, [documentPath, documentContent, scanDocument]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (!queue) return [];

    return queue.items.filter(item => {
      if (filter === 'all') return true;
      if (filter === 'pending') return item.status === 'pending';
      return item.type === filter;
    });
  }, [queue, filter]);

  // Handle accept action
  const handleAccept = useCallback(async (itemId: string) => {
    if (!documentPath) return;

    try {
      const result = await window.electronAPI.reviewAcceptItem(documentPath, itemId);
      if (result) {
        setQueue(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map(item => item.id === itemId ? result : item),
            stats: recalculateStats(prev.items.map(item => item.id === itemId ? result : item)),
            lastUpdated: new Date(),
          };
        });
      }
    } catch (err) {
      console.error('Failed to accept item:', err);
    }
  }, [documentPath]);

  // Handle edit action
  const handleEdit = useCallback(async (itemId: string, newText: string) => {
    if (!documentPath) return;

    try {
      const result = await window.electronAPI.reviewEditItem(documentPath, itemId, newText);
      if (result) {
        setQueue(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map(item => item.id === itemId ? result : item),
            stats: recalculateStats(prev.items.map(item => item.id === itemId ? result : item)),
            lastUpdated: new Date(),
          };
        });
        setEditingItemId(null);
        setEditText('');
      }
    } catch (err) {
      console.error('Failed to edit item:', err);
    }
  }, [documentPath]);

  // Handle remove action
  const handleRemove = useCallback(async (itemId: string) => {
    if (!documentPath) return;

    try {
      const result = await window.electronAPI.reviewRemoveItem(documentPath, itemId);
      if (result) {
        setQueue(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map(item => item.id === itemId ? result : item),
            stats: recalculateStats(prev.items.map(item => item.id === itemId ? result : item)),
            lastUpdated: new Date(),
          };
        });
      }
    } catch (err) {
      console.error('Failed to remove item:', err);
    }
  }, [documentPath]);

  // Handle dismiss action
  const handleDismiss = useCallback(async (itemId: string) => {
    if (!documentPath) return;

    try {
      const result = await window.electronAPI.reviewDismissItem(documentPath, itemId);
      if (result) {
        setQueue(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map(item => item.id === itemId ? result : item),
            stats: recalculateStats(prev.items.map(item => item.id === itemId ? result : item)),
            lastUpdated: new Date(),
          };
        });
      }
    } catch (err) {
      console.error('Failed to dismiss item:', err);
    }
  }, [documentPath]);

  // Recalculate stats helper
  function recalculateStats(items: ReviewItem[]): DocumentReviewQueue['stats'] {
    const stats = {
      total: items.length,
      pending: 0,
      accepted: 0,
      edited: 0,
      removed: 0,
      dismissed: 0,
      lowConfidenceCount: 0,
      unverifiedCitationCount: 0,
    };

    for (const item of items) {
      switch (item.status) {
        case 'pending': stats.pending++; break;
        case 'accepted': stats.accepted++; break;
        case 'edited': stats.edited++; break;
        case 'removed': stats.removed++; break;
        case 'dismissed': stats.dismissed++; break;
      }
      if (item.type === 'low_confidence') {
        stats.lowConfidenceCount++;
      } else {
        stats.unverifiedCitationCount++;
      }
    }

    return stats;
  }

  // Start editing an item
  const startEditing = useCallback((item: ReviewItem) => {
    setEditingItemId(item.id);
    setEditText(item.type === 'low_confidence' ? (item as LowConfidenceReviewItem).originalText : '');
  }, []);

  // Render item content
  const renderItemContent = (item: ReviewItem) => {
    if (item.type === 'low_confidence') {
      const lcItem = item as LowConfidenceReviewItem;
      return (
        <div className="space-y-3">
          {/* Confidence indicator */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className={`h-full ${lcItem.confidence >= 0.6 ? 'bg-green-500' : lcItem.confidence >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${lcItem.confidence * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium">{formatConfidence(lcItem.confidence)}</span>
          </div>

          {/* Indicators */}
          {lcItem.indicators.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {lcItem.indicators.map((indicator, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 text-xs rounded-full bg-surface-raised text-fg-secondary"
                >
                  {indicator}
                </span>
              ))}
            </div>
          )}

          {/* Original text */}
          <div className="text-sm text-fg-secondary whitespace-pre-wrap">
            {lcItem.originalText}
          </div>
        </div>
      );
    } else {
      const citItem = item as CitationReviewItem;
      return (
        <div className="space-y-3">
          {/* Citation info */}
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-surface-raised text-sm font-medium">
              [{citItem.citationNumber}]
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-fg">
                {citItem.citationTitle}
              </p>
              {citItem.citationUrl && (
                <a
                  href={citItem.citationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent hover:underline truncate block"
                >
                  {citItem.citationUrl}
                </a>
              )}
            </div>
          </div>

          {/* Verification confidence */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-muted">Verification confidence:</span>
            <div className="flex-1 max-w-32">
              <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className={`h-full ${citItem.verificationConfidence >= 0.6 ? 'bg-green-500' : citItem.verificationConfidence >= 0.4 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${citItem.verificationConfidence * 100}%` }}
                />
              </div>
            </div>
            <span className="text-sm font-medium">{formatConfidence(citItem.verificationConfidence)}</span>
          </div>

          {/* Usages */}
          {citItem.usages.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-fg-secondary">Used in:</p>
              {citItem.usages.map((usage, idx) => (
                <p key={idx} className="text-xs text-fg-muted pl-2 border-l-2 border-border-default">
                  {usage.line && <span className="text-gray-400">Line {usage.line}: </span>}
                  "{usage.claim}"
                </p>
              ))}
            </div>
          )}
        </div>
      );
    }
  };

  // Render side-by-side comparison
  const renderSideBySide = (item: ReviewItem) => {
    if (item.sources.length === 0) return null;

    return (
      <div className="mt-4 border-t border-border-default pt-4">
        <h5 className="text-xs font-medium text-fg-muted mb-3">Sources Comparison</h5>
        <div className="grid grid-cols-2 gap-3">
          {/* Original content */}
          <div className="p-3 rounded-lg bg-surface-raised">
            <p className="text-xs font-medium text-fg-muted mb-2">Original</p>
            <p className="text-sm text-fg-secondary">
              {item.type === 'low_confidence'
                ? (item as LowConfidenceReviewItem).originalText.substring(0, 200) + '...'
                : (item as CitationReviewItem).citationTitle}
            </p>
          </div>

          {/* Sources */}
          <div className="space-y-2">
            {item.sources.slice(0, 2).map((source) => (
              <div key={source.id} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/30">
                <p className="text-xs font-medium text-accent mb-1">
                  {source.title || source.type}
                </p>
                <p className="text-sm text-fg-secondary">
                  {source.content.substring(0, 150)}...
                </p>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline mt-1 block"
                  >
                    View source
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Render empty state
  if (!documentPath) {
    return (
      <div className={`flex flex-col h-full ${className}`}>
        <div className="px-4 py-3 border-b border-border-default">
          <h3 className="font-medium text-sm">Human Review Queue</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 text-center text-fg-muted">
          <div>
            <p className="text-sm">No document selected</p>
            <p className="text-xs mt-1">Open a document to review flagged content</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-default">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-sm">Human Review Queue</h3>
          <button
            onClick={scanDocument}
            disabled={isScanning || !documentContent}
            className="px-2 py-1 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Rescan document"
          >
            {isScanning ? 'Scanning...' : 'Rescan'}
          </button>
        </div>
      </div>

      {/* Stats summary */}
      {queue && (
        <div className="px-4 py-2 bg-surface-raised border-b border-border-default">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>{queue.stats.pending} pending</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>{queue.stats.lowConfidenceCount} low confidence</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>{queue.stats.unverifiedCitationCount} unverified</span>
              </span>
            </div>
            <span className="text-fg-muted">
              {queue.stats.accepted + queue.stats.edited + queue.stats.removed + queue.stats.dismissed}/{queue.stats.total} reviewed
            </span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-4 py-2 flex gap-2 border-b border-border-default overflow-x-auto">
        {(['pending', 'all', 'low_confidence', 'unverified_citation'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              filter === f
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                : 'bg-surface-raised text-fg-muted hover:bg-surface-hover'
            }`}
          >
            {f === 'pending' ? 'Pending' :
             f === 'all' ? 'All' :
             f === 'low_confidence' ? 'Low Confidence' : 'Unverified'}
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Items list */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex items-center justify-center p-8 text-center text-fg-muted">
            <div>
              <p className="text-sm">
                {filter === 'pending' ? 'No pending items' : 'No items found'}
              </p>
              <p className="text-xs mt-1">
                {filter === 'pending'
                  ? 'All flagged items have been reviewed'
                  : 'Try a different filter or rescan the document'}
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border-default">
            {filteredItems.map((item) => {
              const isExpanded = expandedItemId === item.id;
              const isEditing = editingItemId === item.id;
              const typeBadge = getTypeBadge(item.type);
              const statusBadge = getStatusBadge(item.status);

              return (
                <div
                  key={item.id}
                  className="border-b border-border-default last:border-b-0"
                >
                  {/* Item header */}
                  <div
                    className={`px-4 py-3 cursor-pointer hover:bg-surface-hover transition-colors ${
                      item.status !== 'pending' ? 'opacity-60' : ''
                    }`}
                    onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setExpandedItemId(isExpanded ? null : item.id);
                      }
                    }}
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.className}`}>
                            {typeBadge.text}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                            {statusBadge.text}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-fg-secondary line-clamp-2">
                          {item.type === 'low_confidence'
                            ? (item as LowConfidenceReviewItem).originalText.substring(0, 100) + '...'
                            : (item as CitationReviewItem).citationTitle}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4">
                      {/* Item details */}
                      {renderItemContent(item)}

                      {/* Side-by-side comparison */}
                      {renderSideBySide(item)}

                      {/* Edit form */}
                      {isEditing && (
                        <div className="mt-4 space-y-2">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full h-32 p-3 text-sm border border-border-default rounded-lg bg-input text-fg focus:ring-2 focus:ring-accent focus:border-transparent"
                            placeholder="Enter corrected text..."
                            aria-label="Edit text"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => {
                                setEditingItemId(null);
                                setEditText('');
                              }}
                              className="px-3 py-1.5 text-xs rounded border border-border-default hover:bg-surface-hover"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleEdit(item.id, editText)}
                              className="px-3 py-1.5 text-xs rounded bg-blue-500 text-white hover:bg-blue-600"
                            >
                              Save Edit
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      {item.status === 'pending' && !isEditing && (
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAccept(item.id);
                            }}
                            className="px-3 py-1.5 text-xs rounded bg-green-500 text-white hover:bg-green-600 flex items-center gap-1"
                            aria-label="Accept as-is"
                          >
                            <span>&#10003;</span> Accept
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              startEditing(item);
                            }}
                            className="px-3 py-1.5 text-xs rounded bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
                            aria-label="Edit content"
                          >
                            <span>&#9998;</span> Edit
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(item.id);
                            }}
                            className="px-3 py-1.5 text-xs rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                            aria-label="Remove from document"
                          >
                            <span>&#10005;</span> Remove
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDismiss(item.id);
                            }}
                            className="px-3 py-1.5 text-xs rounded border border-border-default hover:bg-surface-hover"
                            aria-label="Dismiss without action"
                          >
                            Dismiss
                          </button>
                          {onScrollToItem && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onScrollToItem(item);
                              }}
                              className="px-3 py-1.5 text-xs rounded border border-border-default hover:bg-surface-hover"
                              aria-label="Go to location in document"
                            >
                              Go to
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
