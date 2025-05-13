import { Router } from 'express';
import { analyzeImage, upload, getProductById, getAllProducts, storeProductData } from '../controllers/catalogue.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/analyze', authMiddleware, upload.single('image'), analyzeImage);
router.post('/store', authMiddleware, upload.single('image'), storeProductData);
router.get('/product/:id', authMiddleware, getProductById);
router.get('/products', authMiddleware, getAllProducts);



export default router;