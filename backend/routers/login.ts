import { path } from '@tycrek/joint';
import { Router, json as BodyParserJson } from 'express';
import { log } from '../log';
import { UserConfig } from '../UserConfig';
import { App } from '../app';

const router = Router({ caseSensitive: true });

// Static routes
router.get('/', (req, res) => !UserConfig.ready ? res.redirect('/') : res.render('login', { version: App.pkgVersion }));
router.get('/ui.js', (req, res) => !UserConfig.ready ? res.send('') : res.type('text/javascript').sendFile(path.join('dist-frontend/login.mjs')));

router.post('/', BodyParserJson(), async (req, res) => {
});

export { router };
