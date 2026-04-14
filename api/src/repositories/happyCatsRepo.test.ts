import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HappyCatsRepository } from './happyCatsRepo';
import { NotFoundError, ValidationError } from '../utils/errors';

vi.mock('../db/sqlite', () => ({
  getDatabase: vi.fn(),
}));

vi.mock('./productsRepo', () => ({
  getProductsRepository: vi.fn(),
}));

import { getProductsRepository } from './productsRepo';

const SELECT_WITH_PRODUCT = `SELECT
    hc.happy_cat_id,
    hc.cat_name,
    hc.product_id,
    hc.image_path,
    hc.uploaded_at,
    p.name AS product_name,
    p.img_name AS product_img_name
  FROM happy_cats hc
  INNER JOIN products p ON hc.product_id = p.product_id`;

const mockHappyCatRow = {
  happy_cat_id: 1,
  cat_name: 'Whiskers',
  product_id: 10,
  image_path: '/uploads/whiskers.jpg',
  uploaded_at: '2026-04-14T12:00:00',
  product_name: 'Cat Treat Premium',
  product_img_name: 'cat_treat.png',
};

const expectedHappyCat = {
  happyCatId: 1,
  catName: 'Whiskers',
  productId: 10,
  imagePath: '/uploads/whiskers.jpg',
  uploadedAt: '2026-04-14T12:00:00',
  productName: 'Cat Treat Premium',
  productImgName: 'cat_treat.png',
};

describe('HappyCatsRepository', () => {
  let repository: HappyCatsRepository;
  let mockDb: any;
  let mockProductsRepo: any;

  beforeEach(() => {
    mockDb = {
      db: {} as any,
      run: vi.fn(),
      get: vi.fn(),
      all: vi.fn(),
      close: vi.fn(),
    };

    mockProductsRepo = {
      exists: vi.fn(),
    };

    (getProductsRepository as any).mockResolvedValue(mockProductsRepo);

    repository = new HappyCatsRepository(mockDb);
    vi.clearAllMocks();
    (getProductsRepository as any).mockResolvedValue(mockProductsRepo);
  });

  describe('findAll', () => {
    it('should return all happy cats with product info ordered by uploaded_at DESC', async () => {
      mockDb.all.mockResolvedValue([mockHappyCatRow]);

      const result = await repository.findAll();

      expect(mockDb.all).toHaveBeenCalledWith(expect.stringContaining('ORDER BY hc.uploaded_at DESC'));
      expect(mockDb.all).toHaveBeenCalledWith(expect.stringContaining('INNER JOIN products p ON hc.product_id = p.product_id'));
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(expectedHappyCat);
    });

    it('should return empty array when no happy cats exist', async () => {
      mockDb.all.mockResolvedValue([]);

      const result = await repository.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return happy cat with product info when found', async () => {
      mockDb.get.mockResolvedValue(mockHappyCatRow);

      const result = await repository.findById(1);

      expect(mockDb.get).toHaveBeenCalledWith(
        expect.stringContaining('WHERE hc.happy_cat_id = ?'),
        [1],
      );
      expect(result).toEqual(expectedHappyCat);
    });

    it('should return null when happy cat not found', async () => {
      mockDb.get.mockResolvedValue(undefined);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    const newData = { catName: 'Luna', productId: 10, imagePath: '/uploads/luna.jpg' };

    it('should create a new happy cat and return it with product info', async () => {
      mockProductsRepo.exists.mockResolvedValue(true);
      mockDb.run.mockResolvedValue({ lastID: 2, changes: 1 });
      mockDb.get.mockResolvedValue({ ...mockHappyCatRow, happy_cat_id: 2, cat_name: 'Luna', image_path: '/uploads/luna.jpg' });

      const result = await repository.create(newData);

      expect(mockProductsRepo.exists).toHaveBeenCalledWith(10);
      expect(mockDb.run).toHaveBeenCalledWith(
        'INSERT INTO happy_cats (cat_name, product_id, image_path) VALUES (?, ?, ?)',
        ['Luna', 10, '/uploads/luna.jpg'],
      );
      expect(result.catName).toBe('Luna');
    });

    it('should throw ValidationError when product does not exist', async () => {
      mockProductsRepo.exists.mockResolvedValue(false);

      await expect(repository.create(newData)).rejects.toThrow(ValidationError);
      expect(mockDb.run).not.toHaveBeenCalled();
    });
  });

  describe('updateImagePath', () => {
    it('should update image_path and return the updated happy cat', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });
      mockDb.get.mockResolvedValue({ ...mockHappyCatRow, image_path: '/uploads/new-uuid.jpg' });

      const result = await repository.updateImagePath(1, '/uploads/new-uuid.jpg');

      expect(mockDb.run).toHaveBeenCalledWith(
        'UPDATE happy_cats SET image_path = ? WHERE happy_cat_id = ?',
        ['/uploads/new-uuid.jpg', 1],
      );
      expect(result.imagePath).toBe('/uploads/new-uuid.jpg');
    });

    it('should throw NotFoundError when happy cat does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.updateImagePath(999, '/uploads/x.jpg')).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('should delete existing happy cat', async () => {
      mockDb.run.mockResolvedValue({ changes: 1 });

      await repository.delete(1);

      expect(mockDb.run).toHaveBeenCalledWith('DELETE FROM happy_cats WHERE happy_cat_id = ?', [1]);
    });

    it('should throw NotFoundError when happy cat does not exist', async () => {
      mockDb.run.mockResolvedValue({ changes: 0 });

      await expect(repository.delete(999)).rejects.toThrow(NotFoundError);
    });
  });
});
