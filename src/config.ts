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
