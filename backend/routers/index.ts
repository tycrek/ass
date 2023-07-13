import { Router } from 'express';
import { log } from '../log';
import { UserConfig } from '../UserConfig';

const router = Router({ caseSensitive: true });

router.get('/', (req, res) => UserConfig.ready ? res.render('index') : res.redirect('/setup'));

export { router };
