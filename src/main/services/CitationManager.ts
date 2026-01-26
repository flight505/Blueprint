import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Citation metadata as stored in .citations.json sidecar files
 */
export interface Citation {
  id: string;
  /** Citation number for IEEE format [1], [2], etc. */
  number: number;
  /** Source URL */
  url: string;
  /** Title of the source */
  title: string;
  /** Author(s) if available */
  authors?: string[];
  /** Publication date if available */
  date?: string;
  /** Publisher or website name */
  publisher?: string;
  /** Access date (when the citation was retrieved) */
  accessedAt: string;
  /** Provider that found this citation (perplexity, gemini, manual) */
  source: 'perplexity' | 'gemini' | 'manual' | 'imported';
  /** Locations in the document where this citation is used */
  usages: CitationUsage[];
}

/**
 * Where a citation is used in the document
 */
export interface CitationUsage {
  /** The claim or text that this citation supports */
  claim: string;
  /** Line number in the document (1-indexed) */
  line?: number;
  /** Character offset from start of document */
  offset?: number;
}

/**
 * Structure of the .citations.json sidecar file
 */
export interface CitationFile {
  /** Version of the citation file format */
  version: '1.0';
  /** Path to the document this citation file belongs to */
  documentPath: string;
  /** When the citation file was last updated */
  updatedAt: string;
  /** All citations for this document */
  citations: Citation[];
  /** Next citation number to assign */
  nextNumber: number;
}

/**
 * Options for generating a reference list
 */
export interface ReferenceListOptions {
  /** Format for the reference list */
  format: 'ieee' | 'apa' | 'mla' | 'chicago';
  /** Include URLs in the reference list */
  includeUrls?: boolean;
  /** Include access dates */
  includeAccessDates?: boolean;
}

/**
 * A formatted reference for export
 */
export interface FormattedReference {
  number: number;
  text: string;
  url?: string;
}

/**
 * Input for adding a new citation
 */
export interface AddCitationInput {
  url: string;
  title: string;
  authors?: string[];
  date?: string;
  publisher?: string;
  source: Citation['source'];
  claim?: string;
  line?: number;
  offset?: number;
}

/**
 * CitationManager handles citation storage, IEEE formatting, and reference list generation.
 * Citations are stored in .citations.json sidecar files alongside documents.
 */
class CitationManager {
  /**
   * Get the path to the citation sidecar file for a document
   */
  getCitationFilePath(documentPath: string): string {
    const dir = path.dirname(documentPath);
    const baseName = path.basename(documentPath, path.extname(documentPath));
    return path.join(dir, `${baseName}.citations.json`);
  }

  /**
   * Load citations for a document, creating a new file if it doesn't exist
   */
  async loadCitations(documentPath: string): Promise<CitationFile> {
    const citationPath = this.getCitationFilePath(documentPath);

    try {
      const content = await fs.promises.readFile(citationPath, 'utf-8');
      const data = JSON.parse(content) as CitationFile;
      return data;
    } catch {
      // File doesn't exist or is invalid, create a new one
      return this.createCitationFile(documentPath);
    }
  }

  /**
   * Create a new citation file structure
   */
  private createCitationFile(documentPath: string): CitationFile {
    return {
      version: '1.0',
      documentPath,
      updatedAt: new Date().toISOString(),
      citations: [],
      nextNumber: 1,
    };
  }

  /**
   * Save citations to the sidecar file
   */
  async saveCitations(documentPath: string, citationFile: CitationFile): Promise<void> {
    const citationPath = this.getCitationFilePath(documentPath);
    citationFile.updatedAt = new Date().toISOString();
    await fs.promises.writeFile(citationPath, JSON.stringify(citationFile, null, 2), 'utf-8');
  }

  /**
   * Add a new citation to a document
   */
  async addCitation(documentPath: string, input: AddCitationInput): Promise<Citation> {
    const citationFile = await this.loadCitations(documentPath);

    // Check if this URL already exists
    const existing = citationFile.citations.find(c => c.url === input.url);
    if (existing) {
      // Add a new usage if claim is provided
      if (input.claim) {
        existing.usages.push({
          claim: input.claim,
          line: input.line,
          offset: input.offset,
        });
        await this.saveCitations(documentPath, citationFile);
      }
      return existing;
    }

    // Create new citation
    const citation: Citation = {
      id: this.generateId(),
      number: citationFile.nextNumber,
      url: input.url,
      title: input.title,
      authors: input.authors,
      date: input.date,
      publisher: input.publisher,
      accessedAt: new Date().toISOString(),
      source: input.source,
      usages: input.claim ? [{
        claim: input.claim,
        line: input.line,
        offset: input.offset,
      }] : [],
    };

    citationFile.citations.push(citation);
    citationFile.nextNumber++;
    await this.saveCitations(documentPath, citationFile);

    return citation;
  }

