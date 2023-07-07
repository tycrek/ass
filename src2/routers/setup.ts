import { Router, json as BodyParserJson } from 'express';
import { log } from '../log';

const router = Router({ caseSensitive: true });

router.get('/', (req, res) => res.render('setup'));

export { router };
