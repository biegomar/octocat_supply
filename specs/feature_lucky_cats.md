# Feature: Happy Customers (Happy Cats)

## Kontext

Kunden sollen Fotos ihrer glücklichen Katzen hochladen können. Beim Upload wählen sie das Produkt aus, das ihre Katze glücklich gemacht hat, und geben den Namen der Katze an. Eine öffentliche Seite ("Happy Customers") zeigt alle Einsendungen als Bildergalerie.

Aktuell gibt es weder File-Upload-Infrastruktur (kein multer) noch eine entsprechende Datenbankentität. Die Implementierung folgt strikt den bestehenden Mustern des Projekts: Migration → Model → Repository → Route → Frontend.

---

## Implementierungsreihenfolge

### 1. NPM-Abhängigkeiten installieren
```bash
cd api && npm install multer uuid && npm install --save-dev @types/multer @types/uuid
```

### 2. Datenbank-Migration
**Neue Datei:** `api/database/migrations/003_add_happy_cats.sql`
```sql
CREATE TABLE happy_cats (
    happy_cat_id INTEGER PRIMARY KEY,
    cat_name TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    uploaded_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);
CREATE INDEX idx_happy_cats_product_id ON happy_cats(product_id);
CREATE INDEX idx_happy_cats_uploaded_at ON happy_cats(uploaded_at);
```

### 3. TypeScript Model
**Neue Datei:** `api/src/models/happyCat.ts`
- Interface `HappyCat`: `happyCatId`, `catName`, `productId`, `imagePath`, `uploadedAt`
- Interface `HappyCatWithProduct extends HappyCat`: + `productName`, `productImgName`
- Inline Swagger JSDoc für beide Schemas

### 4. Repository
**Neue Datei:** `api/src/repositories/happyCatsRepo.ts`
- `findAll()` → `HappyCatWithProduct[]` (JOIN mit products, ORDER BY uploaded_at DESC)
- `findById(id)` → `HappyCatWithProduct | null`
- `create(data: Omit<HappyCat, 'happyCatId' | 'uploadedAt'>)` → `HappyCatWithProduct`
  - Vor dem Insert: `productsRepo.exists(productId)` prüfen → bei Fehler `ValidationError`
  - `buildInsertSQL()` + `objectToSnakeCase()` aus `utils/sql.ts` nutzen
- `delete(id)` → `void` (wirft `NotFoundError` wenn `changes === 0`)
- Factory: `createHappyCatsRepository(isTest?)`, Singleton: `getHappyCatsRepository(isTest?)`

### 5. Repository Test
**Neue Datei:** `api/src/repositories/happyCatsRepo.test.ts`
- `vi.mock('../db/sqlite')` — gemocktes `mockDb`
- Tests: `findAll`, `findById`, `create` (happy path + FK-Fehler), `delete` (NotFoundError)

### 6. Route (inkl. multer)
**Neue Datei:** `api/src/routes/happyCat.ts`

**Multer-Konfiguration (lokal im Route-File):**
- Upload-Verzeichnis: `api/uploads/happycats/` (mit `fs.mkdirSync` beim Laden erstellt)
- Dateiname: `uuidv4() + path.extname(originalname).toLowerCase()`
- `fileFilter`: nur `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` erlaubt → sonst `ValidationError`
- `limits.fileSize`: 5 MB

**Endpunkte:**
- `GET /` → alle Einsendungen (inkl. Produkt-Details)
- `GET /:id` → einzelne Einsendung
- `POST /` → `upload.single('image')` Middleware, dann Handler:
  - Pflichtfelder prüfen: `req.file`, `catName`, `productId` → bei Fehler Upload-Datei löschen
  - `imagePath = /uploads/happycats/${req.file.filename}`
  - `repo.create(...)` → bei Fehler Upload-Datei löschen, dann `next(error)`
  - Status 201 zurückgeben

**Swagger JSDoc** für alle 3 Endpunkte (multipart/form-data für POST)

### 7. API-Server anpassen
**Datei ändern:** `api/src/index.ts`
```typescript
import path from 'path';
import happyCatRoutes from './routes/happyCat';

// Nach app.use(express.json()):
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Bei den anderen Route-Registrierungen:
app.use('/api/happy-cats', happyCatRoutes);
```
- `path.join(__dirname, '../uploads')` funktioniert sowohl in `src/` (Dev) als auch in `dist/` (Build)

