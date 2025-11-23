import { Router } from 'express';
import signupRouter from './signup';
import verifyEmailRouter from './verify-email';
import loginRouter from './login';
import forgotPasswordRouter from './forgot-password';
import resetPasswordRouter from './reset-password';
import { authLimiter } from '../../middleware/rateLimiting';

const router = Router();

// Mount auth routes
router.use(authLimiter);
router.use('/', signupRouter);
router.use('/', verifyEmailRouter);
router.use('/', loginRouter);
router.use('/', forgotPasswordRouter);
router.use('/', resetPasswordRouter);

export default router;
