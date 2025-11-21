import { Router } from 'express';
import signupRouter from './signup';
import verifyEmailRouter from './verify-email';
import widgetTokenRouter from './widget-token';

const router = Router();

// Mount auth routes
router.use('/', signupRouter);
router.use('/', verifyEmailRouter);
router.use('/', widgetTokenRouter);

export default router;
