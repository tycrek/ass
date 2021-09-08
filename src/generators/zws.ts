const lengthGen = require('./lengthGen');
const zeroWidthChars = ['\u200B', '\u200C', '\u200D', '\u2060'];
module.exports = ({ length }: { length: number }) => lengthGen(length, zeroWidthChars);
