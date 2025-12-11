import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';
import { ReportStatus } from '@prisma/client';
import { fastReportService, ReportData } from './fastReportService.js';
import { stripUndefined } from '../utils/requestUtils.js';
import path from 'path';

export interface ReportStatistics {
  total: number;
  byStatus: {
    draft: number;
    validated: number;
    finalized: number;
  };
  byMonth: Array<{
    month: string;
    count: number;
  }>;
  recentActivity: Array<{
    id: string;
    name: string;
    status: ReportStatus;
    clientName: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export interface UpdateReportData {
  name?: string;
  status?: ReportStatus;
}

export class ReportService {
  async createReport(
    validationId: string,
    templateId: string,
    userId: string,
    clientId: string,
    name: string
  ) {
    const report = await prisma.report.create({
      data: {
        validationId,
        templateId,
        userId,
        clientId,
        name,
        status: 'DRAFT',
      },
    });

    logger.info('Report created:', {
      reportId: report.id,
      name: report.name,
      validationId,
      templateId,
      userId,
    });

    return report;
  }

  async updateReport(reportId: string, data: UpdateReportData, userId: string) {
    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    logger.info('Report updated:', {
      reportId,
      changes: data,
      userId,
    });

    return report;
  }

  async deleteReport(reportId: string, userId: string) {
    // Delete associated PDF file if exists
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { pdfPath: true, name: true },
    });

    if (report?.pdfPath) {
      await fastReportService.deletePdf(report.pdfPath);
    }

    await prisma.report.delete({
      where: { id: reportId },
    });

    logger.info('Report deleted:', {
      reportId,
      name: report?.name,
      userId,
    });
  }

