import { prisma } from '../lib/prisma.js';
import { logger } from '../utils/logger.js';

export interface CreateTextSnippetData {
    code: string;
    content: string;
    description?: string | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
    createdBy: string;
}

export interface UpdateTextSnippetData {
    content?: string | undefined;
    description?: string | undefined;
    category?: string | undefined;
    tags?: string[] | undefined;
    isActive?: boolean | undefined;
}

export interface ListFilters {
    category?: string | undefined;
    search?: string | undefined;
    isActive?: boolean | undefined;
}

export class TextSnippetService {
    async create(data: CreateTextSnippetData) {
        try {
            // Validate code format (lowercase, underscores only)
            const code = data.code.toLowerCase().replace(/[^a-z0-9_]/g, '_');

            const existing = await prisma.textSnippet.findUnique({
                where: { code },
            });

            if (existing) {
                throw new Error(`Snippet with code '${code}' already exists`);
            }

            // Build data object, excluding undefined values
            const createData: Record<string, unknown> = {
                code,
                content: data.content,
                createdBy: data.createdBy,
            };

            if (data.description !== undefined) createData.description = data.description;
            if (data.category !== undefined) createData.category = data.category;
            if (data.tags !== undefined) createData.tags = data.tags;

            const snippet = await prisma.textSnippet.create({
                data: createData as any,
            });

            logger.info('Text snippet created', { id: snippet.id, code: snippet.code });
            return snippet;
        } catch (error) {
            logger.error('Error creating text snippet', error);
            throw error;
        }
    }

    async update(id: string, data: UpdateTextSnippetData) {
        try {
            // Build update data, excluding undefined values
            const updateData: Record<string, unknown> = {};

            if (data.content !== undefined) updateData.content = data.content;
            if (data.description !== undefined) updateData.description = data.description;
            if (data.category !== undefined) updateData.category = data.category;
            if (data.tags !== undefined) updateData.tags = data.tags;
            if (data.isActive !== undefined) updateData.isActive = data.isActive;

            const snippet = await prisma.textSnippet.update({
                where: { id },
                data: updateData,
            });

            logger.info('Text snippet updated', { id: snippet.id });
            return snippet;
        } catch (error) {
            logger.error('Error updating text snippet', error);
            throw error;
        }
    }

    async delete(id: string) {
        try {
            await prisma.textSnippet.delete({
                where: { id },
            });
            logger.info('Text snippet deleted', { id });
        } catch (error) {
            logger.error('Error deleting text snippet', error);
            throw error;
        }
    }

    async getById(id: string) {
        return prisma.textSnippet.findUnique({
            where: { id },
        });
    }

    async getByCode(code: string) {
        return prisma.textSnippet.findUnique({
            where: { code: code.toLowerCase() },
        });
    }

    async list(filters: ListFilters = {}) {
        const where: Record<string, unknown> = {};

        if (filters.isActive !== undefined) {
            where.isActive = filters.isActive;
        }

        if (filters.category !== undefined && filters.category !== '') {
            where.category = filters.category;
        }

        if (filters.search !== undefined && filters.search !== '') {
            where.OR = [
                { code: { contains: filters.search, mode: 'insensitive' } },
                { content: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }

        return prisma.textSnippet.findMany({
            where,
            orderBy: { code: 'asc' },
        });
    }

    async getAllActive() {
        return prisma.textSnippet.findMany({
            where: { isActive: true },
            select: {
                code: true,
                content: true,
                category: true,
                description: true,
            },
        });
    }
}

export const textSnippetService = new TextSnippetService();
