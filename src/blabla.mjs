import * as crypto from 'crypto';

const buffer = crypto.randomBytes(2);
console.log(buffer.toString('hex'));
