/**
 * @swagger
 * tags:
 *   name: LuckyCats
 *   description: API endpoints for Lucky Cat image uploads
 */

/**
 * @swagger
 * /api/lucky-cats/{id}/image:
 *   get:
 *     summary: Retrieve the image for a Lucky Cat
 *     tags: [LuckyCats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lucky Cat (happy_cat) ID
 *     responses:
 *       200:
 *         description: The image file for the Lucky Cat
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/webp:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Lucky Cat not found or has no image
 *   post:
 *     summary: Upload an image for a Lucky Cat
 *     tags: [LuckyCats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Lucky Cat (happy_cat) ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (JPEG, PNG, or WebP only)
 *     responses:
 *       200:
 *         description: Image uploaded successfully; image_path updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HappyCatWithProduct'
 *       400:
 *         description: No file attached or unsupported file type
 *       404:
 *         description: Lucky Cat not found
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getHappyCatsRepository } from '../repositories/happyCatsRepo';
import { ValidationError } from '../utils/errors';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getUploadsDir(): string {
  return path.resolve(process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'uploads'));
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = getUploadsDir();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new ValidationError(
          `File type "${file.mimetype}" is not allowed. Accepted types: image/jpeg, image/png, image/webp`,
        ),
      );
    }
  },
});

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

const router = express.Router();

// GET /:id/image — serve the Lucky Cat image
router.get('/:id/image', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = await getHappyCatsRepository();
    const cat = await repo.findById(id);

    if (!cat) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `HappyCat with ID ${id} not found` },
      });
    }

    if (!cat.imagePath) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `HappyCat with ID ${id} has no image` },
      });
    }

    const filename = path.basename(cat.imagePath);
    const filePath = path.join(getUploadsDir(), filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `Image file for HappyCat with ID ${id} not found` },
      });
    }

    const ext = path.extname(filename).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// POST /:id/image — upload a Lucky Cat image
router.post('/:id/image', upload.single('image'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (!req.file) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Validation error: No image file attached' },
      });
    }

    const repo = await getHappyCatsRepository();
    const cat = await repo.findById(id);

    if (!cat) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `HappyCat with ID ${id} not found` },
      });
    }

    const imagePath = `uploads/${req.file.filename}`;
    const updated = await repo.updateImagePath(id, imagePath);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
