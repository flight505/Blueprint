export interface ManagedCitation {
  id: string;
  number: number;
  url: string;
  title: string;
  authors?: string[];
  date?: string;
  publisher?: string;
  accessedAt: string;
  source: 'perplexity' | 'gemini' | 'manual' | 'imported';
  usages: CitationUsage[];
}

export interface CitationUsage {
  claim: string;
  line?: number;
  offset?: number;
}

export interface CitationFile {
  version: '1.0';
  documentPath: string;
  updatedAt: string;
  citations: ManagedCitation[];
  nextNumber: number;
}

export interface ReferenceListOptions {
  format: 'ieee' | 'apa' | 'mla' | 'chicago';
  includeUrls?: boolean;
  includeAccessDates?: boolean;
}

export interface FormattedReference {
  number: number;
  text: string;
  url?: string;
}

export interface AddCitationInput {
  url: string;
  title: string;
  authors?: string[];
  date?: string;
  publisher?: string;
  source: ManagedCitation['source'];
  claim?: string;
  line?: number;
  offset?: number;
}

export interface CitationVerificationResult {
  status: 'verified' | 'partial' | 'unverified' | 'error';
  confidence: number;
  source: 'openalex' | 'crossref' | 'cache' | null;
  matchedData?: VerifiedCitationData;
  error?: string;
  fromCache: boolean;
}

export interface VerifiedCitationData {
  doi?: string;
  title?: string;
  authors?: string[];
  year?: number;
  publicationDate?: string;
  venue?: string;
  publisher?: string;
  openAlexId?: string;
  citedByCount?: number;
  abstract?: string;
  type?: string;
}

export interface CitationVerificationQuery {
  title?: string;
  authors?: string[];
  doi?: string;
  year?: number;
  url?: string;
}

export interface CitationVerificationCacheStats {
  totalEntries: number;
  expiredEntries: number;
  cacheSize: number;
}

export interface RAGSource {
  id: string;
  url: string;
  title: string;
  authors?: string[];
  date?: string;
  publisher?: string;
  content: string;
  relevanceScore?: number;
  provider: 'perplexity' | 'gemini' | 'manual' | 'imported';
}

export interface ExtractedClaim {
  text: string;
  startOffset: number;
  endOffset: number;
  line?: number;
  sourceIds: string[];
  confidence?: number;
}

export interface AttachmentResult {
  annotatedText: string;
  claims: ExtractedClaim[];
  addedCitations: ManagedCitation[];
  totalCitations: number;
}

export interface AttachmentOptions {
  insertMarkers?: boolean;
  minRelevance?: number;
  maxCitationsPerClaim?: number;
}

export interface SourceClaimLink {
  citationId: string;
  citationNumber: number;
  claimText: string;
  originalOffset: number;
  originalLine?: number;
  contextHash: string;
  confidence?: number;
}
