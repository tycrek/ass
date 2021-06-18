// https://docs.digitalocean.com/products/spaces/resources/s3-sdk-examples/
// https://www.digitalocean.com/community/tutorials/how-to-upload-a-file-to-object-storage-with-node-js

const fs = require('fs-extra');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('tycrek-s3-transform');
const { getSafeExt } = require('./utils');
const { diskFilePath, saveWithDate, s3enabled, s3endpoint, s3bucket, s3accessKey, s3secretKey } = require('./config.json');

const s3 = new aws.S3({
	endpoint: new aws.Endpoint(s3endpoint),
	credentials: new aws.Credentials({ accessKeyId: s3accessKey, secretAccessKey: s3secretKey })
});

const uploadS3 = multer({
	storage: multerS3({
		s3,
		bucket: s3bucket,
		acl: 'public-read',
		key: (req, file, cb) => cb(null, req.randomId.concat(getSafeExt(file.mimetype))),
		contentType: (_req, file, cb) => cb(null, file.mimetype)
	})
}).single('file');

const deleteS3 = (file) =>
	new Promise((resolve, reject) =>
		s3.deleteObject({ Bucket: s3bucket, Key: file.randomId.concat(getSafeExt(file.mimetype)) }).promise().then(resolve).catch(reject));

const uploadLocal = multer({
	storage: multer.diskStorage({
		destination: !saveWithDate ? diskFilePath : (_req, _file, cb) => {
			// Get current month and year
			const [month, , year] = new Date().toLocaleDateString('en-US').split('/');

			// Add 0 before single digit months (6 turns into 06)
			const folder = `${diskFilePath}/${year}-${`0${month}`.slice(-2)}`; // skipcq: JS-0074

			// Create folder if it doesn't exist
			fs.ensureDirSync(folder);

			cb(null, folder);
		}
	})
}).single('file');

function listAllKeys(resolve, reject, token) {
	let allKeys = [];
	s3.listObjectsV2({ Bucket: s3bucket, ContinuationToken: token }).promise()
		.then((data) => (allKeys = allKeys.concat(data.Contents), data.IsTruncated ? listAllKeys(resolve, reject, data.NextContinuationToken) : resolve(allKeys.length))) // skipcq: JS-0086, JS-0090
		.catch(reject);
}

const bucketSize = () =>
	new Promise((resolve, reject) => (s3enabled ? listAllKeys(resolve, reject) : resolve(0)));

module.exports = { uploadLocal, uploadS3, deleteS3, bucketSize };
