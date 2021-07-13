import * as crypto from "crypto";
import keccak256 from "keccak256";

export const getAddressHash = (input: string): string =>
    `0x${keccak256(input).toString("hex")}`;

export const generateRandomHex = async (length = 2) =>
    new Promise<string>((resolve, reject) => {
        crypto.randomBytes(length, (err: Error | null, buffer: Buffer) => {
            if (err) {
                reject(err);
                return;
            }

            resolve(buffer.toString("hex"));
        });
    });

export const generateRandomToken = async (bits = 4) => {
    const pieces: string[] = [];

    for (let i = 0; i < bits; i++) {
        const piece = await generateRandomHex();
        pieces.push(piece);
    }

    return pieces.join("-");
};
