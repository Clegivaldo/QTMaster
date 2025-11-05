import { logger } from '../utils/logger.js';
import { prisma } from '../lib/prisma.js';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface ReportData {
  client: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    cnpj?: string;
  };
  validation: {
    id: string;
    name: string;
    description?: string;
    minTemperature: number;
    maxTemperature: number;
    minHumidity?: number;
    maxHumidity?: number;
    isApproved?: boolean;
    statistics?: any;
    createdAt: Date;
    updatedAt: Date;
  };
  sensorData: Array<{
    id: string;
    sensorId: string;
    timestamp: Date;
    temperature: number;
    humidity?: number;
    fileName: string;
    sensor: {
      serialNumber: string;
      model: string;
      type: {
        name: string;
      };
    };
  }>;
  statistics: {
    totalReadings: number;
    temperatureStats: {
      min: number;
      max: number;
      avg: number;
      stdDev: number;
      conformityPercentage: number;
    };
    humidityStats?: {
      min: number;
      max: number;
      avg: number;
      stdDev: number;
      conformityPercentage: number;
    };
    timeRange: {
      start: Date;
      end: Date;
      duration: string;
    };
  };
  charts: {
    temperatureChart: string; // Base64 encoded chart image
    humidityChart?: string; // Base64 encoded chart image
  };
}

export interface FastReportConfig {
  enginePath: string;
  templatesPath: string;
  outputPath: string;
  tempPath: string;
}

export class FastReportService {
  private config: FastReportConfig;

