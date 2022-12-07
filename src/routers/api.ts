/**
 * Developer API
 * - Users
 * - Resources
 */

import { Router, Request, Response, NextFunction } from 'express';
import { users } from '../auth';
import { data } from '../data';

const RouterUser = Router();
const RouterResource = Router();

/**
 * Token authentication middleware
 */
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const token = req.headers.authorization;
	(token && users[token])
		? next()
		: res.sendStatus(401);
};