  async getReportStatistics(): Promise<ReportStatistics> {
    // Get total count and status breakdown
    const [total, statusCounts] = await Promise.all([
      prisma.report.count(),
      prisma.report.groupBy({
        by: ['status'],
        _count: {
          status: true,
        },
      }),
    ]);

    // Convert status counts to object
    const byStatus = {
      draft: 0,
      validated: 0,
      finalized: 0,
    };

    statusCounts.forEach(item => {
      const status = item.status.toLowerCase() as keyof typeof byStatus;
      byStatus[status] = item._count.status;
    });

    // Get reports by month for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyReports = await prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM reports 
      WHERE created_at >= ${twelveMonthsAgo}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month DESC
      LIMIT 12
    `;

    const byMonth = monthlyReports.map(item => ({
      month: item.month,
      count: Number(item.count),
    }));

    // Get recent activity (last 10 reports)
    const recentReports = await prisma.report.findMany({
      take: 10,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        client: {
          select: {
            name: true,
          },
        },
      },
    });

    const recentActivity = recentReports.map(report => ({
      id: report.id,
      name: report.name,
      status: report.status,
      clientName: report.client.name,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    }));

    return {
      total,
      byStatus,
      byMonth,
      recentActivity,
    };
  }

  async searchReports(query: string, limit: number = 10) {
    const reports = await prisma.report.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { client: { name: { contains: query, mode: 'insensitive' } } },
          { validation: { name: { contains: query, mode: 'insensitive' } } },
        ],
      },
      take: limit,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        validation: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return reports;
  }

  async getReportsByClient(clientId: string, limit?: number) {
    const reports = await prisma.report.findMany({
      where: { clientId },
      ...(limit !== undefined ? { take: limit } : {}),
      include: {
        validation: {
          select: {
            id: true,
            name: true,
            isApproved: true,
          },
        },
        template: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }

  async getReportsByStatus(status: ReportStatus, limit?: number) {
    const reports = await prisma.report.findMany({
      where: { status },
      ...(limit !== undefined ? { take: limit } : {}),
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        validation: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reports;
  }

  async updateReportStatus(reportId: string, status: ReportStatus, userId: string) {
    // Validate status transition
    const currentReport = await prisma.report.findUnique({
      where: { id: reportId },
      select: { status: true, name: true },
    });

    if (!currentReport) {
      throw new Error('Report not found');
    }

    // Business rules for status transitions
    if (currentReport.status === 'FINALIZED') {
      throw new Error('Cannot change status of finalized report');
    }

    if (status === 'FINALIZED' && currentReport.status !== 'VALIDATED') {
      throw new Error('Report must be validated before finalizing');
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    logger.info('Report status updated:', {
      reportId,
      name: currentReport.name,
      oldStatus: currentReport.status,
      newStatus: status,
      userId,
    });

    return report;
  }

  async generateReportHistory(reportId: string) {
    // This would typically query an audit log table
    // For now, we'll return basic information from the report itself
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Mock history data - in a real implementation, this would come from an audit log
    const history = [
      {
        id: '1',
        action: 'CREATED',
        timestamp: report.createdAt,
        userId: report.userId,
        userName: report.user.name,
        details: {
          status: 'DRAFT',
        },
      },
    ];

    if (report.updatedAt.getTime() !== report.createdAt.getTime()) {
      history.push({
        id: '2',
        action: 'UPDATED',
        timestamp: report.updatedAt,
        userId: report.userId,
        userName: report.user.name,
        details: {
          status: report.status,
        },
      });
    }

    return history;
  }

  async generatePdf(reportId: string, userId: string): Promise<string> {
    // Get report with all necessary data
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        client: true,
        validation: {
          include: {
            sensorData: {
              include: {
                sensor: {
                  include: {
                    type: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
              orderBy: { timestamp: 'asc' },
            },
          },
        },
        template: true,
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    if (!report.validation.isApproved) {
      throw new Error('Cannot generate PDF for unapproved validation');
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(report.validation.sensorData);

    // Generate charts (placeholder - in real implementation, this would generate actual chart images)
    const charts = await this.generateCharts(report.validation.sensorData, report.validation);

    // Prepare report data for FastReport
    // Normalize nullable DB fields to undefined where FastReport types expect optional fields
    const clientNormalized = stripUndefined({
      ...report.client,
      email: report.client.email ?? undefined,
      phone: report.client.phone ?? undefined,
      address: report.client.address ?? undefined,
      cnpj: report.client.cnpj ?? undefined,
    }) as ReportData['client'];

    const validationNormalized = stripUndefined({
      ...report.validation,
      description: report.validation.description ?? undefined,
      minHumidity: report.validation.minHumidity ?? undefined,
      maxHumidity: report.validation.maxHumidity ?? undefined,
    }) as ReportData['validation'];

    const sensorDataNormalized = report.validation.sensorData.map((sd: any) => stripUndefined({
      ...sd,
      humidity: sd.humidity ?? undefined,
    }) as ReportData['sensorData'][number]);

    const reportData: ReportData = {
      client: clientNormalized,
      validation: validationNormalized,
      sensorData: sensorDataNormalized,
      statistics,
      charts,
    };

    // Generate PDF using FastReport
    const pdfPath = await fastReportService.generateReport(
      report.templateId || 'default',
      reportData,
      reportId
    );

    // Update report with PDF path
    await prisma.report.update({
      where: { id: reportId },
      data: {
        pdfPath: path.relative(process.cwd(), pdfPath),
        updatedAt: new Date(),
      },
    });

    logger.info('PDF generated for report:', {
      reportId,
      pdfPath,
      userId,
    });

    return pdfPath;
  }

  async previewPdf(reportId: string): Promise<string> {
    // Get report with all necessary data
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        client: true,
        validation: {
          include: {
            sensorData: {
              include: {
                sensor: {
                  include: {
                    type: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
              orderBy: { timestamp: 'asc' },
            },
          },
        },
        template: true,
      },
    });

    if (!report) {
      throw new Error('Report not found');
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(report.validation.sensorData);

    // Generate charts
    const charts = await this.generateCharts(report.validation.sensorData, report.validation);

    // Prepare report data for FastReport
    const clientNormalized = stripUndefined({
      ...report.client,
      email: report.client.email ?? undefined,
      phone: report.client.phone ?? undefined,
      address: report.client.address ?? undefined,
      cnpj: report.client.cnpj ?? undefined,
    }) as ReportData['client'];

    const validationNormalized = stripUndefined({
      ...report.validation,
      description: report.validation.description ?? undefined,
      minHumidity: report.validation.minHumidity ?? undefined,
      maxHumidity: report.validation.maxHumidity ?? undefined,
    }) as ReportData['validation'];

    const sensorDataNormalized = report.validation.sensorData.map((sd: any) => stripUndefined({
      ...sd,
      humidity: sd.humidity ?? undefined,
    }) as ReportData['sensorData'][number]);

    const reportData: ReportData = {
      client: clientNormalized,
      validation: validationNormalized,
      sensorData: sensorDataNormalized,
      statistics,
      charts,
    };

    // Generate preview PDF using FastReport
    const previewPath = await fastReportService.previewReport(
      report.templateId || 'default',
      reportData
    );

    logger.info('Preview generated for report:', {
      reportId,
      previewPath,
    });

    return previewPath;
  }

  private calculateStatistics(sensorData: any[]): any {
    if (sensorData.length === 0) {
      return {
        totalReadings: 0,
        temperatureStats: {
          min: 0,
          max: 0,
          avg: 0,
          stdDev: 0,
          conformityPercentage: 0,
        },
        timeRange: {
          start: new Date(),
          end: new Date(),
          duration: '0 minutes',
        },
      };
    }

    const temperatures = sensorData.map(d => d.temperature);
    const humidities = sensorData.filter(d => d.humidity !== null).map(d => d.humidity);
    
    const temperatureStats = {
      min: Math.min(...temperatures),
      max: Math.max(...temperatures),
      avg: temperatures.reduce((a, b) => a + b, 0) / temperatures.length,
      stdDev: this.calculateStandardDeviation(temperatures),
      conformityPercentage: 100, // This would be calculated based on validation limits
    };

    const humidityStats = humidities.length > 0 ? {
      min: Math.min(...humidities),
      max: Math.max(...humidities),
      avg: humidities.reduce((a, b) => a + b, 0) / humidities.length,
      stdDev: this.calculateStandardDeviation(humidities),
      conformityPercentage: 100, // This would be calculated based on validation limits
    } : undefined;

    const timestamps = sensorData.map(d => new Date(d.timestamp));
    const startTime = new Date(Math.min(...timestamps.map(t => t.getTime())));
    const endTime = new Date(Math.max(...timestamps.map(t => t.getTime())));
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    return {
      totalReadings: sensorData.length,
      temperatureStats,
      humidityStats,
      timeRange: {
        start: startTime,
        end: endTime,
        duration: `${durationHours}h ${durationMinutes}m`,
      },
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  private async generateCharts(sensorData: any[], validation: any): Promise<any> {
    // Placeholder for chart generation
    // In a real implementation, this would generate actual chart images using a charting library
    // and return base64 encoded images or file paths
    
    return {
      temperatureChart: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      humidityChart: sensorData.some(d => d.humidity !== null) 
        ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
        : undefined,
    };
  }

  async getPdfBuffer(reportId: string): Promise<Buffer> {
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      select: { pdfPath: true },
    });

    if (!report?.pdfPath) {
      throw new Error('PDF not generated for this report');
    }

    const fullPath = path.resolve(process.cwd(), report.pdfPath);
    return await fastReportService.getPdfBuffer(fullPath);
  }
}

export const reportService = new ReportService();