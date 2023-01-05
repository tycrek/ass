import { nanoid } from 'nanoid';
export default ({ length }: { length?: number }) => nanoid(length);
