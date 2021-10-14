import lengthGen from './lengthGen';
const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\u2060'];
export default ({ length }: { length: number }) => lengthGen(length, zeroWidthChars);
