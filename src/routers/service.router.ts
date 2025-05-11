import { Router } from 'express';
import { analyzeImage, upload, getProductById, getAllProducts } from '../controllers/catalogue.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/catalogue', authMiddleware, upload.single('image'), analyzeImage);
router.get('/product/:id', authMiddleware, getProductById);
router.get('/products', authMiddleware, getAllProducts);


export default router;