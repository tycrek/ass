import cryptoRandomString from 'crypto-random-string';
export const random = ({ length }: { length: number }) => cryptoRandomString({ length, type: 'alphanumeric' });
