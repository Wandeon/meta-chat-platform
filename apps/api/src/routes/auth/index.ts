import { Router } from 'express';
import signupRouter from './signup';
import verifyEmailRouter from './verify-email';
import loginRouter from './login';
import forgotPasswordRouter from './forgot-password';
import resetPasswordRouter from './reset-password';

const router = Router();

// Mount auth routes
router.use('/', signupRouter);
router.use('/', verifyEmailRouter);
router.use('/', loginRouter);
router.use('/', forgotPasswordRouter);
router.use('/', resetPasswordRouter);

export default router;
