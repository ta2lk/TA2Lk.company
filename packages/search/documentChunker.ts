/**
 * Industrial Brain — Structure-Aware Industrial Document Chunker
 * Phase 4: Context Engine & Hybrid Search
 *
 * Preserves tables, technical specifications, error codes, and diagrams
 * with zero random mid-table cutting.
 */

import crypto from 'crypto';
import { IndustrialDocument, DocumentChunk } from './types.ts';

export class IndustrialDocumentChunker {
  private static ERROR_CODE_REGEX = /\b((?:E|W|A|F|ALM|ERR|CODE)[-_]?(?:[A-Za-z0-9]{1,6}[-_])?[0-9]{2,6}[A-Za-z]?)\b/gi;
  private static TECH_SPEC_REGEX = /([A-Za-z\s]+)[:=]\s*([0-9.]+\s*(?:bar|psi|rpm|mm|m\/s|kw|v|vac|vdc|hz|khz|c|°c|celsius|kg|kn))\b/gi;

  /**
   * Chunks an industrial document with table and structure awareness
   */
  public static chunkDocument(
    doc: IndustrialDocument,
    options: {
      maxChunkSize?: number;
      overlapSize?: number;
      knownEntityCanonicalIds?: string[];
    } = {}
  ): DocumentChunk[] {
    const maxChunkSize = options.maxChunkSize || 800;
    const overlapSize = options.overlapSize || 100;
    const knownIds = options.knownEntityCanonicalIds || [];

    const lines = doc.content.split('\n');
    const chunks: DocumentChunk[] = [];

    let currentSection = 'General Overview';
    let currentBuffer: string[] = [];
    let currentSize = 0;
    let inTable = false;
    let tableBuffer: string[] = [];

    const flushBuffer = () => {
      if (currentBuffer.length === 0) return;
      const text = currentBuffer.join('\n').trim();
      if (text.length === 0) return;

      const chunk = this.createChunk(doc, text, currentSection, false, undefined, knownIds);
      chunks.push(chunk);

      // Keep overlap from end of buffer if plain text
      const overlapLines: string[] = [];
      let gathered = 0;
      for (let i = currentBuffer.length - 1; i >= 0; i--) {
        gathered += currentBuffer[i].length + 1;
        overlapLines.unshift(currentBuffer[i]);
        if (gathered >= overlapSize) break;
      }
      currentBuffer = overlapLines;
      currentSize = gathered;
    };

    const flushTable = () => {
      if (tableBuffer.length === 0) return;
      // Pre-flush any pending text before table so table stands atomic
      flushBuffer();

      const tableText = tableBuffer.join('\n').trim();
      const parsedRows = tableBuffer
        .filter((l) => l.includes('|'))
        .map((l) =>
          l
            .split('|')
            .map((c) => c.trim())
            .filter((c) => c.length > 0 && !c.match(/^[-:]+$/))
        )
        .filter((r) => r.length > 0);

      const tableChunk = this.createChunk(doc, tableText, currentSection, true, parsedRows, knownIds);
      chunks.push(tableChunk);

      tableBuffer = [];
      inTable = false;
      currentBuffer = [];
      currentSize = 0;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Check section header (# or ##)
      if (trimmed.startsWith('#')) {
        if (inTable) flushTable();
        flushBuffer();
        currentSection = trimmed.replace(/^#+\s*/, '');
        currentBuffer.push(line);
        currentSize += line.length + 1;
        continue;
      }

      // Check table delimiter lines or table row (|)
      const isTableRow = trimmed.startsWith('|') || trimmed.endsWith('|') || (trimmed.includes('|') && trimmed.split('|').length >= 3);
      if (isTableRow) {
        if (!inTable) {
          inTable = true;
        }
        tableBuffer.push(line);
        continue;
      } else if (inTable) {
        // Table ended
        flushTable();
      }

      // Plain text line
      currentBuffer.push(line);
      currentSize += line.length + 1;

      if (currentSize >= maxChunkSize) {
        flushBuffer();
      }
    }

    if (inTable) flushTable();
    flushBuffer();

    // Assign chunk indices
    chunks.forEach((chunk, index) => {
      chunk.chunkIndex = index;
    });

    return chunks;
  }

  private static createChunk(
    doc: IndustrialDocument,
    content: string,
    sectionHeader: string,
    isTable: boolean,
    tableData?: string[][],
    knownEntityCanonicalIds: string[] = []
  ): DocumentChunk {
    // 1. Extract error codes (e.g. E-4012, ERR-HYD-04)
    const errorCodes = new Set<string>();
    let errMatch: RegExpExecArray | null;
    const errRegex = new RegExp(this.ERROR_CODE_REGEX.source, 'gi');
    while ((errMatch = errRegex.exec(content)) !== null) {
      errorCodes.add(errMatch[1].toUpperCase().replace(/\s+/g, '-'));
    }

    // 2. Extract technical specs (e.g. Max Pressure: 250 bar)
    const technicalSpecs: Record<string, string> = {};
    let specMatch: RegExpExecArray | null;
    const specRegex = new RegExp(this.TECH_SPEC_REGEX.source, 'gi');
    while ((specMatch = specRegex.exec(content)) !== null) {
      technicalSpecs[specMatch[1].trim()] = specMatch[2].trim();
    }

    // 3. Link known entities mentioned in text or inherited from document
    const linked = new Set<string>(doc.linkedEntityIds || []);
    for (const kid of knownEntityCanonicalIds) {
      if (content.toLowerCase().includes(kid.toLowerCase())) {
        linked.add(kid);
      }
    }

    const checksum = crypto.createHash('sha256').update(content).digest('hex');
    const tokenCount = Math.ceil(content.length / 4);

    return {
      id: `chunk_${crypto.randomBytes(8).toString('hex')}`,
      documentId: doc.id,
      tenantId: doc.tenantId,
      chunkIndex: 0,
      content,
      sectionHeader,
      isTable,
      tableData,
      errorCodes: Array.from(errorCodes),
      technicalSpecs,
      linkedEntityIds: Array.from(linked),
      tokenCount,
      checksum,
      createdAt: new Date().toISOString(),
    };
  }
}
