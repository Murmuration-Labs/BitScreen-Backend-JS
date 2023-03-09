import { bitscreenGoogleClientId, rodeoGoogleClientId } from '../config';
import { OAuth2Client } from 'google-auth-library';
import { PlatformTypes } from '../types/common';

export const returnGoogleEmailFromTokenId = async (
  tokenId: string,
  desiredClientId: PlatformTypes
) => {
  const clientId =
    desiredClientId === PlatformTypes.BitScreen
      ? bitscreenGoogleClientId
      : rodeoGoogleClientId;

  const client = new OAuth2Client(
    clientId,
    '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',
    'postmessage'
  );
  const ticket = await client.getTokenInfo(tokenId);

  const user = ticket.email;

  return user || null;
};
