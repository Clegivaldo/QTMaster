import { z } from 'zod';

/**
 * Schema para validação de dados de sensor
 */
export const sensorDataRowSchema = z.object({
  sensorId: z.string()
    .min(1, 'Sensor ID é obrigatório')
    .max(100, 'Sensor ID muito longo'),
  
  timestamp: z.coerce.date()
    .refine(
      (date) => !isNaN(date.getTime()),
      'Timestamp inválido'
    )
    .refine(
      (date) => date <= new Date(),
      'Timestamp não pode ser no futuro'
    )
    .refine(
      (date) => date.getFullYear() >= 2000,
      'Timestamp muito antigo (mínimo: ano 2000)'
    ),
  
  temperature: z.number()
    .min(-273.15, 'Temperatura abaixo do zero absoluto')
    .max(200, 'Temperatura fora da faixa válida (máx: 200°C)')
    .finite('Temperatura deve ser um número finito'),
  
  humidity: z.number()
    .min(0, 'Umidade não pode ser negativa')
    .max(100, 'Umidade não pode exceder 100%')
    .finite('Umidade deve ser um número finito')
    .nullable()
    .optional(),
});

export type SensorDataRow = z.infer<typeof sensorDataRowSchema>;

/**
 * Schema para validação de configuração de importação
 */
export const importConfigSchema = z.object({
  suitcaseId: z.string().cuid('ID de maleta inválido'),
  userId: z.string().cuid('ID de usuário inválido'),
  
  // Opções de processamento
  validateData: z.boolean().default(true),
  chunkSize: z.number().int().min(100).max(10000).default(1000),
  skipDuplicates: z.boolean().default(true),
  
  // Configuração de formato
  delimiter: z.enum([',', ';', '\t', '|']).optional(),
  encoding: z.enum(['utf8', 'latin1', 'iso-8859-1', 'windows-1252']).optional(),
  hasHeader: z.boolean().default(true),
  startRow: z.number().int().min(1).default(1),
  
  // Mapeamento de colunas (Excel/CSV)
  columnMapping: z.object({
    sensorId: z.string().or(z.number()).optional(),
    timestamp: z.string().or(z.number()).optional(),
    temperature: z.string().or(z.number()).optional(),
    humidity: z.string().or(z.number()).optional(),
  }).optional(),
  
  // Configuração de formato de data
  dateFormat: z.string().default('ISO'),
  timezone: z.string().default('UTC'),
});

export type ImportConfig = z.infer<typeof importConfigSchema>;

/**
 * Schema para resultado de importação
 */
export const importResultSchema = z.object({
  success: z.boolean(),
  totalRows: z.number().int().min(0),
  processedRows: z.number().int().min(0),
  failedRows: z.number().int().min(0),
  skippedRows: z.number().int().min(0).default(0),
  
  errors: z.array(z.object({
    row: z.number().int().optional(),
    column: z.string().optional(),
    field: z.string().optional(),
    message: z.string(),
    value: z.any().optional(),
  })),
  
  warnings: z.array(z.object({
    row: z.number().int().optional(),
    message: z.string(),
  })),
  
  processingTime: z.number().int().min(0),
  
  metadata: z.object({
    fileName: z.string(),
    fileSize: z.number().int().min(0),
    encoding: z.string().optional(),
    delimiter: z.string().optional(),
    startedAt: z.date(),
    completedAt: z.date(),
  }),
});

export type ImportResult = z.infer<typeof importResultSchema>;

/**
 * Schema para validação de upload de arquivo
 */
export const fileUploadSchema = z.object({
  file: z.object({
    fieldname: z.string(),
    originalname: z.string()
      .regex(/\.(xlsx?|csv)$/i, 'Arquivo deve ser .xlsx, .xls ou .csv'),
    encoding: z.string(),
    mimetype: z.string()
      .refine(
        (type) => [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
          'application/csv',
        ].includes(type),
        'Tipo de arquivo inválido'
      ),
    size: z.number()
      .int()
      .max(50 * 1024 * 1024, 'Arquivo muito grande (máximo: 50MB)'),
    buffer: z.instanceof(Buffer).optional(),
    path: z.string().optional(),
  }),
  
  suitcaseId: z.string().cuid('ID de maleta inválido'),
});

export type FileUpload = z.infer<typeof fileUploadSchema>;

/**
 * Validação de batch de dados
 */
export const sensorDataBatchSchema = z.array(sensorDataRowSchema)
  .min(1, 'Batch deve conter pelo menos 1 registro')
  .max(10000, 'Batch não pode exceder 10.000 registros');

export type SensorDataBatch = z.infer<typeof sensorDataBatchSchema>;

/**
 * Schema para configuração de validação de dados
 */
export const dataValidationConfigSchema = z.object({
  // Validações de temperatura
  temperature: z.object({
    min: z.number().default(-50),
    max: z.number().default(100),
    allowOutliers: z.boolean().default(false),
    outlierStdDev: z.number().default(3), // Desvios padrão para considerar outlier
  }).optional(),
  
  // Validações de umidade
  humidity: z.object({
    required: z.boolean().default(false),
    min: z.number().default(0),
    max: z.number().default(100),
    allowOutliers: z.boolean().default(false),
  }).optional(),
  
  // Validações temporais
  timestamp: z.object({
    allowFuture: z.boolean().default(false),
    maxAgeYears: z.number().default(10),
    maxGapMinutes: z.number().default(60), // Máximo gap entre leituras
  }).optional(),
  
  // Validações de sensor
  sensor: z.object({
    validateExists: z.boolean().default(true),
    createIfNotExists: z.boolean().default(false),
  }).optional(),
});

export type DataValidationConfig = z.infer<typeof dataValidationConfigSchema>;

/**
 * Validador customizado para timestamps flexíveis
 */
export const flexibleTimestampSchema = z.union([
  z.string().datetime(),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/), // DD/MM/YYYY
  z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/), // YYYY/MM/DD
  z.number(), // Unix timestamp
  z.date(),
]).transform((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val * 1000);
  
  // Tentar parsear diferentes formatos
  const date = new Date(val);
  if (!isNaN(date.getTime())) return date;
  
  throw new Error(`Formato de data inválido: ${val}`);
});

/**
 * Helper para validação parcial (útil para updates)
 */
export const partialSensorDataRowSchema = sensorDataRowSchema.partial();

/**
 * Schema para estatísticas de importação
 */
export const importStatsSchema = z.object({
  totalImports: z.number().int().min(0),
  successfulImports: z.number().int().min(0),
  failedImports: z.number().int().min(0),
  
  totalRowsProcessed: z.number().int().min(0),
  totalRowsFailed: z.number().int().min(0),
  
  averageProcessingTime: z.number().min(0),
  fastestImport: z.number().min(0),
  slowestImport: z.number().min(0),
  
  byFileType: z.record(z.string(), z.number().int().min(0)),
  
  commonErrors: z.array(z.object({
    error: z.string(),
    count: z.number().int().min(0),
  })),
});

export type ImportStats = z.infer<typeof importStatsSchema>;
