// process.env.NODE_ENV is set in package.json when running nodemon
const environment = process.env.NODE_ENV;

export const serverUri = (): string => {
  switch (environment) {
    case 'development':
      return 'http://localhost:3030';
    case 'production':
      return 'https://bxn.mml-client.keyko.rocks/';
    default:
      return 'https://bxn.mml-client.keyko.rocks/';
  }
};

export const bitscreenGoogleClientId =
  '553067164447-7j2nls5qnt7pc1d2cti1vbfd33gjengl.apps.googleusercontent.com';

export const rodeoGoogleClientId =
  '835783680602-glvi9n18ikstgu0aeleajpsiakd1hqn6.apps.googleusercontent.com';
