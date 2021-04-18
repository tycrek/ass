import cryptoRandomString from 'crypto-random-string';
export default (length) => cryptoRandomString({ length, type: 'alphanumeric' });
