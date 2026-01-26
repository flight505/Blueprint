import { spawn } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { citationManager, type ReferenceListOptions } from './CitationManager';

/**
 * Options for PDF generation
 */
export interface PDFGenerationOptions {
  /** Include table of contents */
  includeToc?: boolean;
  /** Include cover page with project metadata */
  includeCoverPage?: boolean;
  /** Cover page metadata */
  coverPage?: CoverPageMetadata;
  /** Include citations/references section */
  includeCitations?: boolean;
  /** Citation format (IEEE, APA, etc.) */
  citationFormat?: 'ieee' | 'apa' | 'mla' | 'chicago';
  /** Output directory (defaults to same as source) */
  outputDir?: string;
  /** Custom output filename (without extension) */
  outputFilename?: string;
  /** Page size (a4, letter, etc.) */
  pageSize?: 'a4' | 'letter' | 'legal';
  /** Margin size */
  margin?: string;
  /** Font size in points */
  fontSize?: number;
  /** Custom CSS for PDF styling */
  customCss?: string;
  /** Include page numbers */
  pageNumbers?: boolean;
  /** PDF metadata */
  pdfMetadata?: PDFMetadata;
}

/**
 * Cover page metadata
 */
export interface CoverPageMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  organization?: string;
  logo?: string; // Path to logo image
}

/**
 * PDF metadata for document properties
 */
export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
}

/**
 * Result of PDF generation
 */
export interface PDFGenerationResult {
  success: boolean;
  outputPath?: string;
  error?: string;
  pageCount?: number;
}

/**
 * Section to include in the PDF
 */
export interface PDFSection {
  title: string;
  content: string;
  order: number;
  includeInToc?: boolean;
}

/**
 * PDFGenerator service handles PDF creation using Pandoc.
 * Supports table of contents, cover pages, and citation formatting.
 */
