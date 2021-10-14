import cryptoRandomString from 'crypto-random-string';
export default ({ length }: { length: number }) => cryptoRandomString({ length, type: 'alphanumeric' });
