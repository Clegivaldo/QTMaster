import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Configuração do multer para upload de avatar
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id;
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${userId}_${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido. Use apenas JPEG, PNG ou GIF.'));
    }
  }
});

export class UserController {
  // Upload de avatar
  static uploadAvatar = upload.single('avatar');

  static async updateAvatar(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Nenhum arquivo enviado'
        });
      }

      // Buscar usuário atual para remover avatar antigo
      const currentUser = await prisma.user.findUnique({
        where: { id: userId }
      });

      // Remover avatar antigo se existir
      if (currentUser?.avatar) {
        const oldAvatarPath = path.join(process.cwd(), currentUser.avatar);
        if (fs.existsSync(oldAvatarPath)) {
          fs.unlinkSync(oldAvatarPath);
        }
      }

      // Caminho relativo para salvar no banco
      const avatarPath = path.join('uploads', 'avatars', req.file.filename);

      // Atualizar usuário com novo avatar
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar: avatarPath },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: {
          user: updatedUser,
          avatarUrl: `uploads/avatars/${req.file.filename}`
        }
      });
    } catch (error) {
      console.error('Erro no upload de avatar:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  static async getProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          updatedAt: true
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Usuário não encontrado'
        });
      }

      // Adicionar URL completa do avatar se existir
      const userWithAvatarUrl = {
        ...user,
        avatarUrl: user.avatar ? `uploads/avatars/${path.basename(user.avatar)}` : null
      };

      res.json({
        success: true,
        data: { user: userWithAvatarUrl }
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      const { name, phone, department, bio } = req.body;
      
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Usuário não autenticado'
        });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name: name || undefined,
          // Adicionar outros campos conforme necessário
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          avatar: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        success: true,
        data: { user: updatedUser }
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }

  static async serveAvatar(req: Request, res: Response) {
    try {
      const { filename } = req.params;
      const avatarPath = path.join(process.cwd(), 'uploads', 'avatars', filename);

      // Verificar se o arquivo existe
      if (!fs.existsSync(avatarPath)) {
        return res.status(404).json({
          success: false,
          error: 'Avatar não encontrado'
        });
      }

      // Definir headers apropriados
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      
      // Enviar o arquivo
      res.sendFile(avatarPath);
    } catch (error) {
      console.error('Erro ao servir avatar:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor'
      });
    }
  }
}