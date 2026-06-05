import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { AuthController } from '../controllers/auth.controller';

export function authRouter(pool: Pool): Router {
  const router = Router();
  const controller = new AuthController(pool);

  router.post('/register', (req, res) => controller.register(req, res));
  router.post('/login', (req, res) => controller.login(req, res));

  return router;
}
