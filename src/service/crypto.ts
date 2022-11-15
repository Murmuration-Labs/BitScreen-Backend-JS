import * as crypto from 'crypto';
import keccak from 'keccak';

export const getAddressHash = (input: string): string => {
  return `${keccak('keccak256').update(input.toLowerCase()).digest('hex')}`;
};

export const generateRandomHex = (length = 2) => {
  const buffer = crypto.randomBytes(length);

  return buffer.toString('hex');
};

export const generateRandomToken = (bits = 4) => {
  const pieces: string[] = [];

  for (let i = 0; i < bits; i++) {
    const piece = generateRandomHex();
    pieces.push(piece);
  }

  return pieces.join('-');
};
