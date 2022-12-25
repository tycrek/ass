/**
 * Developer API
 * - Users
 * - Resources
 */

import { Router, Request, Response, NextFunction } from 'express';
import { findFromToken, setUserPassword, users, createNewUser } from '../auth';
import { log } from '../utils';
import { data } from '../data';
import { User } from '../types/auth';

/**
 * The primary API router
 */
const RouterApi = Router();

/**
 * Token authentication middleware for Admins
 */
const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const user = findFromToken(req.headers.authorization ?? '');
	(user && user.admin) ? next() : res.sendStatus(401);
};

/**
 * Simple function to either return JSON or a 404, so I don't have to write it 40 times.
 */
const userFinder = (res: Response, user: User | undefined) => user ? res.json(user) : res.sendStatus(404);

function buildUserRouter() {
	const userRouter = Router();

	// Index
	userRouter.get('/', (_req: Request, res: Response) => res.sendStatus(200));

	// Get all users
	// Admin only
	userRouter.get('/all', adminAuthMiddleware, (req: Request, res: Response) => res.json(users));

	// Get self
	userRouter.get('/self', (req: Request, res: Response) =>
		userFinder(res, findFromToken(req.headers['authorization'] ?? '') ?? undefined));

	// Get user by token
	userRouter.get('/token/:token', (req: Request, res: Response) =>
		userFinder(res, users.find(user => user.token === req.params.token)));

	// Reset password (new plaintext password in form data; HOST SHOULD BE USING HTTPS)
	// Admin only
	userRouter.post('/reset', adminAuthMiddleware, (req: Request, res: Response) => {
		const id = req.body.id;
		const newPassword = req.body.password;

		setUserPassword(id, newPassword)
			.then(() => res.sendStatus(200))
			.catch((err) => (log.error(err), res.sendStatus(500)));
	});

	// Create a new user
	// Admin only
	userRouter.post('/new', adminAuthMiddleware, (req: Request, res: Response) => {
		const username: string | undefined = req.body.username;
		const password: string | undefined = req.body.password;
		const admin = req.body.admin ?? false;
		const meta: any = req.body.meta ?? {};

		// Block if username or password is empty, or if username is already taken
		if (username == null || username.length === 0 || password == null || password.length == 0 || users.find(user => user.username === username))
			return res.sendStatus(400);

		createNewUser(username, password, admin, meta)
			.then((user) => res.send(user))
			.catch((err) => (log.error(err), res.sendStatus(500)));
	});

	// Get a user (must be last as it's a catch-all)
	// Admin only
	userRouter.get('/:id', adminAuthMiddleware, (req: Request, res: Response) =>
		userFinder(res, users.find(user => user.unid === req.params.id || user.username === req.params.id)));

	return userRouter;
}

function buildResourceRouter() {
	const resourceRouter = Router();

	return resourceRouter;
}

export const onStart = () => {
	RouterApi.use('/user', buildUserRouter());
	RouterApi.use('/resource', buildResourceRouter());

	return RouterApi;
};