  /**
   * Add multiple citations at once (from research responses)
   */
  async addCitations(documentPath: string, inputs: AddCitationInput[]): Promise<Citation[]> {
    const results: Citation[] = [];
    for (const input of inputs) {
      const citation = await this.addCitation(documentPath, input);
      results.push(citation);
    }
    return results;
  }

  /**
   * Update a citation's metadata
   */
  async updateCitation(documentPath: string, citationId: string, updates: Partial<AddCitationInput>): Promise<Citation | null> {
    const citationFile = await this.loadCitations(documentPath);
    const citation = citationFile.citations.find(c => c.id === citationId);

    if (!citation) return null;

    if (updates.url !== undefined) citation.url = updates.url;
    if (updates.title !== undefined) citation.title = updates.title;
    if (updates.authors !== undefined) citation.authors = updates.authors;
    if (updates.date !== undefined) citation.date = updates.date;
    if (updates.publisher !== undefined) citation.publisher = updates.publisher;

    await this.saveCitations(documentPath, citationFile);
    return citation;
  }

  /**
   * Remove a citation from a document
   */
  async removeCitation(documentPath: string, citationId: string): Promise<boolean> {
    const citationFile = await this.loadCitations(documentPath);
    const index = citationFile.citations.findIndex(c => c.id === citationId);

    if (index === -1) return false;

    citationFile.citations.splice(index, 1);
    // Re-number remaining citations
    this.renumberCitations(citationFile);
    await this.saveCitations(documentPath, citationFile);

    return true;
  }

  /**
   * Add a usage to an existing citation
   */
  async addUsage(documentPath: string, citationId: string, usage: CitationUsage): Promise<boolean> {
    const citationFile = await this.loadCitations(documentPath);
    const citation = citationFile.citations.find(c => c.id === citationId);

    if (!citation) return false;

    citation.usages.push(usage);
    await this.saveCitations(documentPath, citationFile);

    return true;
  }

  /**
   * Get a citation by its number (e.g., [1] -> citation #1)
   */
  async getCitationByNumber(documentPath: string, number: number): Promise<Citation | null> {
    const citationFile = await this.loadCitations(documentPath);
    return citationFile.citations.find(c => c.number === number) || null;
  }

  /**
   * Re-number citations after a removal to maintain sequential IEEE numbering
   */
  private renumberCitations(citationFile: CitationFile): void {
    citationFile.citations.sort((a, b) => a.number - b.number);
    citationFile.citations.forEach((c, i) => {
      c.number = i + 1;
    });
    citationFile.nextNumber = citationFile.citations.length + 1;
  }

  /**
   * Format a citation reference in IEEE format
   * Format: [#] A. Author, B. Author, "Title," Publisher, date. [Online]. Available: URL. [Accessed: date].
   */
  formatIEEE(citation: Citation, options: { includeUrl?: boolean; includeAccessDate?: boolean } = {}): string {
    const { includeUrl = true, includeAccessDate = true } = options;
    const parts: string[] = [];

    // Citation number
    parts.push(`[${citation.number}]`);

    // Authors
    if (citation.authors && citation.authors.length > 0) {
      const formattedAuthors = citation.authors.map(author => {
        const nameParts = author.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          // Format as "F. Last" for IEEE
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          return `${firstName.charAt(0)}. ${lastName}`;
        }
        return author;
      });

      if (formattedAuthors.length === 1) {
        parts.push(formattedAuthors[0]);
      } else if (formattedAuthors.length === 2) {
        parts.push(formattedAuthors.join(' and '));
      } else {
        parts.push(`${formattedAuthors.slice(0, -1).join(', ')}, and ${formattedAuthors[formattedAuthors.length - 1]}`);
      }
      parts[parts.length - 1] += ',';
    }

    // Title in quotes
    parts.push(`"${citation.title},"`);

    // Publisher
    if (citation.publisher) {
      parts.push(`${citation.publisher},`);
    }

    // Date
    if (citation.date) {
      parts.push(`${citation.date}.`);
    } else {
      // Remove trailing comma from previous part and add period
      if (parts.length > 0) {
        parts[parts.length - 1] = parts[parts.length - 1].replace(/,$/, '.');
      }
    }

    // Online availability
    if (includeUrl && citation.url) {
      parts.push('[Online]. Available:');
      parts.push(citation.url);
    }

    // Access date
    if (includeAccessDate && citation.accessedAt) {
      const accessDate = new Date(citation.accessedAt);
      const formattedDate = accessDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      parts.push(`[Accessed: ${formattedDate}]`);
    }

