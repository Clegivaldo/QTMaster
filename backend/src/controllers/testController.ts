import { Request, Response } from 'express';
import { getReportGenerationService } from '../services/serviceInstances.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();


export class TestController {
  /**
   * Testa a geração de relatório com dados mock
   */
  static async testReportGeneration(req: Request, res: Response) {
    try {
      console.log('🧪 Iniciando teste de geração de relatório...');

      // Verificar se existe alguma validação no banco
      const validations = await prisma.validation.findMany({
        include: {
          client: true,
          suitcase: {
            include: {
              sensors: {
                include: {
                  sensor: {
                    include: {
                      type: true
                    }
                  }
                }
              }
            }
          },
          user: true,
          sensorData: {
            include: {
              sensor: true
            },
            take: 10 // Apenas os primeiros 10 registros para teste
          }
        },
        take: 1
      });

      if (validations.length === 0) {
        res.status(404).json({ success: false, error: 'Nenhuma validação encontrada no banco de dados para teste' });
        return;
      }

      const validation = validations[0];
      if (!validation) {
        res.status(404).json({ success: false, error: 'Nenhuma validação encontrada no banco de dados para teste' });
        return;
      }

      console.log('📊 Usando validação:', validation.id);

      // Gerar o relatório
      const pdfBuffer = await getReportGenerationService().generateReport(validation.id, 'test-report');

      console.log('✅ Relatório gerado com sucesso!');
      console.log('📄 Tamanho do PDF:', pdfBuffer.length, 'bytes');

      // Retornar o PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="test-report.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      
  res.send(pdfBuffer);
  return;

    } catch (error) {
      console.error('❌ Erro ao gerar relatório de teste:', error);
      res.status(500).json({ success: false, error: 'Erro ao gerar relatório de teste', details: error instanceof Error ? error.message : 'Erro desconhecido' });
      return;
    }
  }