### 8. Route-Integrations-Test
**Neue Datei:** `api/src/routes/happyCat.test.ts`
- `vi.mock('multer', ...)` → Passthrough-Middleware, die `req.file` auf Fixture setzt
- Frische In-Memory-SQLite + Migrationen im `beforeEach`
- Seed: Supplier + Product
- Tests: POST 201, POST 400 (fehlende Felder), POST 400 (ungültige productId), GET 200, GET/:id 200, GET/999 404

### 9. Frontend: API-Konfiguration
**Datei ändern:** `frontend/src/api/config.ts`
```typescript
happyCats: '/api/happy-cats',
```

### 10. Frontend: Komponenten
**Neue Dateien** unter `frontend/src/components/entity/happyCat/`:

**`HappyCatCard.tsx`** (presentational):
- Props: `happyCat: HappyCatWithProduct`
- `<img src={api.baseURL + happyCat.imagePath}>`, Katzenname, `productName`, Datum
- Styling: `rounded-lg overflow-hidden shadow-lg hover:scale-105 hover:shadow-[0_0_25px_rgba(118,184,82,0.3)]`

**`HappyCatUploadForm.tsx`** (Modal):
- Props: `products: Product[], onClose: () => void, onSuccess: () => void`
- State: `catName`, `productId`, `imageFile`, `imagePreview` (via `URL.createObjectURL`), `isSubmitting`, `error`
- `useEffect`-Cleanup: `URL.revokeObjectURL(imagePreview)` bei Unmount
- Submit: `FormData` mit `image`, `catName`, `productId` → `axios.post(..., formData, { headers: { 'Content-Type': 'multipart/form-data' } })`
- Modal-Styling: identisch zu `ProductForm.tsx` (`fixed inset-0 bg-black bg-opacity-50`)

**`HappyCats.tsx`** (Seite):
- React Query: `useQuery('happyCats', ...)` + `useQuery('products', ...)`
- State: `showUploadModal: boolean`
- Layout: Header mit "Share Your Happy Cat"-Button, Card-Grid (`grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4`), Loading-Spinner, Empty State, Upload-Modal
- `onSuccess`: `refetch()` aufrufen

### 11. Routing & Navigation
**Datei ändern:** `frontend/src/App.tsx`
```typescript
import HappyCats from './components/entity/happyCat/HappyCats';
<Route path="/happy-cats" element={<HappyCats />} />
```

**Datei ändern:** `frontend/src/components/Navigation.tsx`
```tsx
<Link to="/happy-cats" className={navLinkClasses}>Happy Customers</Link>
```
(zwischen "Products" und "About us")

---

## Alle betroffenen Dateien

| Typ | Datei |
|-----|-------|
| NEU | `api/database/migrations/003_add_happy_cats.sql` |
| NEU | `api/src/models/happyCat.ts` |
| NEU | `api/src/repositories/happyCatsRepo.ts` |
| NEU | `api/src/repositories/happyCatsRepo.test.ts` |
| NEU | `api/src/routes/happyCat.ts` |
| NEU | `api/src/routes/happyCat.test.ts` |
| NEU | `frontend/src/components/entity/happyCat/HappyCats.tsx` |
| NEU | `frontend/src/components/entity/happyCat/HappyCatCard.tsx` |
| NEU | `frontend/src/components/entity/happyCat/HappyCatUploadForm.tsx` |
| ÄNDERN | `api/src/index.ts` |
| ÄNDERN | `api/package.json` (via npm install) |
| ÄNDERN | `frontend/src/api/config.ts` |
| ÄNDERN | `frontend/src/App.tsx` |
| ÄNDERN | `frontend/src/components/Navigation.tsx` |

---

## Verifikation

1. `cd api && npm install` — keine TS-Fehler
2. `make db-migrate` — Migration 003 läuft durch
3. `make test-api` — alle neuen Tests grün
4. `make dev` — Server starten
5. Browser: `http://localhost:5137/happy-cats` — Seite lädt
6. "Share Your Happy Cat" klicken → Modal öffnet → Bild auswählen, Katzenname eingeben, Produkt wählen → Absenden
7. Neues Katzenbild erscheint in der Galerie
8. `http://localhost:3000/api-docs` — HappyCats-Endpunkte im Swagger UI sichtbar
9. `make swagger` — `api-swagger.json` aktualisieren
