/**
 * This strips GPS EXIF data from files
 */

import { removeLocation } from '@xoi/gps-metadata-remover';
import fs from 'fs-extra';

/**
 * This strips GPS EXIF data from files using the @xoi/gps-metadata-remover package
 * @returns A Promise that resolves to `true` if GPS data was removed, `false` if not
 */
export const removeGPS = (file: string): Promise<boolean> => {
	return new Promise((resolve, reject) =>
		fs.open(file, 'r+')
			.then((fd) => removeLocation(file,
				// Read function
				(size: number, offset: number): Promise<Buffer> =>
					fs.read(fd, Buffer.alloc(size), 0, size, offset)
						.then(({ buffer }) => Promise.resolve(buffer)),
				// Write function
				(val: string, offset: number, enc: BufferEncoding): Promise<void> =>
					fs.write(fd, Buffer.alloc(val.length, val, enc), 0, val.length, offset)
						.then(() => Promise.resolve())))
			.then(resolve)
			.catch(reject));
}
