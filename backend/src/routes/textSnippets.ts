import { Router, Request, Response } from 'express';
import { textSnippetService } from '../services/textSnippetService.js';
import { authenticate } from '../middleware/auth.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createSnippetSchema = z.object({
    code: z.string().min(3).regex(/^[a-z0-9_]+$/),
    content: z.string().min(1),
    description: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
});

const updateSnippetSchema = z.object({
    content: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
});

// List snippets
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, search, isActive } = req.query;
        const snippets = await textSnippetService.list({
            category: typeof category === 'string' ? category : undefined,
            search: typeof search === 'string' ? search : undefined,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
        });
        res.json(snippets);
    } catch (error) {
        res.status(500).json({ error: 'Failed to list snippets' });
    }
});

// Get snippet by ID
router.get('/:id', authenticate, async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const snippet = await textSnippetService.getById(id);
        if (!snippet) {
            res.status(404).json({ error: 'Snippet not found' });
            return;
        }
        res.json(snippet);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get snippet' });
    }
});

// Create snippet
router.post('/', authenticate, async (req: Request, res: Response): Promise<void> => {
    try {
        const data = createSnippetSchema.parse(req.body);
        const snippet = await textSnippetService.create({
            code: data.code,
            content: data.content,
            description: data.description,
            category: data.category,
            tags: data.tags,
            createdBy: req.user!.id,
        });
        res.status(201).json(snippet);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
            return;
        }
        res.status(500).json({ error: 'Failed to create snippet' });
    }
});

// Update snippet
router.put('/:id', authenticate, async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const data = updateSnippetSchema.parse(req.body);
        const snippet = await textSnippetService.update(id, {
            content: data.content,
            description: data.description,
            category: data.category,
            tags: data.tags,
            isActive: data.isActive,
        });
        res.json(snippet);
    } catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: error.issues });
            return;
        }
        res.status(500).json({ error: 'Failed to update snippet' });
    }
});

// Delete snippet
router.delete('/:id', authenticate, async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        await textSnippetService.delete(id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete snippet' });
    }
});

export const textSnippetRoutes = router;
