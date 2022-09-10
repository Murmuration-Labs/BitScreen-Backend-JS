import * as crypto from '../../src/service/crypto';

describe('Get address hash', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should return the hash of the address', async () => {
    const result = await crypto.getAddressHash('someString');

    expect(result).toBe(
      'd49b844ffe4d4f7947fb493c9f60d0d15bac9b8d5c4eae4c830f6754a8b2d7bc'
    );
  });
});

describe('Generate random hex', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should throw error on negative length', async () => {
    try {
      await crypto.generateRandomHex(-5);
    } catch (error) {
      expect(error.message).toBe(
        'The value of "size" is out of range. It must be >= 0 && <= 2147483647. Received -5'
      );
      return;
    }

    throw Error("Shouldn't reach this point.");
  });

  it('Should return a random hex with a default length of 2 (4 characters)', async () => {
    const result = await crypto.generateRandomHex();

    expect(result.length).toBe(4);
  });

  it('Should return a random hex with a custom length of 3 (6 characters)', async () => {
    const result = await crypto.generateRandomHex(3);

    expect(result.length).toBe(6);
  });
});

describe('Generate random token', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should return a random token with 4 bits (default)', async () => {
    jest
      .spyOn(crypto, 'generateRandomHex')
      .mockResolvedValueOnce('1234')
      .mockResolvedValueOnce('abcd')
      .mockResolvedValueOnce('keyk')
      .mockResolvedValueOnce('btsc');

    const result = await crypto.generateRandomToken();

    expect(crypto.generateRandomHex).toHaveBeenCalledTimes(4);

    expect(result).toBe('1234-abcd-keyk-btsc');
  });

  it('Should return a random token with 3 bits (custom)', async () => {
    jest
      .spyOn(crypto, 'generateRandomHex')
      .mockResolvedValueOnce('1234')
      .mockResolvedValueOnce('keyk')
      .mockResolvedValueOnce('btsc');

    const result = await crypto.generateRandomToken(3);

    expect(crypto.generateRandomHex).toHaveBeenCalledTimes(3);

    expect(result).toBe('1234-keyk-btsc');
  });
});
