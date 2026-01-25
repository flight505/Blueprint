/**
 * Context Panel - Token Visualizer with Semantic Search
 *
 * Displays context files used by the AI agent, token usage,
 * and allows toggling context inclusion. Supports semantic search
 * to find relevant context based on user queries.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';

// Context item representing a file or document in the context
export interface ContextItem {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  tokenCount: number;
  isIncluded: boolean;
  relevanceScore?: number; // 0.0 - 1.0 from semantic search
  source: 'file' | 'document' | 'search';
}

// Token usage information
export interface TokenUsage {
  current: number;
  max: number;
  percentage: number;
}

// Props for the ContextPanel component
interface ContextPanelProps {
  sessionId?: string | null;
  maxTokens?: number;
  onSearch?: (query: string) => Promise<ContextItem[]>;
  className?: string;
}

// Simple token estimation (roughly 4 characters per token for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Format token count for display
function formatTokenCount(count: number): string {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
}

// Get color class based on relevance score
function getRelevanceColor(score?: number): string {
  if (score === undefined) return 'text-gray-400';
  if (score >= 0.8) return 'text-green-500';
  if (score >= 0.6) return 'text-yellow-500';
  if (score >= 0.4) return 'text-orange-500';
  return 'text-red-500';
}

// Get progress bar color based on usage percentage
function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-blue-500';
}

export default function ContextPanel({
  sessionId,
  maxTokens = 200000, // Default Claude max context
  onSearch,
  className = '',
}: ContextPanelProps) {
  // Context items state
  const [contextItems, setContextItems] = useState<ContextItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContextItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Calculate token usage from included context items
  const tokenUsage = useMemo<TokenUsage>(() => {
    const includedItems = contextItems.filter(item => item.isIncluded);
    const current = includedItems.reduce((sum, item) => sum + item.tokenCount, 0);
    const percentage = Math.round((current / maxTokens) * 100);
    return { current, max: maxTokens, percentage };
  }, [contextItems, maxTokens]);

  // Load context documents when session changes
  useEffect(() => {
    if (!sessionId) {
      setContextItems([]);
      return;
    }

    async function loadContextDocuments() {
      setIsLoading(true);
      try {
        const documents = await window.electronAPI.dbGetDocumentsBySession(sessionId!);
        const items: ContextItem[] = documents.map(doc => ({
          id: doc.id,
          filePath: doc.filePath,
          fileName: doc.filePath.split('/').pop() || doc.filePath,
          content: doc.content,
          tokenCount: estimateTokens(doc.content),
          isIncluded: true,
          source: 'document',
        }));
        setContextItems(items);
      } catch (error) {
        console.error('Failed to load context documents:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadContextDocuments();
  }, [sessionId]);

  // Toggle context item inclusion
  const toggleItemInclusion = useCallback((itemId: string) => {
    setContextItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, isIncluded: !item.isIncluded } : item
      )
    );
  }, []);

  // Handle semantic search
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim() || !sessionId) return;

    setIsSearching(true);
    try {
      if (onSearch) {
        // Use provided search handler
        const results = await onSearch(searchQuery);
        setSearchResults(results);
      } else {
        // Use database semantic search if embedding is available
        // For now, use simple text-based filtering as fallback
        const filtered = contextItems.filter(
          item =>
            item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
        // Add mock relevance scores for display
        const withScores = filtered.map((item, index) => ({
          ...item,
          relevanceScore: Math.max(0.3, 1 - index * 0.1),
        }));
        setSearchResults(withScores.slice(0, 10));
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, sessionId, onSearch, contextItems]);

  // Clear search results
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
  }, []);

  // Add search result to context
  const addToContext = useCallback((item: ContextItem) => {
    setContextItems(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        // Already in context, ensure it's included
        return prev.map(i =>
          i.id === item.id ? { ...i, isIncluded: true } : i
        );
      }
      // Add new item
      return [...prev, { ...item, isIncluded: true }];
    });
    // Remove from search results
    setSearchResults(prev => prev.filter(i => i.id !== item.id));
  }, []);

  // Remove item from context
  const removeFromContext = useCallback((itemId: string) => {
    setContextItems(prev => prev.filter(item => item.id !== itemId));
  }, []);

  // Render token usage bar
  const renderTokenBar = () => (
    <div className="mb-4 px-4">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Token Usage
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-500">
          {formatTokenCount(tokenUsage.current)} / {formatTokenCount(tokenUsage.max)}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getUsageColor(tokenUsage.percentage)}`}
          style={{ width: `${Math.min(tokenUsage.percentage, 100)}%` }}
          role="progressbar"
          aria-valuenow={tokenUsage.current}
          aria-valuemin={0}
          aria-valuemax={tokenUsage.max}
          aria-label={`Token usage: ${tokenUsage.percentage}%`}
        />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1 text-right">
        {tokenUsage.percentage}% used
      </div>
    </div>
  );

  // Render search input
  const renderSearchInput = () => (
    <div className="mb-4 px-4">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSearch();
            if (e.key === 'Escape') clearSearch();
          }}
          placeholder="Search context..."
          className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          aria-label="Search context documents"
        />
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
          🔍
        </span>
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>
      {isSearching && (
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Searching...
        </div>
      )}
    </div>
  );

  // Render context item
  const renderContextItem = (item: ContextItem, showRelevance = false) => (
    <div
      key={item.id}
      className={`px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 ${
        item.isIncluded ? '' : 'opacity-50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => toggleItemInclusion(item.id)}
            className={`w-4 h-4 flex-shrink-0 rounded border ${
              item.isIncluded
                ? 'bg-blue-500 border-blue-500 text-white'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            aria-label={item.isIncluded ? 'Exclude from context' : 'Include in context'}
            aria-pressed={item.isIncluded}
          >
            {item.isIncluded && <span className="text-xs">✓</span>}
          </button>
          <span className="text-sm truncate" title={item.filePath}>
            {item.fileName}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {showRelevance && item.relevanceScore !== undefined && (
            <span
              className={`text-xs font-mono ${getRelevanceColor(item.relevanceScore)}`}
              title={`Relevance: ${(item.relevanceScore * 100).toFixed(0)}%`}
            >
              {(item.relevanceScore * 100).toFixed(0)}%
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTokenCount(item.tokenCount)}
          </span>
          <button
            onClick={() => removeFromContext(item.id)}
            className="text-gray-400 hover:text-red-500"
            aria-label={`Remove ${item.fileName} from context`}
          >
            ×
          </button>
        </div>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 ml-6 truncate" title={item.filePath}>
        {item.filePath}
      </div>
    </div>
  );

  // Render search result item
  const renderSearchResultItem = (item: ContextItem) => (
    <div
      key={item.id}
      className="px-4 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm truncate" title={item.filePath}>
            {item.fileName}
          </span>
          {item.relevanceScore !== undefined && (
            <span
              className={`text-xs font-mono ${getRelevanceColor(item.relevanceScore)}`}
              title={`Relevance: ${(item.relevanceScore * 100).toFixed(0)}%`}
            >
              {(item.relevanceScore * 100).toFixed(0)}%
            </span>
          )}
        </div>
        <button
          onClick={() => addToContext(item)}
          className="text-xs px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
          aria-label={`Add ${item.fileName} to context`}
        >
          Add
        </button>
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={item.filePath}>
        {item.filePath}
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-medium text-sm">Context</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {contextItems.filter(i => i.isIncluded).length} items included
        </p>
      </div>

      {/* Token Usage Bar */}
      <div className="pt-3">
        {renderTokenBar()}
      </div>

      {/* Search Input */}
      {renderSearchInput()}

      {/* Search Results (when searching) */}
      {searchResults.length > 0 && (
        <div className="mb-4">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              Search Results ({searchResults.length})
            </span>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {searchResults.map(item => renderSearchResultItem(item))}
          </div>
        </div>
      )}

      {/* Context Items List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading context...
          </div>
        ) : contextItems.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">No context files</p>
            <p className="text-xs mt-1">Add files to the session to see them here</p>
          </div>
        ) : (
          <div>
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-y border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Included Context
              </span>
            </div>
            {contextItems.map(item => renderContextItem(item, true))}
          </div>
        )}
      </div>

      {/* Footer with actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setContextItems(prev => prev.map(item => ({ ...item, isIncluded: true })));
            }}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={contextItems.length === 0}
          >
            Include All
          </button>
          <button
            onClick={() => {
              setContextItems(prev => prev.map(item => ({ ...item, isIncluded: false })));
            }}
            className="flex-1 text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={contextItems.length === 0}
          >
            Exclude All
          </button>
        </div>
      </div>
    </div>
  );
}
