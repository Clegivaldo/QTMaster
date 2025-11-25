import { ReportGenerationService } from './reportGenerationService.js';
export { getTemplateService } from './templateServiceInstance.js';

// Singleton instance
let reportGenerationServiceInstance: ReportGenerationService | null = null;

export function getReportGenerationService(): ReportGenerationService {
  if (!reportGenerationServiceInstance) {
    reportGenerationServiceInstance = new ReportGenerationService();
  }
  return reportGenerationServiceInstance;
}
