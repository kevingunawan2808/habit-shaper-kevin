import { Router } from 'express';
import { Pool } from 'mysql2/promise';
import { GoalsController } from '../controllers/goals.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function goalsRouter(pool: Pool): Router {
  const router = Router();
  const controller = new GoalsController(pool);

  router.use(authMiddleware);
  router.get('/', (req, res) => controller.getGoals(req, res));
  router.post('/', (req, res) => controller.createGoal(req, res));
  router.put('/:id', (req, res) => controller.updateGoal(req, res));
  router.post('/:goalId/habits/:habitId', (req, res) => controller.linkHabit(req, res));
  router.delete('/:goalId/habits/:habitId', (req, res) => controller.unlinkHabit(req, res));
  router.delete('/:id', (req, res) => controller.deleteGoal(req, res));

  return router;
}
