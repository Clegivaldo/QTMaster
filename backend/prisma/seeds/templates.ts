import { PrismaClient } from '@prisma/client';
import { logger } from '../src/utils/logger.js';

const prisma = new PrismaClient();

/**
 * Professional template seeds for the system
 * These templates provide a starting point for users
 */

// Template 1: Technical Report (Standard)
const technicalReportTemplate = {
    name: 'Laudo Técnico Padrão',
    description: 'Template profissional para laudos técnicos de validação térmica com layout estruturado e completo',
    category: 'technical',
    isPublic: true,
    tags: ['laudo', 'técnico', 'padrão', 'validação'],
    globalStyles: {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: 12,
        color: '#1f2937',
        backgroundColor: '#ffffff',
        lineHeight: 1.6,
    },
    pageSettings: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        backgroundColor: '#ffffff',
        showMargins: false,
    },
    elements: [
        // Header with logo and title
        {
            id: 'header-logo',
            type: 'image',
            content: '',
            position: { x: 40, y: 40 },
            size: { width: 120, height: 60 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
        {
            id: 'header-title',
            type: 'text',
            content: '<h1 style="color: #1e40af; font-size: 24px; font-weight: bold; margin: 0;">LAUDO TÉCNICO DE VALIDAÇÃO TÉRMICA</h1>',
            position: { x: 180, y: 50 },
            size: { width: 400, height: 40 },
            styles: { textAlign: 'left' },
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Client information section
        {
            id: 'section-client',
            type: 'text',
            content: `
        <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-left: 4px solid #3b82f6;">
          <h2 style="color: #1e40af; font-size: 16px; margin: 0 0 10px 0;">Informações do Cliente</h2>
          <p><strong>Cliente:</strong> {{client.name}}</p>
          <p><strong>Documento:</strong> {{client.document}}</p>
          <p><strong>Email:</strong> {{client.email}}</p>
          <p><strong>Telefone:</strong> {{client.phone}}</p>
        </div>
      `,
            position: { x: 40, y: 120 },
            size: { width: 520, height: 150 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Validation information
        {
            id: 'section-validation',
            type: 'text',
            content: `
        <div style="margin-top: 20px; padding: 15px; background: #f3f4f6; border-left: 4px solid #10b981;">
          <h2 style="color: #059669; font-size: 16px; margin: 0 0 10px 0;">Dados da Validação</h2>
          <p><strong>ID:</strong> {{validation.id}}</p>
          <p><strong>Data Início:</strong> {{formatDate validation.startDate}}</p>
          <p><strong>Data Fim:</strong> {{formatDate validation.endDate}}</p>
          <p><strong>Temperatura Mínima:</strong> {{validation.temperatureStats.min}}°C</p>
          <p><strong>Temperatura Máxima:</strong> {{validation.temperatureStats.max}}°C</p>
          <p><strong>Temperatura Média:</strong> {{formatNumber validation.temperatureStats.avg 2}}°C</p>
        </div>
      `,
            position: { x: 40, y: 290 },
            size: { width: 520, height: 180 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Statistics table
        {
            id: 'table-statistics',
            type: 'table',
            content: '',
            position: { x: 40, y: 490 },
            size: { width: 520, height: 200 },
            properties: {
                dataSource: '{{sensorData}}',
                columns: [
                    { key: 'timestamp', label: 'Data/Hora', width: 150 },
                    { key: 'temperature', label: 'Temperatura (°C)', width: 150 },
                    { key: 'humidity', label: 'Umidade (%)', width: 150 },
                ],
                headerStyle: { backgroundColor: '#3b82f6', color: '#ffffff', fontWeight: 'bold' },
                rowStyle: { backgroundColor: '#ffffff' },
                alternatingRowColors: true,
                borderStyle: 'grid',
                fontSize: 11,
                maxRows: 10,
            },
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Footer
        {
            id: 'footer',
            type: 'text',
            content: `
        <div style="margin-top: 30px; padding-top: 15px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 10px; color: #6b7280;">
          <p>Gerado em: {{formatDate report.generatedAt}}</p>
          <p>Por: {{report.generatedBy}}</p>
        </div>
      `,
            position: { x: 40, y: 1020 },
            size: { width: 520, height: 60 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
    ],
};

// Template 2: Report with Charts
const chartsReportTemplate = {
    name: 'Laudo com Gráficos Detalhados',
    description: 'Template focado em visualizações gráficas para análise de dados de temperatura e umidade',
    category: 'charts',
    isPublic: true,
    tags: ['laudo', 'gráficos', 'análise', 'visual'],
    globalStyles: {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: 12,
        color: '#1f2937',
        backgroundColor: '#ffffff',
        lineHeight: 1.5,
    },
    pageSettings: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        backgroundColor: '#ffffff',
        showMargins: false,
    },
    elements: [
        // Title
        {
            id: 'title',
            type: 'text',
            content: '<h1 style="color: #1e40af; font-size: 22px; text-align: center; margin: 20px 0;">ANÁLISE GRÁFICA DE VALIDAÇÃO TÉRMICA</h1>',
            position: { x: 40, y: 40 },
            size: { width: 520, height: 50 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Temperature chart
        {
            id: 'chart-temperature',
            type: 'chart',
            content: '',
            position: { x: 40, y: 110 },
            size: { width: 520, height: 300 },
            properties: {
                chartType: 'line',
                dataSource: '{{sensorData}}',
                xAxis: 'timestamp',
                yAxis: 'temperature',
                title: 'Variação de Temperatura ao Longo do Tempo',
                showLegend: true,
                showGrid: true,
                colors: ['#3b82f6', '#10b981'],
            },
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Humidity chart
        {
            id: 'chart-humidity',
            type: 'chart',
            content: '',
            position: { x: 40, y: 430 },
            size: { width: 520, height: 300 },
            properties: {
                chartType: 'line',
                dataSource: '{{sensorData}}',
                xAxis: 'timestamp',
                yAxis: 'humidity',
                title: 'Variação de Umidade ao Longo do Tempo',
                showLegend: true,
                showGrid: true,
                colors: ['#06b6d4', '#8b5cf6'],
            },
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Summary statistics
        {
            id: 'summary',
            type: 'text',
            content: `
        <div style="margin-top: 20px; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
          <h2 style="margin: 0 0 15px 0; font-size: 18px;">Resumo Estatístico</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
            <div>
              <p style="margin: 5px 0;"><strong>Temp. Mín:</strong> {{validation.temperatureStats.min}}°C</p>
              <p style="margin: 5px 0;"><strong>Temp. Máx:</strong> {{validation.temperatureStats.max}}°C</p>
              <p style="margin: 5px 0;"><strong>Temp. Média:</strong> {{formatNumber validation.temperatureStats.avg 2}}°C</p>
            </div>
            <div>
              <p style="margin: 5px 0;"><strong>Umid. Mín:</strong> {{validation.humidityStats.min}}%</p>
              <p style="margin: 5px 0;"><strong>Umid. Máx:</strong> {{validation.humidityStats.max}}%</p>
              <p style="margin: 5px 0;"><strong>Umid. Média:</strong> {{formatNumber validation.humidityStats.avg 2}}%</p>
            </div>
          </div>
        </div>
      `,
            position: { x: 40, y: 750 },
            size: { width: 520, height: 180 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
    ],
};

// Template 3: Executive Summary
const executiveSummaryTemplate = {
    name: 'Relatório Executivo',
    description: 'Template resumido e objetivo para apresentações executivas, focado em resultados',
    category: 'executive',
    isPublic: true,
    tags: ['executivo', 'resumo', 'apresentação'],
    globalStyles: {
        fontFamily: 'Inter, Arial, sans-serif',
        fontSize: 13,
        color: '#1f2937',
        backgroundColor: '#ffffff',
        lineHeight: 1.6,
    },
    pageSettings: {
        size: 'A4',
        orientation: 'portrait',
        margins: { top: 25, right: 25, bottom: 25, left: 25 },
        backgroundColor: '#ffffff',
        showMargins: false,
    },
    elements: [
        // Header with branding
        {
            id: 'header',
            type: 'text',
            content: `
        <div style="background: linear-gradient(90deg, #1e40af 0%, #3b82f6 100%); padding: 30px; color: white; border-radius: 8px;">
          <h1 style="margin: 0; font-size: 28px; font-weight: bold;">RELATÓRIO EXECUTIVO</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Validação Térmica - {{client.name}}</p>
        </div>
      `,
            position: { x: 40, y: 40 },
            size: { width: 515, height: 120 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Key metrics cards
        {
            id: 'metrics',
            type: 'text',
            content: `
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-top: 30px;">
          <div style="background: #dbeafe; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #1e40af;">{{validation.temperatureStats.avg}}°C</div>
            <div style="font-size: 12px; color: #1e40af; margin-top: 5px;">Temperatura Média</div>
          </div>
          <div style="background: #dcfce7; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #059669;">{{validation.humidityStats.avg}}%</div>
            <div style="font-size: 12px; color: #059669; margin-top: 5px;">Umidade Média</div>
          </div>
          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #d97706;">{{sensorData.length}}</div>
            <div style="font-size: 12px; color: #d97706; margin-top: 5px;">Leituras</div>
          </div>
        </div>
      `,
            position: { x: 40, y: 180 },
            size: { width: 515, height: 150 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
        // Conclusion
        {
            id: 'conclusion',
            type: 'text',
            content: `
        <div style="margin-top: 30px; padding: 25px; background: #f9fafb; border-left: 5px solid #10b981; border-radius: 4px;">
          <h2 style="color: #059669; font-size: 18px; margin: 0 0 15px 0;">Conclusão</h2>
          <p style="margin: 0; line-height: 1.8;">
            A validação térmica foi realizada com sucesso, registrando {{sensorData.length}} leituras 
            no período de {{formatDate validation.startDate}} a {{formatDate validation.endDate}}.
            Os resultados demonstram conformidade com os parâmetros estabelecidos.
          </p>
        </div>
      `,
            position: { x: 40, y: 350 },
            size: { width: 515, height: 180 },
            styles: {},
            locked: false,
            visible: true,
            zIndex: 1,
        },
    ],
};

export async function seedTemplates() {
    try {
        logger.info('Starting template seeds...');

        // Get system user (or create one if doesn't exist)
        let systemUser = await prisma.user.findFirst({
            where: { email: 'system@laudotermico.com' },
        });

        if (!systemUser) {
            systemUser = await prisma.user.create({
                data: {
                    name: 'Sistema',
                    email: 'system@laudotermico.com',
                    password: 'not-used',
                    role: 'ADMIN',
                },
            });
        }

        const templates = [
            technicalReportTemplate,
            chartsReportTemplate,
            executiveSummaryTemplate,
        ];

        for (const templateData of templates) {
            // Check if template already exists
            const existing = await prisma.editorTemplate.findFirst({
                where: { name: templateData.name },
            });

            if (existing) {
                logger.info(`Template "${templateData.name}" already exists, skipping...`);
                continue;
            }

            // Create template
            await prisma.editorTemplate.create({
                data: {
                    ...templateData,
                    createdBy: systemUser.id,
                    version: 1,
                    revision: 1,
                },
            });

            logger.info(`Created template: ${templateData.name}`);
        }

        logger.info('Template seeds completed successfully!');
    } catch (error) {
        logger.error('Error seeding templates:', error);
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedTemplates()
        .then(() => {
            logger.info('Seed completed');
            process.exit(0);
        })
        .catch((error) => {
            logger.error('Seed failed:', error);
            process.exit(1);
        })
        .finally(async () => {
            await prisma.$disconnect();
        });
}
