import jwt from 'jsonwebtoken';
import env from '../config/env.js';

export const signToken = (user) =>
  jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );

export const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

export default { signToken, verifyToken };