    return parts.join(' ');
  }

  /**
   * Format a citation reference in APA format
   * Format: Author, A. A., & Author, B. B. (Year). Title. Publisher. URL
   */
  formatAPA(citation: Citation, options: { includeUrl?: boolean } = {}): string {
    const { includeUrl = true } = options;
    const parts: string[] = [];

    // Authors
    if (citation.authors && citation.authors.length > 0) {
      const formattedAuthors = citation.authors.map(author => {
        const nameParts = author.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          const firstName = nameParts[0];
          const lastName = nameParts[nameParts.length - 1];
          return `${lastName}, ${firstName.charAt(0)}.`;
        }
        return author;
      });

      if (formattedAuthors.length === 1) {
        parts.push(formattedAuthors[0]);
      } else if (formattedAuthors.length === 2) {
        parts.push(formattedAuthors.join(' & '));
      } else {
        parts.push(`${formattedAuthors.slice(0, -1).join(', ')}, & ${formattedAuthors[formattedAuthors.length - 1]}`);
      }
    }

    // Date in parentheses
    const year = citation.date ? citation.date.match(/\d{4}/)?.[0] || 'n.d.' : 'n.d.';
    parts.push(`(${year}).`);

    // Title (italicized in final output, just plain here)
    parts.push(`${citation.title}.`);

    // Publisher
    if (citation.publisher) {
      parts.push(`${citation.publisher}.`);
    }

    // URL
    if (includeUrl && citation.url) {
      parts.push(citation.url);
    }

    return parts.join(' ');
  }

  /**
   * Generate a complete reference list for a document
   */
  async generateReferenceList(
    documentPath: string,
    options: ReferenceListOptions = { format: 'ieee' }
  ): Promise<FormattedReference[]> {
    const citationFile = await this.loadCitations(documentPath);
    const { format, includeUrls = true, includeAccessDates = true } = options;

    return citationFile.citations
      .sort((a, b) => a.number - b.number)
      .map(citation => {
        let text: string;

        switch (format) {
          case 'apa':
            text = this.formatAPA(citation, { includeUrl: includeUrls });
            break;
          case 'ieee':
          default:
            text = this.formatIEEE(citation, { includeUrl: includeUrls, includeAccessDate: includeAccessDates });
            break;
        }

        return {
          number: citation.number,
          text,
          url: includeUrls ? citation.url : undefined,
        };
      });
  }

  /**
   * Generate reference list as markdown
   */
  async generateReferenceListMarkdown(
    documentPath: string,
    options: ReferenceListOptions = { format: 'ieee' }
  ): Promise<string> {
    const references = await this.generateReferenceList(documentPath, options);

    if (references.length === 0) {
      return '';
    }

    const lines = ['## References', ''];

    for (const ref of references) {
      lines.push(ref.text);
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Insert IEEE citation markers into text
   * Converts citation IDs to [n] format
   */
  formatTextWithCitations(text: string, citations: Citation[]): string {
    let result = text;

    // Create a map of URL -> citation number for quick lookup
    const urlToNumber = new Map<string, number>();
    for (const citation of citations) {
      urlToNumber.set(citation.url, citation.number);
    }

    // Replace any inline URLs with citation markers if they match known citations
    for (const [url, number] of urlToNumber) {
      // Replace markdown links [text](url) with text[n]
      const linkPattern = new RegExp(`\\[([^\\]]+)\\]\\(${escapeRegExp(url)}\\)`, 'g');
      result = result.replace(linkPattern, `$1 [${number}]`);

      // Replace bare URLs
      const bareUrlPattern = new RegExp(`(?<![\\[\\(])${escapeRegExp(url)}(?![\\]\\)])`, 'g');
      result = result.replace(bareUrlPattern, `[${number}]`);
    }

    return result;
  }

  /**
   * Check if a citation file exists for a document
   */
  async hasCitations(documentPath: string): Promise<boolean> {
    const citationPath = this.getCitationFilePath(documentPath);
    try {
      await fs.promises.access(citationPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get citation count for a document
   */
  async getCitationCount(documentPath: string): Promise<number> {
    const citationFile = await this.loadCitations(documentPath);
    return citationFile.citations.length;
  }

  /**
   * Delete the citation file for a document
   */
  async deleteCitationFile(documentPath: string): Promise<boolean> {
    const citationPath = this.getCitationFilePath(documentPath);
    try {
      await fs.promises.unlink(citationPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate a unique ID for citations
   */
  private generateId(): string {
    return `cit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export singleton instance
export const citationManager = new CitationManager();