  constructor() {
    this.config = {
      enginePath: process.env.FASTREPORT_ENGINE_PATH || 'C:\\Program Files\\FastReports\\FastReport.Net\\FastReport.exe',
      templatesPath: process.env.TEMPLATES_PATH || path.join(process.cwd(), 'templates'),
      outputPath: process.env.PDF_OUTPUT_PATH || path.join(process.cwd(), 'uploads', 'reports'),
      tempPath: process.env.TEMP_PATH || path.join(process.cwd(), 'temp'),
    };

    // Ensure directories exist
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      await fs.mkdir(this.config.templatesPath, { recursive: true });
      await fs.mkdir(this.config.outputPath, { recursive: true });
      await fs.mkdir(this.config.tempPath, { recursive: true });
    } catch (error) {
      logger.error('Error creating directories:', error);
    }
  }

  async generateReport(
    templateId: string,
    reportData: ReportData,
    reportId: string
  ): Promise<string> {
    try {
      // Get template information
      const template = await prisma.reportTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      if (!template.isActive) {
        throw new Error('Template is not active');
      }

      // Prepare data file for FastReport
      const dataFilePath = await this.prepareDataFile(reportData, reportId);
      
      // Generate PDF using FastReport
      const pdfPath = await this.callFastReport(
        template.templatePath,
        dataFilePath,
        reportId
      );

      // Clean up temporary data file
      await fs.unlink(dataFilePath).catch(() => {});

      logger.info('PDF generated successfully:', {
        reportId,
        templateId,
        pdfPath,
      });

      return pdfPath;
    } catch (error) {
      logger.error('Error generating PDF:', {
        error: error instanceof Error ? error.message : error,
        reportId,
        templateId,
      });
      throw error;
    }
  }

  async previewReport(
    templateId: string,
    reportData: ReportData
  ): Promise<string> {
    try {
      // Get template information
      const template = await prisma.reportTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      // For preview, we'll generate a temporary PDF
      const previewId = `preview_${Date.now()}`;
      const dataFilePath = await this.prepareDataFile(reportData, previewId);
      
      // Generate preview PDF
      const pdfPath = await this.callFastReport(
        template.templatePath,
        dataFilePath,
        previewId,
        true
      );

      // Clean up temporary data file
      await fs.unlink(dataFilePath).catch(() => {});

      logger.info('Preview generated successfully:', {
        templateId,
        pdfPath,
      });

      return pdfPath;
    } catch (error) {
      logger.error('Error generating preview:', {
        error: error instanceof Error ? error.message : error,
        templateId,
      });
      throw error;
    }
  }

  private async prepareDataFile(reportData: ReportData, reportId: string): Promise<string> {
    const dataFilePath = path.join(this.config.tempPath, `${reportId}_data.json`);
    
    // Prepare structured data for FastReport
    const fastReportData = {
      Report: {
        Id: reportId,
        GeneratedAt: new Date().toISOString(),
        Client: reportData.client,
        Validation: reportData.validation,
        Statistics: reportData.statistics,
        Charts: reportData.charts,
      },
      SensorData: reportData.sensorData.map(data => ({
        Id: data.id,
        SensorId: data.sensorId,
        Timestamp: data.timestamp.toISOString(),
        Temperature: data.temperature,
        Humidity: data.humidity,
        FileName: data.fileName,
        SensorSerialNumber: data.sensor.serialNumber,
        SensorModel: data.sensor.model,
        SensorType: data.sensor.type.name,
      })),
    };

    await fs.writeFile(dataFilePath, JSON.stringify(fastReportData, null, 2));
    return dataFilePath;
  }

  private async callFastReport(
    templatePath: string,
    dataFilePath: string,
    reportId: string,
    isPreview: boolean = false
  ): Promise<string> {
    const outputFileName = isPreview 
      ? `preview_${reportId}.pdf`
      : `report_${reportId}.pdf`;
    
    const outputPath = path.join(this.config.outputPath, outputFileName);

    // Check if template file exists
    const fullTemplatePath = path.join(this.config.templatesPath, templatePath);
    try {
      await fs.access(fullTemplatePath);
    } catch {
      throw new Error(`Template file not found: ${fullTemplatePath}`);
    }

    // For now, we'll simulate FastReport call since it requires Windows environment
    // In production, this would be the actual FastReport command
    if (process.env.NODE_ENV === 'development' || !await this.isFastReportAvailable()) {
      // Simulate PDF generation for development
      await this.simulatePdfGeneration(outputPath, reportId);
    } else {
      // Actual FastReport command
      const command = `"${this.config.enginePath}" "${fullTemplatePath}" "${dataFilePath}" "${outputPath}"`;
      
      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 30000, // 30 second timeout
        });
        
        if (stderr) {
          logger.warn('FastReport stderr:', stderr);
        }
        
        logger.info('FastReport stdout:', stdout);
      } catch (error) {
        logger.error('FastReport execution error:', error);
        throw new Error('Failed to generate PDF with FastReport');
      }
    }

    // Verify output file was created
    try {
      await fs.access(outputPath);
    } catch {
      throw new Error('PDF generation failed - output file not created');
    }

    return outputPath;
  }

  private async isFastReportAvailable(): Promise<boolean> {
    try {
      await fs.access(this.config.enginePath);
      return true;
    } catch {
      return false;
    }
  }

  private async simulatePdfGeneration(outputPath: string, reportId: string): Promise<void> {
    // Create a simple PDF placeholder for development
    const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Simulated PDF Report ${reportId}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF`;

    await fs.writeFile(outputPath, pdfContent);
    logger.info('Simulated PDF generated:', { outputPath, reportId });
  }

  async deletePdf(pdfPath: string): Promise<void> {
    try {
      await fs.unlink(pdfPath);
      logger.info('PDF deleted:', { pdfPath });
    } catch (error) {
      logger.warn('Error deleting PDF:', {
        error: error instanceof Error ? error.message : error,
        pdfPath,
      });
    }
  }

  async getPdfBuffer(pdfPath: string): Promise<Buffer> {
    try {
      return await fs.readFile(pdfPath);
    } catch (error) {
      logger.error('Error reading PDF file:', {
        error: error instanceof Error ? error.message : error,
        pdfPath,
      });
      throw new Error('PDF file not found or cannot be read');
    }
  }

  getTemplatePath(templateFileName: string): string {
    return path.join(this.config.templatesPath, templateFileName);
  }

  async validateTemplate(templatePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(this.config.templatesPath, templatePath);
      await fs.access(fullPath);
      
      // Additional validation could be added here to check if it's a valid FastReport template
      const stats = await fs.stat(fullPath);
      return stats.isFile() && path.extname(fullPath).toLowerCase() === '.frx';
    } catch {
      return false;
    }
  }
}

export const fastReportService = new FastReportService();