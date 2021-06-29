// https://docs.digitalocean.com/products/spaces/resources/s3-sdk-examples/
// https://www.digitalocean.com/community/tutorials/how-to-upload-a-file-to-object-storage-with-node-js

const fs = require('fs-extra');
const aws = require('aws-sdk');
const multer = require('multer');
const Thumbnail = require('./thumbnails');
const Vibrant = require('./vibrant');
const Hash = require('./hash');
const { getSafeExt, getDatedDirname, sanitize, generateId } = require('./utils');
const { s3enabled, s3endpoint, s3bucket, s3accessKey, s3secretKey, saveAsOriginal } = require('./config.json');

const s3 = new aws.S3({
	endpoint: new aws.Endpoint(s3endpoint),
	credentials: new aws.Credentials({ accessKeyId: s3accessKey, secretAccessKey: s3secretKey })
});

function saveFile(req) {
	return new Promise((resolve, reject) =>
		fs.ensureDir(getDatedDirname())
			.then(() => fs.createWriteStream(req.file.path.concat('.temp')))
			.then((stream) => req.file.stream.pipe(stream).on('finish', resolve).on('error', reject))
			.catch(reject));
}

function getLocalFilename(req) {
	return `${getDatedDirname()}/${saveAsOriginal ? req.file.originalname : req.file.sha1}`;
}

function processUploaded(req, _, next) {
	// Fixes
	req.file.mimetype = req.file.detectedMimeType;
	req.file.originalname = sanitize(req.file.originalName);
	req.file.randomId = generateId('random', 32, null, null);
	req.file.deleteId = generateId('random', 32, null, null);

	// Remove unwanted fields
	delete req.file.fieldName;
	delete req.file.originalName;
	delete req.file.clientReportedMimeType;
	delete req.file.clientReportedFileExtension;
	delete req.file.detectedMimeType;
	delete req.file.detectedFileExtension;

	// Operations
	saveFile(req)
		.then(() => req.file.path = req.file.path.concat('.temp'))
		.then(() => Promise.all([Thumbnail(req.file), Vibrant(req.file), Hash(req.file)]))
		.then(([thumbnail, vibrant, sha1]) => (
			req.file.thumbnail = thumbnail, // skipcq: JS-0090
			req.file.vibrant = vibrant, // skipcq: JS-0090
			req.file.sha1 = sha1 // skipcq: JS-0090
		))

		.then(() =>
			new Promise((resolve, reject) => s3enabled

				// Upload to Amazon S3
				? s3.putObject({
					Bucket: s3bucket,
					Key: req.file.randomId.concat(getSafeExt(req.file.mimetype)),
					ACL: 'public-read',
					ContentType: req.file.mimetype,
					Body: fs.createReadStream(req.file.path)
				}).promise().then(resolve).catch(reject)

				// Save to local storage
				: fs.ensureDir(getDatedDirname())
					.then(() => fs.copy(req.file.path, getLocalFilename(req), { preserveTimestamps: true }))
					.then(resolve)
					.catch(reject)
			))
		.then(() => fs.remove(req.file.path))
		.then(() => !s3enabled && (req.file.path = getLocalFilename(req))) // skipcq: JS-0090
		.then(() => delete req.file.stream)
		.then(() => next())
		.catch(next);
}

function deleteS3(file) {
	return new Promise((resolve, reject) => s3
		.deleteObject({ Bucket: s3bucket, Key: file.randomId.concat(getSafeExt(file.mimetype)) })
		.promise()
		.then(resolve)
		.catch(reject));
}

function bucketSize() {
	return new Promise((resolve, reject) => (s3enabled ? listAllKeys(resolve, reject) : resolve(0)));
}

function listAllKeys(resolve, reject, token) {
	let allKeys = [];
	s3.listObjectsV2({ Bucket: s3bucket, ContinuationToken: token }).promise()
		.then((data) => (allKeys = allKeys.concat(data.Contents), data.IsTruncated ? listAllKeys(resolve, reject, data.NextContinuationToken) : resolve(allKeys.length))) // skipcq: JS-0086, JS-0090
		.catch(reject);
}

module.exports = {
	doUpload: multer({ limits: { fileSize: '100MB' } }).single('file'),
	processUploaded,
	deleteS3,
	bucketSize
};
