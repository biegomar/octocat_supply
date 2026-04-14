/**
 * @swagger
 * components:
 *   schemas:
 *     HappyCat:
 *       type: object
 *       required:
 *         - happyCatId
 *         - catName
 *         - productId
 *         - imagePath
 *         - uploadedAt
 *       properties:
 *         happyCatId:
 *           type: integer
 *           description: The unique identifier for the happy cat entry
 *         catName:
 *           type: string
 *           description: The name of the cat
 *         productId:
 *           type: integer
 *           description: The ID of the product the cat is associated with
 *         imagePath:
 *           type: string
 *           description: The file path to the uploaded cat image
 *         uploadedAt:
 *           type: string
 *           format: date-time
 *           description: The timestamp when the image was uploaded
 *         comment:
 *           type: string
 *           nullable: true
 *           description: An optional comment from the customer explaining why their cat is so happy
 *     HappyCatWithProduct:
 *       allOf:
 *         - $ref: '#/components/schemas/HappyCat'
 *         - type: object
 *           required:
 *             - productName
 *             - productImgName
 *           properties:
 *             productName:
 *               type: string
 *               description: The name of the associated product
 *             productImgName:
 *               type: string
 *               description: The image filename of the associated product
 */
export interface HappyCat {
  happyCatId: number;
  catName: string;
  productId: number;
  imagePath: string;
  uploadedAt: string;
  comment?: string | null;
}

export interface HappyCatWithProduct extends HappyCat {
  productName: string;
  productImgName: string;
}
