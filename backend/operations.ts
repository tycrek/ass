import fs from 'fs-extra';
import sharp from 'sharp';
import Vibrant from 'node-vibrant';
import ffmpeg from 'ffmpeg-static';
import { exec } from 'child_process';
import { isProd } from '@tycrek/joint';
import { removeLocation } from '@xoi/gps-metadata-remover';

//@ts-ignore
import shell from 'any-shell-escape';

type SrcDest = { src: string, dest: string };

/**
 * Strips GPS EXIF data from a file
 */
export const removeGPS = (file: string): Promise<boolean> => new Promise((resolve, reject) =>
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

const VIBRANT = { COLOURS: 256, QUALITY: 3 };
export const vibrant = (file: string, mimetype: string): Promise<string> => new Promise((resolve, reject) =>
	// todo: random hex colour
	mimetype.includes('video') || mimetype.includes('webp') ? `#335599`
		: sharp(file).png().toBuffer()
			.then((data) => Vibrant.from(data)
				.maxColorCount(VIBRANT.COLOURS)
				.quality(VIBRANT.QUALITY)
				.getPalette())
			.then((palettes) => resolve(palettes[Object.keys(palettes).sort((a, b) => palettes[b]!.population - palettes[a]!.population)[0]]!.hex))
			.catch((err) => reject(err)));

/**
 * Thumbnail operations
 */
export class Thumbnail {

	private static readonly THUMBNAIL = {
		QUALITY: 75,
		WIDTH: 200 * 2,
		HEIGHT: 140 * 2,
	}

	private static getImageThumbnail({ src, dest }: SrcDest) {
		return new Promise((resolve, reject) =>
			sharp(src)
				.resize(this.THUMBNAIL.WIDTH, this.THUMBNAIL.HEIGHT, { kernel: 'cubic' })
				.jpeg({ quality: this.THUMBNAIL.QUALITY })
				.toFile(dest)
				.then(resolve)
				.catch(reject));
	}

	private static getVideoThumbnail({ src, dest }: SrcDest) {
		exec(this.getCommand({ src, dest }));
	}

	private static getCommand({ src, dest }: SrcDest) {
		return shell([
			ffmpeg, '-y',
			'-v', (isProd() ? 'error' : 'debug'), // Log level
			'-i', src,                                                         // Input file
			'-ss', '00:00:01.000',                                             // Timestamp of frame to grab
			'-vf', `scale=${this.THUMBNAIL.WIDTH}:${this.THUMBNAIL.HEIGHT}:force_original_aspect_ratio=increase,crop=${this.THUMBNAIL.WIDTH}:${this.THUMBNAIL.HEIGHT}`, // Dimensions of output file
			'-frames:v', '1',                                                  // Number of frames to grab
			dest                                                               // Output file
		]);
	}

	// old default
	/*
export default (file: FileData): Promise<string> =>
	new Promise((resolve, reject) =>
		(file.is.video ? getVideoThumbnail : (file.is.image && !file.mimetype.includes('webp')) ? getImageThumbnail : () => Promise.resolve())(file)
			.then(() => resolve((file.is.video || file.is.image) ? getNewName(file.randomId) : file.is.audio ? 'views/ass-audio-icon.png' : 'views/ass-file-icon.png'))
			.catch(reject));

	*/
}
