import cryptoRandomString from 'crypto-random-string';
module.exports = ({ length }: { length: number }) => cryptoRandomString({ length, type: 'alphanumeric' });
