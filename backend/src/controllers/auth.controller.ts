import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';

const jwtOptions = (): SignOptions => ({
  expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
});

export class AuthController {
  constructor(private pool: Pool) {}

  async register(req: Request, res: Response): Promise<void> {
    const { email, password, timezone = 'UTC' } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const [existing] = await this.pool.query<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      res.status(409).json({ success: false, message: 'Email already registered' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await this.pool.query<ResultSetHeader>(
      'INSERT INTO users (email, password_hash, timezone) VALUES (?, ?, ?)',
      [email, passwordHash, timezone]
    );

    const token = jwt.sign(
      { userId: result.insertId, email },
      process.env.JWT_SECRET!,
      jwtOptions()
    );

    res.status(201).json({ success: true, data: { token, userId: result.insertId } });
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: 'Email and password are required' });
      return;
    }

    const [rows] = await this.pool.query<RowDataPacket[]>(
      'SELECT id, email, password_hash FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      jwtOptions()
    );

    res.json({ success: true, data: { token, userId: user.id } });
  }
}
