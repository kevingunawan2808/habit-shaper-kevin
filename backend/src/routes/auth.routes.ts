import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function authRouter(pool: Pool): Router {
  const router = Router();
  const controller = new AuthController(pool);

  router.post('/register', (req, res) => controller.register(req, res));
  router.post('/login', (req, res) => controller.login(req, res));
  router.get('/me', authMiddleware, (req, res) => controller.me(req, res));

  return router;
}
