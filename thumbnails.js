const ffmpeg = require('ffmpeg-static');
const Jimp = require('jimp');
const shell = require('any-shell-escape');
const { exec } = require('child_process');
const { path } = require('./utils');

const THUMBNAIL_QUALITY = 50;
const THUMBNAIL_SIZE = 512;

function getCommand(src, dest) {
	return shell([
		ffmpeg, '-y', '-v', process.env.NODE_ENV == 'production' ? 'error' : 'debug',
		'-i', src,
		'-ss', '00:00:01.000',
		'-frames:v', '1',
		'-s', `${THUMBNAIL_SIZE}x${THUMBNAIL_SIZE}`,
		dest
	]);
}

function getVideoThumbnail(file) {
	return new Promise((resolve, reject) => exec(getCommand(path(file.path), getNewNamePath(file.originalname)), (err) => err ? reject(err) : resolve()));
}

function getResizedThumbnail(file) {
	return new Promise((resolve, reject) =>
		Jimp.read(path(file.path))
			.then((image) => image
				.quality(THUMBNAIL_QUALITY)
				.resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, Jimp.RESIZE_BICUBIC)
				.write(getNewNamePath(file.originalname)))
			.then(resolve)
			.catch(reject));
}

function getNewNamePath(oldName) {
	return path('uploads/thumbnails/', getNewName(oldName));
}

function getNewName(oldName) {
	return oldName.concat('.thumbnail.jpg');
}

module.exports = (file) =>
	new Promise((resolve, reject) =>
		(file.mimetype.includes('video') ? getVideoThumbnail : getResizedThumbnail)(file)
			.then(() => resolve(getNewName(file.originalname)))
			.catch(reject));
