import fs from 'fs-extra';
import { path } from '@tycrek/joint';
import { Router, json as BodyParserJson } from 'express';
import { log } from '../log';

const router = Router({ caseSensitive: true });
const userConfigExists = fs.pathExistsSync(path.join('userconfig.json'));

router.get('/', (req, res) => userConfigExists ? res.render('index') : res.redirect('/setup'));

export { router };
