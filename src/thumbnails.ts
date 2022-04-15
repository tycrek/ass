import { FileData } from './types/definitions';
import { Config } from 'ass-json';
import fs from 'fs-extra';
import ffmpeg from 'ffmpeg-static';
import sharp from 'sharp';

// @ts-ignore
import shell from 'any-shell-escape';
import { exec } from 'child_process';
import { isProd, path } from './utils';
const { diskFilePath }: Config = fs.readJsonSync(path('config.json'));

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
	return oldName.concat('.thumbnail.jpg');
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
function getVideoThumbnail(file: FileData) {
	return new Promise((resolve: Function, reject: Function) => exec(
		getCommand(file.path, getNewNamePath(file.randomId)),
		// @ts-ignore
		(err: Error) => (err ? reject(err) : resolve())
	));
}

/**
 * Generates a thumbnail for the provided image
 */
function getImageThumbnail(file: FileData) {
	return new Promise((resolve, reject) =>
		sharp(file.path)
			.resize(THUMBNAIL.WIDTH, THUMBNAIL.HEIGHT, { kernel: 'cubic' })
			.jpeg({ quality: THUMBNAIL.QUALITY })
			.toFile(getNewNamePath(file.randomId))
			.then(resolve)
			.catch(reject));
}

/**
 * Generates a thumbnail
 */
export default (file: FileData): Promise<string> =>
	new Promise((resolve, reject) =>
		(file.is.video ? getVideoThumbnail : (file.is.image && !file.mimetype.includes('webp')) ? getImageThumbnail : () => Promise.resolve())(file)
			.then(() => resolve((file.is.video || file.is.image) ? getNewName(file.randomId) : file.is.audio ? 'views/ass-audio-icon.png' : 'views/ass-file-icon.png'))
			.catch(reject));
