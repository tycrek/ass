import { Router } from 'express';
import { path } from '@tycrek/joint';

import { App } from '../app.js';
import { UserConfig } from '../UserConfig.js';

/**
 * Builds a basic router for loading a page with frontend JS
 */
export const buildFrontendRouter = (page: string, onConfigReady = true) => {

	// Config readiness checker
	const ready = () => (onConfigReady)
		? UserConfig.ready
		: !UserConfig.ready;

	// Set up a router
	const router = Router({ caseSensitive: true });

	// Render the page
	router.get('/', (_req, res) => ready()
		? res.render(page, { version: App.pkgVersion })
		: res.redirect('/'));

	// Load frontend JS
	router.get('/ui.js', (_req, res) => ready()
		? res.type('text/javascript').sendFile(path.join(`dist/frontend/${page}.mjs`))
		: res.sendStatus(403));

	return router;
};
