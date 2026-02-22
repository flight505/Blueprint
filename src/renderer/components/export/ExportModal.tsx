import { useState, useCallback, useEffect, type ReactNode } from 'react';
import { AnimatedModal } from '../animations';
import { EXPORT_ICONS } from '../icons';

/**
 * Available export formats
 */
export type ExportFormat = 'pdf' | 'docx' | 'pptx';

/**
 * Section to export
 */
export interface ExportSection {
  id: string;
  title: string;
  content: string;
  order: number;
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
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  includeToc: boolean;
  includeCitations: boolean;
  includeCoverPage: boolean;
  coverPage?: CoverPageMetadata;
  citationFormat: 'ieee' | 'apa' | 'mla' | 'chicago';
  theme?: string; // For PPTX
  pageSize?: 'a4' | 'letter' | 'legal'; // For PDF
}

/**
 * Props for the ExportModal component
 */
interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: ExportSection[];
  projectPath?: string | null;
  projectTitle?: string;
}

/**
 * Export result with status
 */
interface ExportResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

const FORMAT_INFO: Record<ExportFormat, { label: string; icon: ReactNode; description: string }> = {
  pdf: {
    label: 'PDF',
    icon: <EXPORT_ICONS.pdf size={20} />,
    description: 'Professional document with precise formatting',
  },
  docx: {
    label: 'Word',
    icon: <EXPORT_ICONS.docx size={20} />,
    description: 'Editable document for Microsoft Word',
  },
  pptx: {
    label: 'PowerPoint',
    icon: <EXPORT_ICONS.pptx size={20} />,
    description: 'Presentation slides for meetings',
  },
};

const CITATION_FORMATS = [
  { value: 'ieee', label: 'IEEE' },
  { value: 'apa', label: 'APA' },
  { value: 'mla', label: 'MLA' },
  { value: 'chicago', label: 'Chicago' },
] as const;

const PAGE_SIZES = [
  { value: 'a4', label: 'A4' },
  { value: 'letter', label: 'Letter' },
  { value: 'legal', label: 'Legal' },
] as const;

/**
 * ExportModal component for configuring and generating document exports.
 * Supports PDF, DOCX, and PPTX formats with customizable options.
 */
