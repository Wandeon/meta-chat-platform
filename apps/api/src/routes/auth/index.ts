import { Router } from 'express';
import signupRouter from './signup';
import verifyEmailRouter from './verify-email';
import loginRouter from './login';
import forgotPasswordRouter from './forgot-password';
import resetPasswordRouter from './reset-password';
import adminLoginRouter from './admin-login';

const router = Router();

// Mount auth routes
router.use('/', signupRouter);
router.use('/', verifyEmailRouter);
router.use('/', loginRouter);
router.use('/', forgotPasswordRouter);
router.use('/', resetPasswordRouter);
router.use('/', adminLoginRouter);

export default router;
