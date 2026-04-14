/**
 * @swagger
 * tags:
 *   name: HappyCats
 *   description: API endpoints for managing Happy Cat entries
 */

/**
 * @swagger
 * /api/happy-cats:
 *   get:
 *     summary: Returns all Happy Cats
 *     tags: [HappyCats]
 *     responses:
 *       200:
 *         description: List of all Happy Cats with product info
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/HappyCatWithProduct'
 *   post:
 *     summary: Create a new Happy Cat entry
 *     tags: [HappyCats]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - catName
 *               - productId
 *             properties:
 *               catName:
 *                 type: string
 *                 description: The name of the cat
 *               productId:
 *                 type: integer
 *                 description: The ID of the associated product
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Optional cat image (JPEG, PNG, or WebP)
 *     responses:
 *       201:
 *         description: Happy Cat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HappyCatWithProduct'
 *       400:
 *         description: Validation error (missing fields, invalid productId, or unsupported file type)
 *
 * /api/happy-cats/{id}:
 *   get:
 *     summary: Get a Happy Cat by ID
 *     tags: [HappyCats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Happy Cat ID
 *     responses:
 *       200:
 *         description: Happy Cat found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HappyCatWithProduct'
 *       404:
 *         description: Happy Cat not found
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

const router = express.Router();

// GET / — list all happy cats
router.get('/', async (_req, res, next) => {
  try {
    const repo = await getHappyCatsRepository();
    const cats = await repo.findAll();
    res.json(cats);
  } catch (error) {
    next(error);
  }
});

// GET /:id — get a single happy cat
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const repo = await getHappyCatsRepository();
    const cat = await repo.findById(id);
    if (!cat) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: `HappyCat with ID ${id} not found` },
      });
    }
    res.json(cat);
  } catch (error) {
    next(error);
  }
});

// POST / — create a happy cat entry
router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const { catName, productId: productIdRaw } = req.body as {
      catName?: string;
      productId?: string;
    };

    const productId = productIdRaw !== undefined ? parseInt(productIdRaw, 10) : undefined;

    if (!catName || productId === undefined || isNaN(productId)) {
      if (req.file) {
        await fs.promises.unlink(req.file.path).catch(() => {});
      }
      throw new ValidationError('catName and productId are required');
    }

    const imagePath = req.file ? `uploads/${req.file.filename}` : '';

    const repo = await getHappyCatsRepository();
    const created = await repo.create({ catName, productId, imagePath });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

export default router;
