import { Router } from 'express';
import tenantsRouter from './tenants';
import { authenticateAdmin } from '../../middleware/authenticateAdmin';

const router = Router();

// All admin routes require admin authentication
router.use(authenticateAdmin);

router.use('/tenants', tenantsRouter);

export default router;
