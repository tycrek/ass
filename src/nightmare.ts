/**
 * This strips GPS EXIF data from files
 */

import { removeLocation } from '@xoi/gps-metadata-remover';
import fs from 'fs-extra';

export const removeGPS = (file: string): Promise<boolean> => {
	return new Promise((resolve, reject) =>
		fs.open(file, 'r+')
			.then((fd) => removeLocation(file,
				// Read function
				(size: number, offset: number): Promise<Buffer> =>
					fs.read(fd, Buffer.alloc(size), 0, size, offset)
						.then(({ buffer }) => Promise.resolve(buffer)),
				// Write function
				(val: string, offset: number, enc: any): Promise<void> =>
					fs.write(fd, Buffer.alloc(val.length, val, enc), 0, val.length, offset)
						.then(() => Promise.resolve())))
			.then(resolve)
			.catch(reject));
}