export function ExportModal({
  isOpen,
  onClose,
  sections,
  projectPath,
  projectTitle = 'Untitled Project',
}: ExportModalProps) {
  // Selected sections for export
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());

  // Export options
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [includeToc, setIncludeToc] = useState(true);
  const [includeCitations, setIncludeCitations] = useState(true);
  const [includeCoverPage, setIncludeCoverPage] = useState(true);
  const [citationFormat, setCitationFormat] = useState<'ieee' | 'apa' | 'mla' | 'chicago'>('ieee');
  const [pageSize, setPageSize] = useState<'a4' | 'letter' | 'legal'>('a4');

  // Cover page metadata
  const [coverTitle, setCoverTitle] = useState(projectTitle);
  const [coverSubtitle, setCoverSubtitle] = useState('');
  const [coverAuthor, setCoverAuthor] = useState('');
  const [coverOrganization, setCoverOrganization] = useState('');

  // PPTX themes
  const [pptxTheme, setPptxTheme] = useState('default');
  const [availableThemes, setAvailableThemes] = useState<string[]>([]);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<ExportResult | null>(null);
  const [isPandocAvailable, setIsPandocAvailable] = useState<boolean | null>(null);

  // Initialize selected sections
  useEffect(() => {
    if (isOpen) {
      setSelectedSections(new Set(sections.map(s => s.id)));
      setCoverTitle(projectTitle);
      setExportResult(null);
    }
  }, [isOpen, sections, projectTitle]);

  // Check Pandoc availability for PDF
  useEffect(() => {
    if (isOpen && format === 'pdf') {
      window.electronAPI.pdfIsPandocAvailable().then(setIsPandocAvailable);
    }
  }, [isOpen, format]);

  // Load available PPTX themes
  useEffect(() => {
    if (isOpen && format === 'pptx') {
      window.electronAPI.pptxGetAvailableThemes().then(setAvailableThemes);
    }
  }, [isOpen, format]);

  // Toggle section selection
  const toggleSection = useCallback((sectionId: string) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Select/deselect all sections
  const selectAllSections = useCallback(() => {
    setSelectedSections(new Set(sections.map(s => s.id)));
  }, [sections]);

  const deselectAllSections = useCallback(() => {
    setSelectedSections(new Set());
  }, []);

  // Generate export
  const handleExport = useCallback(async () => {
    if (selectedSections.size === 0) {
      setExportResult({ success: false, error: 'Please select at least one section to export' });
      return;
    }

    if (!projectPath) {
      setExportResult({ success: false, error: 'No project path selected' });
      return;
    }

    setIsExporting(true);
    setExportResult(null);

    try {
      // Get selected sections in order
      const sectionsToExport = sections
        .filter(s => selectedSections.has(s.id))
        .sort((a, b) => a.order - b.order);

      // Build cover page metadata
      const coverPage: CoverPageMetadata | undefined = includeCoverPage ? {
        title: coverTitle || projectTitle,
        subtitle: coverSubtitle || undefined,
        author: coverAuthor || undefined,
        organization: coverOrganization || undefined,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      } : undefined;

      const outputFilename = `${projectTitle.replace(/[^a-zA-Z0-9]/g, '_')}_export`;
      let result: ExportResult;

      switch (format) {
        case 'pdf':
          result = await window.electronAPI.pdfGeneratePDFFromSections(
            sectionsToExport.map(s => ({
              title: s.title,
              content: s.content,
              order: s.order,
            })),
            `${projectPath}/${outputFilename}.pdf`,
            {
              includeToc,
              includeCitations,
              includeCoverPage,
              coverPage,
              citationFormat,
              pageSize,
            }
          );
          break;

        case 'docx':
          result = await window.electronAPI.docxGenerateDOCXFromSections(
            sectionsToExport.map(s => ({
              title: s.title,
              content: s.content,
              order: s.order,
            })),
            `${projectPath}/${outputFilename}.docx`,
            {
              includeToc,
              includeCitations,
              includeCoverPage,
              coverPage: coverPage as {
                title: string;
                subtitle?: string;
                author?: string;
                date?: string;
                organization?: string;
              },
              citationFormat,
            }
          );
          break;

        case 'pptx':
          result = await window.electronAPI.pptxGeneratePPTXFromSections(
            sectionsToExport.map(s => ({
              title: s.title,
              content: s.content,
              order: s.order,
            })),
            `${projectPath}/${outputFilename}.pptx`,
            {
              theme: pptxTheme,
              includeTitleSlide: includeCoverPage,
              titleSlide: coverPage ? {
                title: coverPage.title,
                subtitle: coverPage.subtitle,
                author: coverPage.author,
                date: coverPage.date,
                organization: coverPage.organization,
              } : undefined,
              includeCitations,
              citationFormat,
            }
          );
          break;
      }

      setExportResult(result);
    } catch (error) {
      setExportResult({
        success: false,
        error: error instanceof Error ? error.message : 'Export failed',
      });
    } finally {
      setIsExporting(false);
    }
  }, [
    selectedSections,
    sections,
    format,
    projectPath,
    projectTitle,
    includeToc,
    includeCitations,
    includeCoverPage,
    coverTitle,
    coverSubtitle,
    coverAuthor,
    coverOrganization,
    citationFormat,
    pageSize,
    pptxTheme,
  ]);

  return (
    <AnimatedModal
      isOpen={isOpen}
      onClose={onClose}
      className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg bg-surface-overlay shadow-xl"
      aria-labelledby="export-modal-title"
    >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default">
          <h2 id="export-modal-title" className="text-lg font-semibold">
            Export Document
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-hover transition-colors"
            aria-label="Close modal"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-130px)] p-6 space-y-6">
          {/* Format Selection */}
          <section>
            <h3 className="text-sm font-medium mb-3">Export Format</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.entries(FORMAT_INFO) as [ExportFormat, typeof FORMAT_INFO['pdf']][]).map(
                ([key, info]) => (
                  <button
                    key={key}
                    onClick={() => setFormat(key)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      format === key
                        ? 'border-accent bg-accent-soft'
                        : 'border-border-default hover:border-border-strong'
                    }`}
                    aria-pressed={format === key}
                  >
                    <span className="text-2xl block mb-2">{info.icon}</span>
                    <span className="font-medium block">{info.label}</span>
                    <span className="text-xs text-fg-muted block mt-1">
                      {info.description}
                    </span>
                  </button>
                )
              )}
            </div>
          </section>

          {/* PDF-specific warning */}
          {format === 'pdf' && isPandocAvailable === false && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Pandoc not found.</strong> PDF generation requires Pandoc to be installed.
                <br />
                <a
                  href="https://pandoc.org/installing.html"
                  className="underline hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Install Pandoc
                </a>
              </p>
            </div>
          )}

          {/* Section Selection */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Sections to Export</h3>
              <div className="flex gap-2">
                <button
                  onClick={selectAllSections}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <button
                  onClick={deselectAllSections}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {sections.length === 0 ? (
              <p className="text-sm text-fg-muted italic">
                No sections available. Add content to your project first.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto border border-border-default rounded-lg p-2">
                {sections
                  .sort((a, b) => a.order - b.order)
                  .map((section) => (
                    <label
                      key={section.id}
                      className="flex items-center gap-3 p-2 rounded hover:bg-surface-hover cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSections.has(section.id)}
                        onChange={() => toggleSection(section.id)}
                        className="w-4 h-4 rounded border-border-default text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{section.title}</span>
                    </label>
                  ))}
              </div>
            )}
          </section>

          {/* Export Options */}
          <section>
            <h3 className="text-sm font-medium mb-3">Options</h3>
            <div className="space-y-3">
              {/* TOC option (not for PPTX) */}
              {format !== 'pptx' && (
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeToc}
                    onChange={(e) => setIncludeToc(e.target.checked)}
                    className="w-4 h-4 rounded border-border-default text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm">Include Table of Contents</span>
                </label>
              )}

              {/* Cover page option */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCoverPage}
                  onChange={(e) => setIncludeCoverPage(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">
                  Include {format === 'pptx' ? 'Title Slide' : 'Cover Page'}
                </span>
              </label>

              {/* Citations option */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCitations}
                  onChange={(e) => setIncludeCitations(e.target.checked)}
                  className="w-4 h-4 rounded border-border-default text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">Include Citations/References</span>
              </label>

              {/* Citation format selector */}
              {includeCitations && (
                <div className="ml-7">
                  <label className="block text-xs text-fg-muted mb-1">
                    Citation Format
                  </label>
                  <select
                    value={citationFormat}
                    onChange={(e) => setCitationFormat(e.target.value as 'ieee' | 'apa' | 'mla' | 'chicago')}
                    className="w-32 px-2 py-1 text-sm rounded border border-border-default bg-input focus:ring-2 focus:ring-blue-500"
                  >
                    {CITATION_FORMATS.map((cf) => (
                      <option key={cf.value} value={cf.value}>
                        {cf.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PDF-specific: Page size */}
              {format === 'pdf' && (
                <div>
                  <label className="block text-xs text-fg-muted mb-1">
                    Page Size
                  </label>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(e.target.value as 'a4' | 'letter' | 'legal')}
                    className="w-32 px-2 py-1 text-sm rounded border border-border-default bg-input focus:ring-2 focus:ring-blue-500"
                  >
                    {PAGE_SIZES.map((ps) => (
                      <option key={ps.value} value={ps.value}>
                        {ps.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* PPTX-specific: Theme */}
              {format === 'pptx' && availableThemes.length > 0 && (
                <div>
                  <label className="block text-xs text-fg-muted mb-1">
                    Presentation Theme
                  </label>
                  <select
                    value={pptxTheme}
                    onChange={(e) => setPptxTheme(e.target.value)}
                    className="w-40 px-2 py-1 text-sm rounded border border-border-default bg-input focus:ring-2 focus:ring-blue-500"
                  >
                    {availableThemes.map((theme) => (
                      <option key={theme} value={theme}>
                        {theme.charAt(0).toUpperCase() + theme.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </section>

          {/* Cover Page Details (when enabled) */}
          {includeCoverPage && (
            <section>
              <h3 className="text-sm font-medium mb-3">
                {format === 'pptx' ? 'Title Slide Details' : 'Cover Page Details'}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-fg-muted mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={coverTitle}
                    onChange={(e) => setCoverTitle(e.target.value)}
                    placeholder="Document title"
                    className="w-full px-3 py-2 text-sm rounded border border-border-default bg-input focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-fg-muted mb-1">
                    Subtitle (optional)
                  </label>
                  <input
                    type="text"
                    value={coverSubtitle}
                    onChange={(e) => setCoverSubtitle(e.target.value)}
                    placeholder="Subtitle or tagline"
                    className="w-full px-3 py-2 text-sm rounded border border-border-default bg-input focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-fg-muted mb-1">
                      Author (optional)
                    </label>
                    <input
                      type="text"
                      value={coverAuthor}
                      onChange={(e) => setCoverAuthor(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-3 py-2 text-sm rounded border border-border-default bg-input focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-fg-muted mb-1">
                      Organization (optional)
                    </label>
                    <input
                      type="text"
                      value={coverOrganization}
                      onChange={(e) => setCoverOrganization(e.target.value)}
                      placeholder="Company or team"
                      className="w-full px-3 py-2 text-sm rounded border border-border-default bg-input focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Export Result */}
          {exportResult && (
            <div
              className={`p-4 rounded-lg border ${
                exportResult.success
                  ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800'
              }`}
            >
              {exportResult.success ? (
                <div>
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    Export successful!
                  </p>
                  {exportResult.outputPath && (
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1 break-all">
                      Saved to: {exportResult.outputPath}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-red-800 dark:text-red-200">
                  {exportResult.error || 'Export failed'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border-default bg-surface-raised">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border-default hover:bg-surface-hover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || selectedSections.size === 0 || (format === 'pdf' && isPandocAvailable === false)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              isExporting || selectedSections.size === 0 || (format === 'pdf' && isPandocAvailable === false)
                ? 'bg-surface-raised text-fg-muted cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
            aria-busy={isExporting}
          >
            {isExporting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating...
              </span>
            ) : (
              `Generate ${FORMAT_INFO[format].label}`
            )}
          </button>
        </div>
    </AnimatedModal>
  );
}