class PDFGenerator {
  private pandocPath: string | null = null;
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'blueprint-pdf');
  }

  /**
   * Check if Pandoc is available
   */
  async isPandocAvailable(): Promise<boolean> {
    if (this.pandocPath) return true;

    const pandocPath = await this.findPandoc();
    if (pandocPath) {
      this.pandocPath = pandocPath;
      return true;
    }
    return false;
  }

  /**
   * Find Pandoc executable
   */
  private async findPandoc(): Promise<string | null> {
    const commonPaths = [
      '/opt/homebrew/bin/pandoc',
      '/usr/local/bin/pandoc',
      '/usr/bin/pandoc',
      'C:\\Program Files\\Pandoc\\pandoc.exe',
      'C:\\Users\\' + os.userInfo().username + '\\AppData\\Local\\Pandoc\\pandoc.exe',
    ];

    // Try common paths first
    for (const p of commonPaths) {
      try {
        await fs.promises.access(p, fs.constants.X_OK);
        return p;
      } catch {
        continue;
      }
    }

    // Try 'which' or 'where' command
    return new Promise((resolve) => {
      const cmd = process.platform === 'win32' ? 'where' : 'which';
      const child = spawn(cmd, ['pandoc']);
      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0 && output.trim()) {
          resolve(output.trim().split('\n')[0]);
        } else {
          resolve(null);
        }
      });

      child.on('error', () => resolve(null));
    });
  }

  /**
   * Get Pandoc version
   */
  async getPandocVersion(): Promise<string | null> {
    if (!await this.isPandocAvailable()) return null;

    return new Promise((resolve) => {
      const child = spawn(this.pandocPath!, ['--version']);
      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', () => {
        const match = output.match(/pandoc\s+([\d.]+)/);
        resolve(match ? match[1] : null);
      });

      child.on('error', () => resolve(null));
    });
  }

  /**
   * Ensure temp directory exists
   */
  private async ensureTempDir(): Promise<void> {
    try {
      await fs.promises.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Generate a cover page in markdown format
   */
  private generateCoverPage(metadata: CoverPageMetadata): string {
    const lines: string[] = [];

    // Title
    lines.push('');
    lines.push('\\vspace*{3cm}');
    lines.push('');
    lines.push(`# ${metadata.title}`);
    lines.push('');

    // Subtitle
    if (metadata.subtitle) {
      lines.push(`### ${metadata.subtitle}`);
      lines.push('');
    }

    lines.push('\\vspace{2cm}');
    lines.push('');

    // Author
    if (metadata.author) {
      lines.push(`**Author:** ${metadata.author}`);
      lines.push('');
    }

    // Organization
    if (metadata.organization) {
      lines.push(`**Organization:** ${metadata.organization}`);
      lines.push('');
    }

    // Date
    if (metadata.date) {
      lines.push(`**Date:** ${metadata.date}`);
    } else {
      lines.push(`**Date:** ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`);
    }

    lines.push('');
    lines.push('\\newpage');
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate PDF from markdown content
   */
  async generatePDF(
    markdownContent: string,
    outputPath: string,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    // Check Pandoc availability
    if (!await this.isPandocAvailable()) {
      return {
        success: false,
        error: 'Pandoc is not installed. Please install Pandoc to generate PDFs.',
      };
    }

    await this.ensureTempDir();

    try {
      // Build the full content
      let fullContent = '';

      // Add cover page if requested
      if (options.includeCoverPage && options.coverPage) {
        fullContent += this.generateCoverPage(options.coverPage);
      }

      // Add main content
      fullContent += markdownContent;

      // Write temporary markdown file
      const tempMdPath = path.join(this.tempDir, `source-${Date.now()}.md`);
      await fs.promises.writeFile(tempMdPath, fullContent, 'utf-8');

      // Build Pandoc arguments
      const args = this.buildPandocArgs(tempMdPath, outputPath, options);

      // Run Pandoc
      const result = await this.runPandoc(args);

      // Clean up temp file
      try {
        await fs.promises.unlink(tempMdPath);
      } catch {
        // Ignore cleanup errors
      }

      if (!result.success) {
        return result;
      }

      // Get page count if possible
      const pageCount = await this.getPageCount(outputPath);

      return {
        success: true,
        outputPath,
        pageCount,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during PDF generation',
      };
    }
  }

  /**
   * Generate PDF from a document file with citations
   */
  async generatePDFFromDocument(
    documentPath: string,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    try {
      // Read the document
      const content = await fs.promises.readFile(documentPath, 'utf-8');

      // Determine output path
      const dir = options.outputDir || path.dirname(documentPath);
      const baseName = options.outputFilename || path.basename(documentPath, path.extname(documentPath));
      const outputPath = path.join(dir, `${baseName}.pdf`);

      // Build full content with citations if requested
      let fullContent = content;

      if (options.includeCitations) {
        const citationFormat = options.citationFormat || 'ieee';
        const referenceListOptions: ReferenceListOptions = {
          format: citationFormat,
          includeUrls: true,
          includeAccessDates: true,
        };

        const referenceList = await citationManager.generateReferenceListMarkdown(
          documentPath,
          referenceListOptions
        );

        if (referenceList) {
          fullContent += '\n\n---\n\n' + referenceList;
        }
      }

      // Set cover page defaults from document if not provided
      if (options.includeCoverPage && !options.coverPage) {
        // Extract title from first heading
        const titleMatch = fullContent.match(/^#\s+(.+)$/m);
        options.coverPage = {
          title: titleMatch ? titleMatch[1] : path.basename(documentPath, path.extname(documentPath)),
        };
      }

      return await this.generatePDF(fullContent, outputPath, options);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to read document',
      };
    }
  }

  /**
   * Generate PDF from multiple sections
   */
  async generatePDFFromSections(
    sections: PDFSection[],
    outputPath: string,
    options: PDFGenerationOptions = {}
  ): Promise<PDFGenerationResult> {
    // Sort sections by order
    const sortedSections = [...sections].sort((a, b) => a.order - b.order);

    // Build combined content
    const content = sortedSections
      .map(section => `# ${section.title}\n\n${section.content}`)
      .join('\n\n---\n\n');

    return await this.generatePDF(content, outputPath, options);
  }

  /**
   * Build Pandoc command line arguments
   */
  private buildPandocArgs(inputPath: string, outputPath: string, options: PDFGenerationOptions): string[] {
    const args: string[] = [
      inputPath,
      '-o', outputPath,
      '--pdf-engine=pdflatex',
    ];

    // Table of contents
    if (options.includeToc) {
      args.push('--toc');
      args.push('--toc-depth=3');
    }

    // Page size
    const pageSize = options.pageSize || 'a4';
    args.push(`-V`, `papersize=${pageSize}`);

    // Margins
    const margin = options.margin || '1in';
    args.push('-V', `geometry:margin=${margin}`);

    // Font size
    if (options.fontSize) {
      args.push('-V', `fontsize=${options.fontSize}pt`);
    }

    // Page numbers
    if (options.pageNumbers !== false) {
      args.push('-V', 'numbersections');
    }

    // PDF metadata
    if (options.pdfMetadata) {
      if (options.pdfMetadata.title) {
        args.push('-M', `title=${options.pdfMetadata.title}`);
      }
      if (options.pdfMetadata.author) {
        args.push('-M', `author=${options.pdfMetadata.author}`);
      }
      if (options.pdfMetadata.subject) {
        args.push('-M', `subject=${options.pdfMetadata.subject}`);
      }
      if (options.pdfMetadata.keywords && options.pdfMetadata.keywords.length > 0) {
        args.push('-M', `keywords=${options.pdfMetadata.keywords.join(', ')}`);
      }
    }

    // Standalone document
    args.push('-s');

    // Use xelatex for better Unicode support if available
    // args.push('--pdf-engine=xelatex');

    return args;
  }

  /**
   * Run Pandoc with the given arguments
   */
  private runPandoc(args: string[]): Promise<PDFGenerationResult> {
    return new Promise((resolve) => {
      const child = spawn(this.pandocPath!, args);
      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: stderr || `Pandoc exited with code ${code}`,
          });
        }
      });

      child.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to run Pandoc: ${error.message}`,
        });
      });
    });
  }

  /**
   * Get page count of a PDF (requires pdfinfo or similar)
   */
  private async getPageCount(pdfPath: string): Promise<number | undefined> {
    return new Promise((resolve) => {
      // Try pdfinfo first (common on Unix systems)
      const child = spawn('pdfinfo', [pdfPath]);
      let output = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          const match = output.match(/Pages:\s+(\d+)/);
          resolve(match ? parseInt(match[1], 10) : undefined);
        } else {
          resolve(undefined);
        }
      });

      child.on('error', () => resolve(undefined));
    });
  }

  /**
   * Generate a preview (first page only) as PNG
   */
  async generatePreview(
    pdfPath: string,
    outputPath: string,
    dpi: number = 150
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      // Use pdftoppm or similar for preview generation
      const child = spawn('pdftoppm', [
        '-png',
        '-f', '1',
        '-l', '1',
        '-r', dpi.toString(),
        '-singlefile',
        pdfPath,
        outputPath.replace('.png', ''), // pdftoppm adds extension
      ]);

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: stderr || 'Failed to generate preview',
          });
        }
      });

      child.on('error', () => {
        resolve({
          success: false,
          error: 'pdftoppm not available for preview generation',
        });
      });
    });
  }

  /**
   * Clean up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      const files = await fs.promises.readdir(this.tempDir);
      await Promise.all(
        files.map(file => fs.promises.unlink(path.join(this.tempDir, file)).catch(() => {}))
      );
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Export singleton instance
export const pdfGenerator = new PDFGenerator();
