import cryptoRandomString from 'crypto-random-string';
export default (length: number): string => cryptoRandomString({ length, type: 'alphanumeric' });
