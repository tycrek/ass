import { FileData } from './definitions';
import fs from 'fs-extra';
import crypto from 'crypto';
import toArray from 'stream-to-array';
import { log } from './utils';

/**
 * Generates a SHA1 hash for the provided file
 * @param {*} file The file to hash
 * @returns The SHA1 hash
 */
export default (file: FileData): Promise<string> =>
	new Promise((resolve, reject) =>
		toArray((fs.createReadStream(file.path)))
			.then((parts: any[]) => Buffer.concat(parts.map((part: any) => (Buffer.isBuffer(part) ? part : Buffer.from(part)))))
			.then((buf: Buffer) => crypto.createHash('sha1').update(buf).digest('hex')) // skipcq: JS-D003
			.then((hash: String) => log.debug(`Hash for ${file.originalname}`, hash, 'SHA1, hex').callback(resolve, hash))
			.catch(reject));
