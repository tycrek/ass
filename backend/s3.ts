import { ReadStream } from 'fs';
import { UserConfig } from './UserConfig';
import { log } from './log';
import { AssFile } from 'ass';

const NYI = 'Not yet implemented';
const NYR = 'S3 not ready';
const s3readyCheck = (): boolean => UserConfig.ready && UserConfig.config.s3 != null;

/**
 * Uploads a file to your configured S3 provider
 */
export const uploadFileS3 = (file: ReadStream, metadata: AssFile): Promise<string> => new Promise((resolve, reject) => {
	if (!s3readyCheck) return reject(NYR);

	// todo: S3 upload logic
	metadata.filename;
	metadata.mimetype;
	metadata.sha256;

	log.warn('S3 Upload', NYI);
	reject(NYI);
});

/**
 * Gets a file from your configured S3 provider
 */
export const getFileS3 = (): Promise<string> => new Promise((resolve, reject) => {
	if (!s3readyCheck) return reject(NYR);

	// todo: S3 get logic

	log.warn('S3 Get', NYI);
	reject(NYI);
});

/**
 * Deletes a file from your configured S3 provider
 */
export const deleteFileS3 = (): Promise<void> => new Promise((resolve, reject) => {
	if (!s3readyCheck) return reject(NYR);

	log.warn('S3 Delete', NYI);
	reject(NYI);
});
