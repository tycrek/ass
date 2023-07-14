import fs from 'fs-extra';
import bb from 'express-busboy';
import { Router } from 'express';
import { nanoid } from 'nanoid';
import { log } from '../log';
import { UserConfig } from '../UserConfig';
import { random } from '../generators';
import { BusBoyFile, AssFile } from 'ass';

const router = Router({ caseSensitive: true });

//@ts-ignore // Required since bb.extends expects express.Application, not a Router (but it still works)
bb.extend(router, {
	upload: true,
	restrictMultiple: true,
	allowedPath: (url: string) => url === '/',
	limits: {
		fileSize: () => (UserConfig.ready ? UserConfig.config.maximumFileSize : 50) * 1000000 // MB
	}
});

// Render or redirect
router.get('/', (req, res) => UserConfig.ready ? res.render('index') : res.redirect('/setup'));

// Upload flow
router.post('/', async (req, res) => {

	// Check user config
	if (!UserConfig.ready) return res.status(500).type('text').send('Configuration missing!');

	// Does the file actually exist
	if (!req.files || !req.files['file']) return res.status(400).type('text').send('No file was provided!');

	// Type-check the file data
	const bbFile: BusBoyFile = req.files['file'];

	// Prepare file move
	const uploads = UserConfig.config.uploadsDir;
	const timestamp = Date.now().toString();
	const destination = `${uploads}${uploads.endsWith('/') ? '' : '/'}${timestamp}_${bbFile.filename}`;
	// todo: S3

	try {

		// Move the file
		await fs.move(bbFile.file, destination);

		// Build ass metadata
		const assFile: AssFile = {
			fakeid: random({ length: UserConfig.config.idSize }), // todo: more generators
			id: nanoid(32),
			mimetype: bbFile.mimetype,
			filename: bbFile.filename,
			timestamp,
			uploader: '0', // todo: users
			save: { local: destination },
			sha256: '0' // todo: hashing
		};

		log.debug('File saved to', assFile.save.local!);

		// todo: save metadata

		return res.type('json').send({ resource: `${req.ass.host}/${assFile.fakeid}` });
	} catch (err) {
		log.error('Failed to upload file', bbFile.filename);
		console.error(err);
		return res.status(500).send(err);
	}
});

export { router };
