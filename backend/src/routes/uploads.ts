import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Configuração do multer para upload de imagens
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'images');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Gerar nome único para o arquivo
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `image-${uniqueSuffix}${ext}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Verificar se é uma imagem
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  }
});

// Aplicar autenticação a todas as rotas
router.use(authenticate);

// POST /api/uploads/images - Upload de imagem
router.post('/images', imageUpload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        message: 'Nenhum arquivo foi enviado'
      });
      return;
    }

    // Obter dimensões da imagem (opcional - pode ser feito no frontend)
    const imagePath = req.file.path;
    const relativePath = path.relative(process.cwd(), imagePath);

    logger.info(`Imagem uploaded: ${req.file.filename} by user ${req.user?.id}`);

    res.json({
      success: true,
      message: 'Imagem enviada com sucesso',
      data: {
        id: req.file.filename.replace(path.extname(req.file.filename), ''),
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: relativePath.replace(/\\/g, '/'), // Normalizar separadores para web
        size: req.file.size,
        mimetype: req.file.mimetype,
        uploadedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Erro no upload de imagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/uploads/images/gallery - Listar imagens da galeria
router.get('/images/gallery', async (req: Request, res: Response): Promise<void> => {
  try {
    const imagesDir = path.join(process.cwd(), 'uploads', 'images');
    
    if (!fs.existsSync(imagesDir)) {
      res.json({
        success: true,
        data: []
      });
      return;
    }

    const files = fs.readdirSync(imagesDir);
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
    });

    const images = imageFiles.map(filename => {
      const filePath = path.join(imagesDir, filename);
      const stats = fs.statSync(filePath);
      const relativePath = path.join('uploads', 'images', filename).replace(/\\/g, '/');

      return {
        id: filename.replace(path.extname(filename), ''),
        name: filename,
        path: relativePath,
        size: stats.size,
        dimensions: { width: 0, height: 0 }, // Será calculado no frontend
        createdAt: stats.birthtime.toISOString()
      };
    });

    // Ordenar por data de criação (mais recentes primeiro)
    images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json({
      success: true,
      data: images
    });

  } catch (error) {
    logger.error('Erro ao listar galeria de imagens:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/uploads/images/:id - Deletar imagem
router.delete('/images/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const imagesDir = path.join(process.cwd(), 'uploads', 'images');
    
    // Encontrar arquivo por ID (nome sem extensão)
    const files = fs.readdirSync(imagesDir);
    const targetFile = files.find(file => {
      const nameWithoutExt = file.replace(path.extname(file), '');
      return nameWithoutExt === id;
    });

    if (!targetFile) {
      res.status(404).json({
        success: false,
        message: 'Imagem não encontrada'
      });
      return;
    }

    const filePath = path.join(imagesDir, targetFile);
    fs.unlinkSync(filePath);

    logger.info(`Imagem deletada: ${targetFile} by user ${req.user?.id}`);

    res.json({
      success: true,
      message: 'Imagem deletada com sucesso'
    });

  } catch (error) {
    logger.error('Erro ao deletar imagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

export default router;