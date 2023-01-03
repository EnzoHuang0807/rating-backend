import { Router } from 'express';
import RatingRouter from './rating.js';

const router = Router();
router.use('/', RatingRouter);
export default router;