export interface FileMeta {
  fileName: string;
  extension: string;
  sizeBytes?: number;
  absolutePath: string;
}

export interface NormalizedRow {
  sensorSerial: string;
  timestamp: Date;
  temperatureC: number;
  humidityPct?: number | null;
  raw?: Record<string, any>;
  index?: number;
}

export interface FileParser {
  /** Quick synchronous or async test to decide if this parser can handle the file */
  detect(meta: FileMeta, sampleBuffer?: Buffer): Promise<boolean> | boolean;
  /** Parse yields normalized rows incrementally for streaming/persistence */
  parse(meta: FileMeta, options: any): AsyncGenerator<NormalizedRow, void, unknown>;
  /** Optional normalization hook if raw rows emitted first */
  normalize?(raw: any, context: any): NormalizedRow;
  /** Human readable name */
  name: string;
}

/** Registry to hold available parsers (will be populated elsewhere) */
export class ParserRegistry {
  private parsers: FileParser[] = [];

  register(parser: FileParser) {
    this.parsers.push(parser);
  }

  list(): FileParser[] { return [...this.parsers]; }

  find(meta: FileMeta, sample?: Buffer): FileParser | undefined {
    return this.parsers.find(p => {
      try { return p.detect(meta, sample); } catch { return false; }
    });
  }
}

export const parserRegistry = new ParserRegistry();

// Example stub parser for Excel Elitech (legacy .xls) to be implemented later
export const elitechLegacyXlsParser: FileParser = {
  name: 'ElitechLegacyXls',
  detect(meta: FileMeta) {
    return meta.extension === '.xls' && /elitech|rc-4hc|rc4hc/i.test(meta.fileName);
  },
  async *parse(_meta: FileMeta) {
    // Placeholder: real implementation will stream rows
    // Yield nothing for now
  }
};

// Auto-register stub (non-invasive until used)
parserRegistry.register(elitechLegacyXlsParser);
