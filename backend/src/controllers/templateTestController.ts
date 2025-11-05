import { Request, Response } from 'express';
import { ReportGenerationService } from '../services/reportGenerationService.js';

const reportService = new ReportGenerationService();

export class TemplateTestController {
  /**
   * Lista todos os templates disponíveis
   */
  static async listTemplates(req: Request, res: Response) {
    try {
      const templates = reportService.templateService.getAvailableTemplates();
      
      return res.json({
        success: true,
        message: 'Templates listados com sucesso',
        data: {
          templates,
          count: templates.length
        }
      });

    } catch (error) {
      console.error('❌ Erro ao listar templates:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao listar templates',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Recarrega todos os templates
   */
  static async reloadTemplates(req: Request, res: Response) {
    try {
      reportService.templateService.reloadTemplates();
      const templates = reportService.templateService.getAvailableTemplates();
      
      return res.json({
        success: true,
        message: 'Templates recarregados com sucesso',
        data: {
          templates,
          count: templates.length
        }
      });

    } catch (error) {
      console.error('❌ Erro ao recarregar templates:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao recarregar templates',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Testa um template específico
   */
  static async testSpecificTemplate(req: Request, res: Response) {
    try {
      const { templateName } = req.params;
      
      if (!templateName) {
        return res.status(400).json({
          success: false,
          error: 'Nome do template é obrigatório'
        });
      }

      // Dados mock para teste
      const mockReportData = {
        validation: {
          id: `test-${templateName}-001`,
          name: `Teste do Template: ${templateName}`,
          description: `Validação de teste para o template ${templateName}`,
          minTemperature: 15.0,
          maxTemperature: 30.0,
          minHumidity: 30.0,
          maxHumidity: 70.0,
          isApproved: true,
          statistics: {
            avgTemperature: 22.5,
            minTemperature: 15.2,
            maxTemperature: 29.8,
            avgHumidity: 55.0
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        client: {
          id: 'test-client-001',
          name: 'Cliente de Teste para Template',
          email: 'teste@template.com',
          phone: '(11) 1234-5678',
          address: 'Rua do Teste, 123 - Cidade Teste/SP',
          cnpj: '00.000.000/0001-00',
        },
        suitcase: {
          id: 'test-suitcase-001',
          name: 'Maleta de Teste',
          description: 'Maleta utilizada para testes de template',
        },
        sensors: [
          {
            id: 'test-sensor-1',
            serialNumber: 'TEST-001',
            model: 'TestSensor Pro',
            type: {
              name: 'Sensor de Teste',
              description: 'Sensor utilizado para testes',
            }
          }
        ],
        sensorData: Array.from({ length: 10 }, (_, i) => ({
          id: `test-data-${i + 1}`,
          timestamp: new Date(Date.now() - (10 - i) * 60 * 1000), // 1 minuto de intervalo
          temperature: 20 + Math.random() * 10, // Entre 20°C e 30°C
          humidity: 50 + Math.random() * 20, // Entre 50% e 70%
          sensor: {
            serialNumber: 'TEST-001',
            model: 'TestSensor Pro',
          }
        })),
        user: {
          name: 'Usuário de Teste',
          email: 'usuario@teste.com',
        }
      };

      // Gerar gráficos
      const chartData = reportService.prepareChartData(mockReportData.sensorData);

      // Preparar dados para o template
      const templateData = reportService.templateService.prepareTemplateData(mockReportData, chartData);

      // Renderizar HTML
      const html = reportService.templateService.renderTemplate(templateName, templateData);

      // Gerar PDF
      const pdfBuffer = await reportService.generatePDFFromHTML(html);

      console.log(`✅ Template '${templateName}' testado com sucesso!`);
      console.log('📄 Tamanho do PDF:', pdfBuffer.length, 'bytes');

      // Retornar o PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="test-${templateName}.pdf"`);
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer);

    } catch (error) {
      console.error(`❌ Erro ao testar template '${req.params.templateName}':`, error);
      return res.status(500).json({
        success: false,
        error: `Erro ao testar template '${req.params.templateName}'`,
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Testa helpers do Handlebars
   */
  static async testHelpers(req: Request, res: Response) {
    try {
      const testData = {
        date: new Date(),
        number: 123.456789,
        nullValue: null,
        undefinedValue: undefined,
        stringValue: 'test',
        booleanTrue: true,
        booleanFalse: false
      };

      // Template simples para testar helpers
      const testTemplate = `
        <h1>Teste de Helpers Handlebars</h1>
        <p>Data formatada: {{formatDate date}}</p>
        <p>Data e hora formatada: {{formatDateTime date}}</p>
        <p>Número formatado (2 decimais): {{formatNumber number}}</p>
        <p>Número formatado (4 decimais): {{formatNumber number 4}}</p>
        <p>Teste eq (true): {{eq stringValue "test"}}</p>
        <p>Teste eq (false): {{eq stringValue "other"}}</p>
        <p>Existe nullValue: {{exists nullValue}}</p>
        <p>Existe undefinedValue: {{exists undefinedValue}}</p>
        <p>Existe stringValue: {{exists stringValue}}</p>
        {{#if booleanTrue}}
        <p>Boolean true funcionando</p>
        {{/if}}
        {{#unless booleanFalse}}
        <p>Boolean false funcionando</p>
        {{/unless}}
      `;

      // Compilar e renderizar template
      const Handlebars = (await import('handlebars')).default;
      const template = Handlebars.compile(testTemplate);
      const html = template(testData);

      return res.json({
        success: true,
        message: 'Helpers testados com sucesso',
        data: {
          testData,
          renderedHtml: html
        }
      });

    } catch (error) {
      console.error('❌ Erro ao testar helpers:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao testar helpers',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}