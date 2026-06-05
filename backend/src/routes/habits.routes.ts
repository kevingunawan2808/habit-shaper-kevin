import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { HabitsController } from '../controllers/habits.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function habitsRouter(pool: Pool): Router {
  const router = Router();
  const controller = new HabitsController(pool);

  router.use(authMiddleware);
  router.get('/weekly', (req, res) => controller.getWeeklyHabits(req, res));
  router.get('/', (req, res) => controller.getHabits(req, res));
  router.post('/', (req, res) => controller.createHabit(req, res));
  router.patch('/:id/mark', (req, res) => controller.markHabit(req, res));
  router.delete('/:id/mark', (req, res) => controller.unmarkHabit(req, res));
  router.delete('/:id', (req, res) => controller.deleteHabit(req, res));

  return router;
}
