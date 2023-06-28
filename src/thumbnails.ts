import { FileData } from './types/definitions';
import { Config } from 'ass-json';
import fs from 'fs-extra';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';
import aws from 'aws-sdk';
// @ts-ignore
import shell from 'any-shell-escape';
import { exec } from 'child_process';
import { isProd, path, log } from './utils';
const { s3enabled, s3endpoint, s3bucket, s3usePathStyle, s3accessKey, s3secretKey, diskFilePath, saveAsOriginal, saveWithDate, savePerDay, mediaStrict, maxUploadSize }: Config = fs.readJsonSync(path('config.json'));

const s3 = new aws.S3({
	s3ForcePathStyle: s3usePathStyle,
	endpoint: new aws.Endpoint(s3endpoint),
	credentials: new aws.Credentials({ accessKeyId: s3accessKey, secretAccessKey: s3secretKey })
});

// Thumbnail parameters
const THUMBNAIL = {
	QUALITY: 75,
	WIDTH: 200 * 2,
	HEIGHT: 140 * 2,
}

/**
 * Builds a safe escaped ffmpeg command
 */
function getCommand(src: String, dest: String) {
	return shell([
		ffmpeg, '-y',
		'-v', (isProd ? 'error' : 'debug'), // Log level
		'-i', src,                                                         // Input file
		'-ss', '00:00:01.000',                                             // Timestamp of frame to grab
		'-frames:v', '1',                                                  // Number of frames to grab
		'-s', `${THUMBNAIL.WIDTH}x${THUMBNAIL.HEIGHT}`,                    // Dimensions of output file
		dest                                                               // Output file
	]);
}

/**
 * Builds a thumbnail filename
 */
function getNewName(oldName: String) {
	return oldName.concat('.png');
}

/**
 * Builds a path to the thumbnails
 */
function getNewNamePath(oldName: String) {
	return path(diskFilePath, 'thumbnails/', getNewName(oldName));
}

/**
 * Extracts an image from a video file to use as a thumbnail, using ffmpeg
 */
function uploadToS3(filep: any, fileid: any) {
	new Promise((resolve, reject) => {
		const outputPath = getNewNamePath(fileid);
		const fileStream = fs.createReadStream(outputPath);
		// Upload to Amazon S3
		if (s3enabled) return s3.putObject({
			Bucket: s3bucket,
			Key: 'thumbnails/' + getNewName(fileid),
			ContentType: 'image/jpeg',
			Body: fileStream,
			ACL: 'public-read',
			StorageClass: 'STANDARD'
		}).promise().then(() => {
			// Delete the file at outputPath
			fs.unlink(outputPath, (error) => {
				if (error) {
					reject(error);
				} else {
					resolve;
				}
			});
		}).then(resolve).catch(reject);
	})
}

function getVideoThumbnail(file: FileData) {
	return new Promise((resolve: Function, reject: Function) => {
		exec(
			getCommand(file.path, getNewNamePath(file.randomId)),
			// @ts-ignore
			(err: Error) => (err ? reject(err) : resolve())
		);

		// Delay execution of the following code by 2 seconds
		setTimeout(() => {
			if (s3enabled) return uploadToS3(getNewNamePath(file.randomId), file.randomId);
		}, 2000); // the file needs 2000ms to save locally otherwise it will give file not found error
	});
}


/**
 * Generates a thumbnail for the provided image
 */
function getImageThumbnail(file: FileData) {
	return new Promise((resolve, reject) => {
		const sharpInstance = sharp(file.path)
			.resize(THUMBNAIL.WIDTH, THUMBNAIL.HEIGHT, { kernel: 'cubic' })
			.png({ quality: THUMBNAIL.QUALITY });

		if (s3enabled) {
			sharpInstance
				.toBuffer()
				.then((buffer) => {
					s3.putObject({
						Bucket: s3bucket,
						Key: 'thumbnails/' + getNewName(file.randomId),
						ACL: 'public-read',
						ContentType: 'image/png',
						Body: buffer,
						StorageClass: 'STANDARD'
					}).promise().then(resolve).catch(reject);
				})
				.catch(reject);
		} else {
			sharpInstance
				.toFile(getNewNamePath(file.randomId))
				.then(resolve)
				.catch(reject);
		}
	});
}

/**
 * Generates a thumbnail
 */
export default (file: FileData): Promise<string> =>
	new Promise((resolve, reject) =>
		(file.is.video ? getVideoThumbnail : (file.is.image && !file.mimetype.includes('webp')) ? getImageThumbnail : () => Promise.resolve())(file)
			.then(() => resolve((file.is.video || file.is.image) ? getNewName(file.randomId) : file.is.audio ? 'views/ass-audio-icon.png' : 'views/ass-file-icon.png'))
			.catch(reject));