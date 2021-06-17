// https://docs.digitalocean.com/products/spaces/resources/s3-sdk-examples/
// https://www.digitalocean.com/community/tutorials/how-to-upload-a-file-to-object-storage-with-node-js

const fs = require('fs-extra');
const aws = require('aws-sdk');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { diskFilePath, saveWithDate, s3endpoint, s3bucket, s3accessKey, s3secretKey } = require('./config.json');

const s3 = new aws.S3({
	endpoint: new aws.Endpoint(s3endpoint),
	credentials: new aws.Credentials({ accessKeyId: s3accessKey, secretAccessKey: s3secretKey })
});

const uploadS3 = multer({
	storage: multerS3({
		s3: s3,
		bucket: s3bucket,
		acl: 'public-read',
		key: (req, file, cb) => cb(null, req.randomId.concat(file.mimetype.includes('video') ? '.mp4' : file.mimetype.includes('gif') ? '.gif' : '')),
		contentType: (_req, file, cb) => cb(null, file.mimetype)
	})
}).single('file');

const uploadLocal = multer({
	storage: multer.diskStorage({
		destination: !saveWithDate ? diskFilePath : (_req, _file, cb) => {
			// Get current month and year
			let [month, _day, year] = new Date().toLocaleDateString("en-US").split("/");

			// Add 0 before single digit months eg ( 6 turns into 06)
			let folder = `${diskFilePath}/${year}-${("0" + month).slice(-2)}`;

			// Create folder if it doesn't exist
			fs.ensureDirSync(folder);

			cb(null, folder);
		}
	})
}).single('file');

module.exports = { uploadLocal, uploadS3 };

// This deletes everything from the Bucket
//s3.listObjects({ Bucket: s3bucket }, (err, data) => err ? console.error(err) : data['Contents'].forEach((obj) => s3.deleteObject({ Bucket: s3bucket, Key: obj['Key'] }, (err, data) => err ? console.log(err) : console.log(data))));
