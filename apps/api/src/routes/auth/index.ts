import { Router } from 'express';
import signupRouter from './signup';
import verifyEmailRouter from './verify-email';

const router = Router();

// Mount auth routes
router.use('/', signupRouter);
router.use('/', verifyEmailRouter);

export default router;
