import { prisma } from '../lib/prisma';
import { logger } from '../utils/logger';

export interface TemplateVersionData {
  name: string;
  description?: string;
  elements: any;
  globalStyles: any;
  pages?: any;
  pageSettings?: any;
  changeLog?: string;
}

export interface VersionDiff {
  field: string;
  oldValue: any;
  newValue: any;
  type: 'added' | 'removed' | 'modified';
}

export class TemplateVersionService {
  /**
   * Criar uma nova versão do template
   */
  async createVersion(
    templateId: string,
    data: TemplateVersionData,
    userId: string
  ): Promise<any> {
    try {
      // Buscar template atual
      const template = await prisma.editorTemplate.findUnique({
        where: { id: templateId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });

      if (!template) {
        throw new Error(`Template não encontrado: ${templateId}`);
      }

      // Calcular próximo número de versão
      const latestVersion = template.versions[0];
      const nextVersion = latestVersion ? latestVersion.version + 1 : 1;

      // Gerar changelog automático se não fornecido
      let changeLog = data.changeLog;
      if (!changeLog && latestVersion) {
        changeLog = this.generateChangeLog(
          {
            elements: latestVersion.elements,
            globalStyles: latestVersion.globalStyles,
            pages: latestVersion.pages,
            pageSettings: latestVersion.pageSettings,
          },
          {
            elements: data.elements,
            globalStyles: data.globalStyles,
            pages: data.pages,
            pageSettings: data.pageSettings,
          }
        );
      }

      // Criar nova versão
      const versionData: any = {
        templateId,
        version: nextVersion,
        name: data.name,
        elements: data.elements,
        globalStyles: data.globalStyles,
        changeLog: changeLog || 'Versão inicial',
        createdBy: userId,
      };

      if (data.description !== undefined) {
        versionData.description = data.description;
      }
      if (data.pages !== undefined) {
        versionData.pages = data.pages;
      }
      if (data.pageSettings !== undefined) {
        versionData.pageSettings = data.pageSettings;
      }

      const version = await prisma.editorTemplateVersion.create({
        data: versionData,
      });

      // Atualizar template principal
      await prisma.editorTemplate.update({
        where: { id: templateId },
        data: {
          version: nextVersion,
          revision: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      logger.info(`Versão ${nextVersion} criada para template ${templateId}`, {
        userId,
        version: nextVersion,
      });

      return version;
    } catch (error) {
      logger.error('Erro ao criar versão do template', error);
      throw error;
    }
  }

  /**
   * Listar todas as versões de um template
   */
  async listVersions(
    templateId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<{ versions: any[]; total: number }> {
    try {
      const { limit = 50, offset = 0 } = options;

      const [versions, total] = await Promise.all([
        prisma.editorTemplateVersion.findMany({
          where: { templateId },
          orderBy: { version: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            version: true,
            name: true,
            description: true,
            changeLog: true,
            createdBy: true,
            createdAt: true,
          },
        }),
        prisma.editorTemplateVersion.count({
          where: { templateId },
        }),
      ]);

      return { versions, total };
    } catch (error) {
      logger.error('Erro ao listar versões do template', error);
      throw error;
    }
  }

  /**
   * Obter uma versão específica
   */
  async getVersion(templateId: string, version: number): Promise<any> {
    try {
      const templateVersion = await prisma.editorTemplateVersion.findUnique({
        where: {
          templateId_version: {
            templateId,
            version,
          },
        },
      });

      if (!templateVersion) {
        throw new Error(`Versão ${version} não encontrada para template ${templateId}`);
      }

      return templateVersion;
    } catch (error) {
      logger.error('Erro ao obter versão do template', error);
      throw error;
    }
  }

  /**
   * Restaurar template para uma versão específica (rollback)
   */
  async rollbackToVersion(
    templateId: string,
    version: number,
    userId: string,
    createNewVersion: boolean = true
  ): Promise<any> {
    try {
      // Buscar versão desejada
      const targetVersion = await this.getVersion(templateId, version);

      // Buscar template atual
      const currentTemplate = await prisma.editorTemplate.findUnique({
        where: { id: templateId },
      });

      if (!currentTemplate) {
        throw new Error(`Template não encontrado: ${templateId}`);
      }

      // Se createNewVersion = true, criar nova versão com conteúdo da versão antiga
      if (createNewVersion) {
        await this.createVersion(
          templateId,
          {
            name: targetVersion.name,
            description: targetVersion.description || undefined,
            elements: targetVersion.elements,
            globalStyles: targetVersion.globalStyles,
            pages: targetVersion.pages,
            pageSettings: targetVersion.pageSettings,
            changeLog: `Rollback para versão ${version}`,
          },
          userId
        );
      } else {
        // Atualizar template diretamente (não recomendado, perde histórico)
        await prisma.editorTemplate.update({
          where: { id: templateId },
          data: {
            name: targetVersion.name,
            description: targetVersion.description,
            elements: targetVersion.elements,
            globalStyles: targetVersion.globalStyles,
            pages: targetVersion.pages,
            pageSettings: targetVersion.pageSettings,
            updatedAt: new Date(),
          },
        });
      }

      logger.info(`Rollback do template ${templateId} para versão ${version}`, {
        userId,
        targetVersion: version,
        createNewVersion,
      });

      return await prisma.editorTemplate.findUnique({
        where: { id: templateId },
      });
    } catch (error) {
      logger.error('Erro ao fazer rollback do template', error);
      throw error;
    }
  }

  /**
   * Comparar duas versões
   */
  async compareVersions(
    templateId: string,
    version1: number,
    version2: number
  ): Promise<{
    version1: any;
    version2: any;
    differences: VersionDiff[];
  }> {
    try {
      const [v1, v2] = await Promise.all([
        this.getVersion(templateId, version1),
        this.getVersion(templateId, version2),
      ]);

      const differences = this.calculateDifferences(
        {
          elements: v1.elements,
          globalStyles: v1.globalStyles,
          pages: v1.pages,
          pageSettings: v1.pageSettings,
        },
        {
          elements: v2.elements,
          globalStyles: v2.globalStyles,
          pages: v2.pages,
          pageSettings: v2.pageSettings,
        }
      );

      return {
        version1: v1,
        version2: v2,
        differences,
      };
    } catch (error) {
      logger.error('Erro ao comparar versões', error);
      throw error;
    }
  }

  /**
   * Deletar versões antigas (manter apenas N últimas)
   */
  async pruneOldVersions(templateId: string, keepLast: number = 10): Promise<number> {
    try {
      // Buscar versões ordenadas
      const versions = await prisma.editorTemplateVersion.findMany({
        where: { templateId },
        orderBy: { version: 'desc' },
        select: { id: true, version: true },
      });

      // Se tem menos versões que o limite, não deletar nada
      if (versions.length <= keepLast) {
        return 0;
      }

      // Versões para deletar (todas exceto as N últimas)
      const versionsToDelete = versions.slice(keepLast);
      const idsToDelete = versionsToDelete.map((v) => v.id);

      // Deletar em lote
      const result = await prisma.editorTemplateVersion.deleteMany({
        where: {
          id: { in: idsToDelete },
        },
      });

      logger.info(`${result.count} versões antigas deletadas do template ${templateId}`, {
        kept: keepLast,
        deleted: result.count,
      });

      return result.count;
    } catch (error) {
      logger.error('Erro ao deletar versões antigas', error);
      throw error;
    }
  }

  /**
   * Gerar changelog automático comparando versões
   */
  private generateChangeLog(oldData: any, newData: any): string {
    const changes: string[] = [];

    // Comparar elementos
    if (JSON.stringify(oldData.elements) !== JSON.stringify(newData.elements)) {
      const oldElements = Array.isArray(oldData.elements) ? oldData.elements : [];
      const newElements = Array.isArray(newData.elements) ? newData.elements : [];

      const added = newElements.length - oldElements.length;
      if (added > 0) {
        changes.push(`${added} elemento(s) adicionado(s)`);
      } else if (added < 0) {
        changes.push(`${Math.abs(added)} elemento(s) removido(s)`);
      } else {
        changes.push('Elementos modificados');
      }
    }

    // Comparar estilos globais
    if (JSON.stringify(oldData.globalStyles) !== JSON.stringify(newData.globalStyles)) {
      changes.push('Estilos globais alterados');
    }

    // Comparar páginas
    if (JSON.stringify(oldData.pages) !== JSON.stringify(newData.pages)) {
      changes.push('Configuração de páginas alterada');
    }

    // Comparar configurações
    if (JSON.stringify(oldData.pageSettings) !== JSON.stringify(newData.pageSettings)) {
      changes.push('Configurações de página alteradas');
    }

    return changes.length > 0 ? changes.join(', ') : 'Alterações no template';
  }

  /**
   * Calcular diferenças detalhadas entre duas versões
   */
  private calculateDifferences(oldData: any, newData: any): VersionDiff[] {
    const diffs: VersionDiff[] = [];

    // Comparar cada campo
    const fields = ['elements', 'globalStyles', 'pages', 'pageSettings'];

    fields.forEach((field) => {
      const oldValue = oldData[field];
      const newValue = newData[field];
      const oldStr = JSON.stringify(oldValue);
      const newStr = JSON.stringify(newValue);

      if (oldStr !== newStr) {
        let type: 'added' | 'removed' | 'modified' = 'modified';

        if (!oldValue && newValue) {
          type = 'added';
        } else if (oldValue && !newValue) {
          type = 'removed';
        }

        diffs.push({
          field,
          oldValue,
          newValue,
          type,
        });
      }
    });

    return diffs;
  }
}

// Singleton instance
export const templateVersionService = new TemplateVersionService();
