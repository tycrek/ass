import fs from 'fs-extra';
import { path } from '@tycrek/joint';
import { Router, json as BodyParserJson } from 'express';
import { log } from '../log';
import { UserConfiguration } from 'ass';

const router = Router({ caseSensitive: true });
const userConfigExists = () => fs.pathExistsSync(path.join('userconfig.json'));

// Static routes
router.get('/', (req, res) => userConfigExists() ? res.redirect('/') : res.render('setup'));
router.get('/ui.js', (req, res) => userConfigExists() ? res.send('') : res.type('text').sendFile(path.join('dist-frontend/setup.mjs')));

// Setup route
router.post('/', BodyParserJson(), (req, res) => {
	if (userConfigExists())
		return res.status(409).json({ success: false, message: 'User config already exists' });

	log.debug('Running setup');

	// Parse body
	const body = req.body as UserConfiguration;

	// temp: print body for testing
	log.debug('Uploads dir', body.uploadsDir);
	log.debug('ID type', body.idType);
	log.debug('ID size', body.idSize.toString());
	log.debug('Gfy size', body.gfySize.toString());
	log.debug('Max file size', body.maximumFileSize.toString());

	return res.json({ success: true });
});

export { router };
