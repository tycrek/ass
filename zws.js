const { randomBytes } = require('crypto');
const zeroWidthCap = '\u200B';
const zeroWidthChars = [
	zeroWidthCap,
	'\u200C',
	'\u200D',
	'\u2060',
	'\u180E'
];

module.exports = (size) => [...randomBytes(size)].map(byte => zeroWidthChars[+byte % zeroWidthChars.length]).join('').slice(1) + zeroWidthCap;
