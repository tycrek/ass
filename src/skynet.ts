import { FileData } from "./definitions";
import fs, { ReadStream } from 'fs-extra';
import { path } from './utils';
const { SkynetClient } = require('@skynetlabs/skynet-nodejs');

function getFullPath(fileData: FileData) {
	return path('share', '.skynet', `${fileData.randomId}${fileData.ext}`.replace(/sia\:\/\//gi, ''));
}

// Create the SkyNet client
export const Skynet = new SkynetClient();

export function SkynetUpload(path: string): Promise<string> {
	return new Promise(async (resolve, reject) => {
		try {
			const skylink = await Skynet.uploadFile(path);
			resolve(skylink);
		} catch (error) {
			reject(error);
		}
	});
}

export function SkynetDownload(fileData: FileData): Promise<ReadStream> {
	return new Promise((resolve: Function, reject) =>
		fs.ensureDir(path('share', '.skynet'))
			.then(async () => {
				await Skynet.downloadFile(getFullPath(fileData), fileData.randomId);
				return fs.createReadStream(getFullPath(fileData))
			})
			.then((stream) => resolve(stream))
			.catch(reject));
}

export function SkynetDelete(fileData: FileData) {
	return fs.remove(getFullPath(fileData));
}
