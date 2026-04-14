import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import luckyCatRouter from './luckyCat';
import { runMigrations } from '../db/migrate';
import { closeDatabase, getDatabase } from '../db/sqlite';
import { errorHandler } from '../utils/errors';

let app: express.Express;
let uploadsDir: string;

describe('Lucky Cat image upload API', () => {
  beforeEach(async () => {
    // Isolated temp directory for uploads during tests
    uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lucky-cat-test-'));
    process.env.UPLOADS_DIR = uploadsDir;

    // Fresh in-memory database
    await closeDatabase();
    await getDatabase(true);
    await runMigrations(true);

    // Seed required FKs and a happy_cat entry
    const db = await getDatabase();
    await db.run(
      `INSERT INTO suppliers (supplier_id, name, contact_person, email, phone)
       VALUES (1, 'Paw Supplies Inc', 'Jane Doe', 'jane@paw.com', '555-0001')`,
    );
    await db.run(
      `INSERT INTO products (product_id, supplier_id, name, description, price, sku, unit, img_name)
       VALUES (1, 1, 'Lucky Paw', 'A lucky paw product', 9.99, 'LP-001', 'piece', 'lucky_paw.png')`,
    );
    await db.run(
      `INSERT INTO happy_cats (happy_cat_id, cat_name, product_id, image_path)
       VALUES (1, 'Whiskers', 1, 'uploads/old.jpg')`,
    );

    app = express();
    app.use('/lucky-cats', luckyCatRouter);
    app.use(errorHandler);
  });

  afterEach(async () => {
    delete process.env.UPLOADS_DIR;
    await closeDatabase();
    fs.rmSync(uploadsDir, { recursive: true, force: true });
  });

  it('should upload an image and update image_path (200)', async () => {
    const response = await request(app)
      .post('/lucky-cats/1/image')
      .attach('image', Buffer.from('fake-jpeg-data'), { filename: 'cat.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body.happyCatId).toBe(1);
    expect(response.body.imagePath).toMatch(/^uploads\/.+\.jpg$/);

    // Verify the file was actually written to the temp directory
    const filename = response.body.imagePath.replace('uploads/', '');
    expect(fs.existsSync(path.join(uploadsDir, filename))).toBe(true);
  });

  it('should return 404 when the Lucky Cat does not exist', async () => {
    const response = await request(app)
      .post('/lucky-cats/999/image')
      .attach('image', Buffer.from('fake-jpeg-data'), { filename: 'cat.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toContain('999');
  });

  it('should return 400 when no file is attached', async () => {
    const response = await request(app).post('/lucky-cats/1/image');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('No image file attached');
  });

  it('should return 400 when file type is not allowed', async () => {
    const response = await request(app)
      .post('/lucky-cats/1/image')
      .attach('image', Buffer.from('<svg/>'), { filename: 'cat.svg', contentType: 'image/svg+xml' });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain('image/svg+xml');
  });

  it('should accept image/png files (200)', async () => {
    const response = await request(app)
      .post('/lucky-cats/1/image')
      .attach('image', Buffer.from('fake-png-data'), { filename: 'cat.png', contentType: 'image/png' });

    expect(response.status).toBe(200);
    expect(response.body.imagePath).toMatch(/^uploads\/.+\.png$/);
  });

  it('should accept image/webp files (200)', async () => {
    const response = await request(app)
      .post('/lucky-cats/1/image')
      .attach('image', Buffer.from('fake-webp-data'), { filename: 'cat.webp', contentType: 'image/webp' });

    expect(response.status).toBe(200);
    expect(response.body.imagePath).toMatch(/^uploads\/.+\.webp$/);
  });

  it('should clean up uploaded file when Lucky Cat does not exist', async () => {
    const response = await request(app)
      .post('/lucky-cats/999/image')
      .attach('image', Buffer.from('fake-jpeg-data'), { filename: 'cat.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(404);
    // Uploads dir should be empty (file was cleaned up)
    const files = fs.readdirSync(uploadsDir);
    expect(files).toHaveLength(0);
  });
});