  /**
   * Testa apenas o template sem gerar PDF usando dados mock
   */
  static async testTemplate(req: Request, res: Response) {
    try {
      console.log('🧪 Testando template com dados mock...');

      // Dados mock para teste
      const mockReportData = {
        validation: {
          id: 'mock-validation-id',
          name: 'Validação de Teste - Câmara Fria',
          description: 'Teste de qualificação térmica para câmara fria',
          minTemperature: 2.0,
          maxTemperature: 8.0,
          minHumidity: 45.0,
          maxHumidity: 75.0,
          isApproved: true,
          statistics: {
            avgTemperature: 5.2,
            minTemperature: 2.1,
            maxTemperature: 7.8,
            avgHumidity: 62.5
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        client: {
          id: 'mock-client-id',
          name: 'Empresa Teste Ltda',
          email: 'contato@empresateste.com.br',
          phone: '(11) 99999-9999',
          address: 'Rua Teste, 123 - São Paulo/SP',
          cnpj: '12.345.678/0001-90',
        },
        suitcase: {
          id: 'mock-suitcase-id',
          name: 'Maleta de Validação #001',
          description: 'Maleta com 4 sensores de temperatura e umidade',
        },
        sensors: [
          {
            id: 'sensor-1',
            serialNumber: 'SN001234',
            model: 'TempLog Pro',
            type: {
              name: 'Sensor de Temperatura e Umidade',
              description: 'Sensor digital de alta precisão',
            }
          },
          {
            id: 'sensor-2',
            serialNumber: 'SN001235',
            model: 'TempLog Pro',
            type: {
              name: 'Sensor de Temperatura e Umidade',
              description: 'Sensor digital de alta precisão',
            }
          }
        ],
        sensorData: [
          {
            id: 'data-1',
            timestamp: new Date('2024-01-15T08:00:00'),
            temperature: 5.2,
            humidity: 62.5,
            sensor: {
              serialNumber: 'SN001234',
              model: 'TempLog Pro',
            }
          },
          {
            id: 'data-2',
            timestamp: new Date('2024-01-15T08:15:00'),
            temperature: 5.1,
            humidity: 63.2,
            sensor: {
              serialNumber: 'SN001234',
              model: 'TempLog Pro',
            }
          },
          {
            id: 'data-3',
            timestamp: new Date('2024-01-15T08:30:00'),
            temperature: 5.3,
            humidity: 61.8,
            sensor: {
              serialNumber: 'SN001235',
              model: 'TempLog Pro',
            }
          }
        ],
        user: {
          name: 'João Silva',
          email: 'joao.silva@empresa.com',
        }
      };

      return res.json({
        success: true,
        message: 'Template testado com sucesso usando dados mock',
        data: {
          validationId: mockReportData.validation.id,
          clientName: mockReportData.client.name,
          sensorDataCount: mockReportData.sensorData.length,
          reportData: mockReportData
        }
      });

    } catch (error) {
      console.error('❌ Erro ao testar template:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao testar template',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Testa template avançado com mais dados
   */
  static async testAdvancedReport(req: Request, res: Response) {
    try {
      console.log('🧪 Testando template avançado...');

      // Dados mock mais complexos para teste
      const mockReportData = {
        validation: {
          id: 'adv-validation-001',
          name: 'Validação Avançada - Câmara Climatizada Industrial',
          description: 'Qualificação térmica completa para câmara climatizada de grande porte',
          minTemperature: 18.0,
          maxTemperature: 25.0,
          minHumidity: 40.0,
          maxHumidity: 60.0,
          isApproved: true,
          statistics: {
            avgTemperature: 21.5,
            minTemperature: 18.2,
            maxTemperature: 24.8,
            avgHumidity: 52.3,
            conformityPercentage: 98.7
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        client: {
          id: 'client-industrial-001',
          name: 'Indústria Farmacêutica XYZ S.A.',
          email: 'qualidade@farmaceuticaxyz.com.br',
          phone: '(11) 3456-7890',
          address: 'Av. Industrial, 1000 - Distrito Industrial - São Paulo/SP - CEP: 01234-567',
          cnpj: '12.345.678/0001-90',
        },
        suitcase: {
          id: 'suitcase-pro-001',
          name: 'Maleta Profissional de Validação Térmica v2.0',
          description: 'Sistema completo com 8 sensores de alta precisão, datalogger integrado e certificação ISO 17025',
        },
        sensors: [
          {
            id: 'sensor-temp-001',
            serialNumber: 'TH-2024-001',
            model: 'ThermoLog Pro Max',
            type: {
              name: 'Sensor de Temperatura e Umidade de Precisão',
              description: 'Sensor digital calibrado com precisão ±0.1°C e ±1% UR',
            }
          },
          {
            id: 'sensor-temp-002',
            serialNumber: 'TH-2024-002',
            model: 'ThermoLog Pro Max',
            type: {
              name: 'Sensor de Temperatura e Umidade de Precisão',
              description: 'Sensor digital calibrado com precisão ±0.1°C e ±1% UR',
            }
          },
          {
            id: 'sensor-temp-003',
            serialNumber: 'TH-2024-003',
            model: 'ThermoLog Pro Max',
            type: {
              name: 'Sensor de Temperatura e Umidade de Precisão',
              description: 'Sensor digital calibrado com precisão ±0.1°C e ±1% UR',
            }
          },
          {
            id: 'sensor-temp-004',
            serialNumber: 'TH-2024-004',
            model: 'ThermoLog Pro Max',
            type: {
              name: 'Sensor de Temperatura e Umidade de Precisão',
              description: 'Sensor digital calibrado com precisão ±0.1°C e ±1% UR',
            }
          }
        ],
        sensorData: Array.from({ length: 100 }, (_, i) => {
          const baseTime = Date.now() - (100 - i) * 10 * 60 * 1000; // 10 minutos de intervalo
          const temp = 21.5 + Math.sin(i * 0.1) * 2 + (Math.random() - 0.5) * 0.5; // Variação senoidal + ruído
          const humidity = 52 + Math.cos(i * 0.15) * 8 + (Math.random() - 0.5) * 2; // Variação cossenoidal + ruído
          
          return {
            id: `data-${i + 1}`,
            timestamp: new Date(baseTime),
            temperature: Math.max(18, Math.min(25, temp)), // Manter dentro dos limites
            humidity: Math.max(40, Math.min(60, humidity)), // Manter dentro dos limites
            sensor: {
              serialNumber: `TH-2024-00${(i % 4) + 1}`,
              model: 'ThermoLog Pro Max',
            }
          };
        }),
        user: {
          name: 'Dr. Carlos Eduardo Silva',
          email: 'carlos.silva@validacoes.com.br',
        }
      };

      // Gerar gráficos usando Chart.js no HTML
      const chartData = getReportGenerationService().prepareChartData(mockReportData.sensorData);

      // Preparar dados para o template
      const templateData = getReportGenerationService().templateService.prepareTemplateData(mockReportData, chartData);

      // Renderizar HTML
      const html = getReportGenerationService().templateService.renderTemplate('advanced-report', templateData);

      // Gerar PDF com Puppeteer
      const pdfBuffer = await getReportGenerationService().generatePDFFromHTML(html);

      console.log('✅ Relatório avançado gerado com sucesso!');
      console.log('📄 Tamanho do PDF:', pdfBuffer.length, 'bytes');

      // Retornar o PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="advanced-report.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Erro ao gerar relatório avançado:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao gerar relatório avançado',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Testa a geração de PDF com dados mock
   */
  static async testMockReport(req: Request, res: Response) {
    try {
      console.log('🧪 Testando geração de PDF com dados mock...');

      // Dados mock para teste
      const mockReportData = {
        validation: {
          id: 'mock-validation-id',
          name: 'Validação de Teste - Câmara Fria',
          description: 'Teste de qualificação térmica para câmara fria',
          minTemperature: 2.0,
          maxTemperature: 8.0,
          minHumidity: 45.0,
          maxHumidity: 75.0,
          isApproved: true,
          statistics: {
            avgTemperature: 5.2,
            minTemperature: 2.1,
            maxTemperature: 7.8,
            avgHumidity: 62.5
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        client: {
          id: 'mock-client-id',
          name: 'Empresa Teste Ltda',
          email: 'contato@empresateste.com.br',
          phone: '(11) 99999-9999',
          address: 'Rua Teste, 123 - São Paulo/SP',
          cnpj: '12.345.678/0001-90',
        },
        suitcase: {
          id: 'mock-suitcase-id',
          name: 'Maleta de Validação #001',
          description: 'Maleta com 4 sensores de temperatura e umidade',
        },
        sensors: [
          {
            id: 'sensor-1',
            serialNumber: 'SN001234',
            model: 'TempLog Pro',
            type: {
              name: 'Sensor de Temperatura e Umidade',
              description: 'Sensor digital de alta precisão',
            }
          },
          {
            id: 'sensor-2',
            serialNumber: 'SN001235',
            model: 'TempLog Pro',
            type: {
              name: 'Sensor de Temperatura e Umidade',
              description: 'Sensor digital de alta precisão',
            }
          }
        ],
        sensorData: Array.from({ length: 20 }, (_, i) => ({
          id: `data-${i + 1}`,
          timestamp: new Date(Date.now() - (20 - i) * 15 * 60 * 1000), // 15 minutos de intervalo
          temperature: 5.0 + Math.random() * 2 - 1, // Entre 4°C e 6°C
          humidity: 60 + Math.random() * 10 - 5, // Entre 55% e 65%
          sensor: {
            serialNumber: i % 2 === 0 ? 'SN001234' : 'SN001235',
            model: 'TempLog Pro',
          }
        })),
        user: {
          name: 'João Silva',
          email: 'joao.silva@empresa.com',
        }
      };

      // Gerar gráficos usando Chart.js no HTML
      const chartData = getReportGenerationService().prepareChartData(mockReportData.sensorData);

      // Preparar dados para o template
      const templateData = getReportGenerationService().templateService.prepareTemplateData(mockReportData, chartData);

      // Renderizar HTML
      const html = getReportGenerationService().templateService.renderTemplate('test-report', templateData);

      // Gerar PDF com Puppeteer
      const pdfBuffer = await getReportGenerationService().generatePDFFromHTML(html);

      console.log('✅ Relatório mock gerado com sucesso!');
      console.log('📄 Tamanho do PDF:', pdfBuffer.length, 'bytes');

      // Retornar o PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="test-mock-report.pdf"');
      res.setHeader('Content-Length', pdfBuffer.length);
      
      return res.send(pdfBuffer);

    } catch (error) {
      console.error('❌ Erro ao gerar relatório mock:', error);
      return res.status(500).json({
        success: false,
        error: 'Erro ao gerar relatório mock',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}
