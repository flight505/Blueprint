import { ipcMain } from 'electron';
import { pdfGenerator } from '../services/PDFGenerator';
import { docxGenerator } from '../services/DOCXGenerator';
import { pptxGenerator, PPTX_THEMES } from '../services/PPTXGenerator';
import type {
  PDFGenerationOptions,
  PDFGenerationResult,
  PDFSection,
  DOCXGenerationOptions,
  DOCXGenerationResult,
  DOCXSection,
  PPTXGenerationOptions,
  PPTXGenerationResult,
  PPTXSection,
  PPTXTheme,
} from '../../shared/types';

export function register() {
  // PDF Generator handlers
  ipcMain.handle('pdf:isPandocAvailable', async (): Promise<boolean> => {
    return await pdfGenerator.isPandocAvailable();
  });

  ipcMain.handle('pdf:getPandocVersion', async (): Promise<string | null> => {
    return await pdfGenerator.getPandocVersion();
  });

  ipcMain.handle('pdf:generatePDF', async (
    _,
    markdownContent: string,
    outputPath: string,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> => {
    return await pdfGenerator.generatePDF(markdownContent, outputPath, options);
  });

  ipcMain.handle('pdf:generatePDFFromDocument', async (
    _,
    documentPath: string,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> => {
    return await pdfGenerator.generatePDFFromDocument(documentPath, options);
  });

  ipcMain.handle('pdf:generatePDFFromSections', async (
    _,
    sections: PDFSection[],
    outputPath: string,
    options?: PDFGenerationOptions
  ): Promise<PDFGenerationResult> => {
    return await pdfGenerator.generatePDFFromSections(sections, outputPath, options);
  });

  ipcMain.handle('pdf:generatePreview', async (
    _,
    pdfPath: string,
    outputPath: string,
    dpi?: number
  ): Promise<{ success: boolean; error?: string }> => {
    return await pdfGenerator.generatePreview(pdfPath, outputPath, dpi);
  });

  ipcMain.handle('pdf:cleanup', async (): Promise<void> => {
    return await pdfGenerator.cleanup();
  });

  // DOCX generation
  ipcMain.handle('docx:generateDOCX', async (
    _,
    markdownContent: string,
    outputPath: string,
    options?: DOCXGenerationOptions
  ): Promise<DOCXGenerationResult> => {
    return await docxGenerator.generateDOCX(markdownContent, outputPath, options);
  });

  ipcMain.handle('docx:generateDOCXFromDocument', async (
    _,
    documentPath: string,
    options?: DOCXGenerationOptions
  ): Promise<DOCXGenerationResult> => {
    return await docxGenerator.generateDOCXFromDocument(documentPath, options);
  });

  ipcMain.handle('docx:generateDOCXFromSections', async (
    _,
    sections: DOCXSection[],
    outputPath: string,
    options?: DOCXGenerationOptions
  ): Promise<DOCXGenerationResult> => {
    return await docxGenerator.generateDOCXFromSections(sections, outputPath, options);
  });

  // PPTX generation
  ipcMain.handle('pptx:generatePPTX', async (
    _,
    markdownContent: string,
    outputPath: string,
    options?: PPTXGenerationOptions
  ): Promise<PPTXGenerationResult> => {
    return await pptxGenerator.generatePPTX(markdownContent, outputPath, options);
  });

  ipcMain.handle('pptx:generatePPTXFromDocument', async (
    _,
    documentPath: string,
    options?: PPTXGenerationOptions
  ): Promise<PPTXGenerationResult> => {
    return await pptxGenerator.generatePPTXFromDocument(documentPath, options);
  });

  ipcMain.handle('pptx:generatePPTXFromSections', async (
    _,
    sections: PPTXSection[],
    outputPath: string,
    options?: PPTXGenerationOptions
  ): Promise<PPTXGenerationResult> => {
    return await pptxGenerator.generatePPTXFromSections(sections, outputPath, options);
  });

  ipcMain.handle('pptx:getAvailableThemes', async (): Promise<string[]> => {
    return pptxGenerator.getAvailableThemes();
  });

  ipcMain.handle('pptx:getTheme', async (_, themeName: string): Promise<PPTXTheme | null> => {
    return PPTX_THEMES[themeName] || null;
  });
}
