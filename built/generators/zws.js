import { randomBytes } from 'crypto';
const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\u2060'];
export default (size) => [...randomBytes(size)].map(byte => zeroWidthChars[+byte % zeroWidthChars.length]).join('').slice(1) + zeroWidthChars[0];
