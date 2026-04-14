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
 *         application/json:
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
 *               imagePath:
 *                 type: string
 *                 description: Optional initial image path
 *     responses:
 *       201:
 *         description: Happy Cat created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HappyCatWithProduct'
 *       400:
 *         description: Validation error (missing fields or invalid productId)
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
import { getHappyCatsRepository } from '../repositories/happyCatsRepo';
import { ValidationError } from '../utils/errors';

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
router.post('/', async (req, res, next) => {
  try {
    const { catName, productId, imagePath } = req.body as {
      catName?: string;
      productId?: number;
      imagePath?: string;
    };

    if (!catName || productId === undefined || productId === null) {
      throw new ValidationError('catName and productId are required');
    }

    const repo = await getHappyCatsRepository();
    const created = await repo.create({
      catName,
      productId,
      imagePath: imagePath ?? '',
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

export default router;
