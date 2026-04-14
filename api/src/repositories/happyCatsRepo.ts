/**
 * Repository for happy_cats data access
 */

import { getDatabase, DatabaseConnection } from '../db/sqlite';
import { HappyCatWithProduct } from '../models/happyCat';
import { handleDatabaseError, NotFoundError, ValidationError } from '../utils/errors';
import { buildInsertSQL, objectToCamelCase, mapDatabaseRows, DatabaseRow } from '../utils/sql';
import { getProductsRepository } from './productsRepo';

const SELECT_WITH_PRODUCT = `
  SELECT
    hc.happy_cat_id,
    hc.cat_name,
    hc.product_id,
    hc.image_path,
    hc.uploaded_at,
    hc.comment,
    p.name AS product_name,
    p.img_name AS product_img_name
  FROM happy_cats hc
  INNER JOIN products p ON hc.product_id = p.product_id
`.trim();

export class HappyCatsRepository {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Get all happy cats with product info, newest first
   */
  async findAll(): Promise<HappyCatWithProduct[]> {
    try {
      const rows = await this.db.all<DatabaseRow>(`${SELECT_WITH_PRODUCT} ORDER BY hc.uploaded_at DESC`);
      return mapDatabaseRows<HappyCatWithProduct>(rows);
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Get happy cat by ID with product info
   */
  async findById(id: number): Promise<HappyCatWithProduct | null> {
    try {
      const row = await this.db.get<DatabaseRow>(`${SELECT_WITH_PRODUCT} WHERE hc.happy_cat_id = ?`, [id]);
      return row ? objectToCamelCase<HappyCatWithProduct>(row) : null;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Create a new happy cat entry
   */
  async create(data: { catName: string; productId: number; imagePath: string; comment?: string | null }): Promise<HappyCatWithProduct> {
    try {
      const productsRepo = await getProductsRepository();
      const productExists = await productsRepo.exists(data.productId);
      if (!productExists) {
        throw new ValidationError(`Product with ID ${data.productId} does not exist`);
      }

      const { sql, values } = buildInsertSQL('happy_cats', data);
      const result = await this.db.run(sql, values);

      const created = await this.findById(result.lastID || 0);
      if (!created) {
        throw new Error('Failed to retrieve created happy cat');
      }

      return created;
    } catch (error) {
      handleDatabaseError(error);
    }
  }

  /**
   * Update the image_path of a happy cat by ID
   */
  async updateImagePath(id: number, imagePath: string): Promise<HappyCatWithProduct> {
    try {
      const result = await this.db.run(
        'UPDATE happy_cats SET image_path = ? WHERE happy_cat_id = ?',
        [imagePath, id],
      );
      if (result.changes === 0) {
        throw new NotFoundError('HappyCat', id);
      }
      const updated = await this.findById(id);
      if (!updated) {
        throw new NotFoundError('HappyCat', id);
      }
      return updated;
    } catch (error) {
      handleDatabaseError(error, 'HappyCat', id);
    }
  }

  /**
   * Clear the image_path of a happy cat by ID (set to empty string)
   */
  async clearImagePath(id: number): Promise<void> {
    try {
      const result = await this.db.run(
        "UPDATE happy_cats SET image_path = '' WHERE happy_cat_id = ?",
        [id],
      );
      if (result.changes === 0) {
        throw new NotFoundError('HappyCat', id);
      }
    } catch (error) {
      handleDatabaseError(error, 'HappyCat', id);
    }
  }

  /**
   * Delete a happy cat by ID
   */
  async delete(id: number): Promise<void> {
    try {
      const result = await this.db.run('DELETE FROM happy_cats WHERE happy_cat_id = ?', [id]);

      if (result.changes === 0) {
        throw new NotFoundError('HappyCat', id);
      }
    } catch (error) {
      handleDatabaseError(error, 'HappyCat', id);
    }
  }
}

// Factory function to create repository instance
export async function createHappyCatsRepository(isTest: boolean = false): Promise<HappyCatsRepository> {
  const db = await getDatabase(isTest);
  return new HappyCatsRepository(db);
}

// Singleton instance for default usage
let happyCatsRepo: HappyCatsRepository | null = null;

export async function getHappyCatsRepository(isTest: boolean = false): Promise<HappyCatsRepository> {
  const isTestEnv = isTest || process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
  if (isTestEnv) {
    return createHappyCatsRepository(true);
  }
  if (!happyCatsRepo) {
    happyCatsRepo = await createHappyCatsRepository(false);
  }
  return happyCatsRepo;
}
