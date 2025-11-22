import { Router } from 'express';
import signupRouter from './signup';
import verifyEmailRouter from './verify-email';
import loginRouter from './login';

const router = Router();

// Mount auth routes
router.use('/', signupRouter);
router.use('/', verifyEmailRouter);
router.use('/', loginRouter);

export default router;
EOF'
