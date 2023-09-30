const { HTTP, HTTPS } = require('../MagicNumbers.json');

export function getTrueHttp() {
	return ('http').concat(useSsl ? 's' : '').concat('://');
}

export function getTrueDomain(d = domain) {
	return d.concat((port === HTTP || port === HTTPS || isProxied) ? '' : `:${port}`);
}

export function getS3url(s3key: string, ext: string) {
	return `https://${s3usePathStyle ? `${s3endpoint}/${s3bucket}` : `${s3bucket}.${s3endpoint}`}/${s3key}${ext}`;
}

export function getDirectUrl(resourceId: string) {
	return `${getTrueHttp()}${getTrueDomain()}/${resourceId}/direct`;
}

export function getResourceColor(colorValue: string, vibrantValue: string) {
	return (!colorValue || colorValue === '&vibrant') ? vibrantValue : colorValue === '&random' ? randomHexColour() : colorValue;
}

export function replaceholder(data: string, size: number, timestamp: number, timeoffset: string, originalname: string) {
	return data
		.replace(/&size/g, formatBytes(size))
		.replace(/&filename/g, originalname)
		.replace(/&timestamp/g, formatTimestamp(timestamp, timeoffset));
}
