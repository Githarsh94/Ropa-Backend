import { Router } from 'express';
import { analyzeImage, upload } from '../controllers/catalogue.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/catalogue', authMiddleware, upload.single('image'), analyzeImage);

export default router;