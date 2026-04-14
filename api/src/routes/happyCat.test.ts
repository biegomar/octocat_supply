import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import happyCatRouter from './happyCat';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;

describe('Happy Cat API', () => {
  beforeEach(async () => {
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed required foreign keys: supplier + product
    const db = await getDatabase();
    await db.run(
      `INSERT INTO suppliers (supplier_id, name, contact_person, email, phone)
       VALUES (1, 'Paw Supplies Inc', 'Jane Doe', 'jane@paw.com', '555-0001')`,
    );
    await db.run(
      `INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name)
       VALUES (1, 1, 'Lucky Paw', 'A lucky paw product', 9.99, 'LP-001', 'piece', 'lucky_paw.png')`,
    );

    app = express();
    app.use(express.json());
    app.use('/happy-cats', happyCatRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    await closeDatabase();
  });

  it('POST / → 201 creates a new happy cat (happy path)', async () => {
    const payload = { catName: 'Whiskers', productId: 1, imagePath: 'uploads/whiskers.jpg' };
    const response = await request(app).post('/happy-cats').send(payload);

    expect(response.status).toBe(201);
    expect(response.body.happyCatId).toBeDefined();
    expect(response.body.catName).toBe('Whiskers');
    expect(response.body.productId).toBe(1);
    expect(response.body.productName).toBe('Lucky Paw');
  });

  it('POST / → 400 when required fields are missing', async () => {
    const response = await request(app).post('/happy-cats').send({ imagePath: 'uploads/x.jpg' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST / → 400 when productId is invalid', async () => {
    const response = await request(app)
      .post('/happy-cats')
      .send({ catName: 'Ghost', productId: 999, imagePath: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET / → 200 returns all happy cats', async () => {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO happy_cats (happy_cat_id, cat_name, product_id, image_path)
       VALUES (1, 'Mittens', 1, '')`,
    );

    const response = await request(app).get('/happy-cats');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].catName).toBe('Mittens');
  });

  it('GET /:id → 200 returns a happy cat by ID', async () => {
    const db = await getDatabase();
    await db.run(
      `INSERT INTO happy_cats (happy_cat_id, cat_name, product_id, image_path)
       VALUES (1, 'Mittens', 1, '')`,
    );

    const response = await request(app).get('/happy-cats/1');

    expect(response.status).toBe(200);
    expect(response.body.happyCatId).toBe(1);
    expect(response.body.catName).toBe('Mittens');
    expect(response.body.productName).toBe('Lucky Paw');
  });

  it('GET /999 → 404 when happy cat does not exist', async () => {
    const response = await request(app).get('/happy-cats/999');

    expect(response.status).toBe(404);
    expect(response.body.error.message).toContain('999');
  });
});
