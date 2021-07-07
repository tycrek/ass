const ffmpeg = require('ffmpeg-static');
const Jimp = require('jimp');
const shell = require('any-shell-escape');
const { exec } = require('child_process');
const { path } = require('./utils');
const { diskFilePath } = require('./config.json');

// Thumbnail parameters
const THUMBNAIL = {
	QUALITY: 75,
	WIDTH: 200 * 2,
	HEIGHT: 140 * 2,
}

/**
 * Builds a safe escaped ffmpeg command
 * @param {String} src Path to the input file
 * @param {String} dest Path of the output file
 * @returns {String} The command to execute
 */
function getCommand(src, dest) {
	return shell([
		ffmpeg, '-y',
		'-v', (process.env.NODE_ENV === 'production' ? 'error' : 'debug'), // Log level
		'-i', src,                                                         // Input file
		'-ss', '00:00:01.000',                                             // Timestamp of frame to grab
		'-frames:v', '1',                                                  // Number of frames to grab
		'-s', `${THUMBNAIL.WIDTH}x${THUMBNAIL.HEIGHT}`,                    // Dimensions of output file
		dest                                                               // Output file
	]);
}

/**
 * Builds a thumbnail filename
 * @param {String} oldName The original filename
 * @returns {String} The filename for the thumbnail
 */
function getNewName(oldName) {
	return oldName.concat('.thumbnail.jpg');
}

/**
 * Builds a path to the thumbnails
 * @param {String} oldName The original filename
 * @returns {String} The path to the thumbnail
 */
function getNewNamePath(oldName) {
	return path(diskFilePath, 'thumbnails/', getNewName(oldName));
}

/**
 * Extracts an image from a video file to use as a thumbnail, using ffmpeg
 * @param {*} file The video file to pull a frame from
 */
function getVideoThumbnail(file) {
	return new Promise((resolve, reject) => exec(
		getCommand(file.path, getNewNamePath(file.originalname)),
		(err) => (err ? reject(err) : resolve())
	));
}

/**
 * Generates a thumbnail for the provided image
 * @param {*} file The file to generate a thumbnail for
 */
function getImageThumbnail(file) {
	return new Promise((resolve, reject) =>
		Jimp.read(file.path)
			.then((image) => image
				.quality(THUMBNAIL.QUALITY)
				.resize(THUMBNAIL.WIDTH, THUMBNAIL.HEIGHT, Jimp.RESIZE_BICUBIC)
				.write(getNewNamePath(file.originalname)))
			.then(resolve)
			.catch(reject));
}

/**
 * Generates a thumbnail
 * @param {*} file The file to generate a thumbnail for
 * @returns The thumbnail filename (NOT the path)
 */
module.exports = (file) =>
	new Promise((resolve, reject) =>
		(file.is.video ? getVideoThumbnail : file.is.image ? getImageThumbnail : () => Promise.resolve())(file)
			.then(() => resolve((file.is.video || file.is.image) ? getNewName(file.originalname) : 'views/ass-audio-icon.png'))
			.catch(reject));
