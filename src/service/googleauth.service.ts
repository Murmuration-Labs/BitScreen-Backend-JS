import { bitscreenGoogleClientId, rodeoGoogleClientId } from '../config';
import { OAuth2Client } from 'google-auth-library';
import { PlatformTypes } from '../types/generic';

export const returnGoogleEmailFromTokenId = async (
  tokenId: string,
  desiredClientId: PlatformTypes
) => {
  const clientId =
    desiredClientId === PlatformTypes.BitScreen
      ? bitscreenGoogleClientId
      : rodeoGoogleClientId;

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: tokenId,
    audience: clientId,
  });

  const user = ticket.getPayload();
  const { email } = user;

  return email;
};
