// process.env.NODE_ENV is set in package.json when running nodemon
const environment = process.env.NODE_ENV;

export const serverUri = (): string => {
  switch (environment) {
    case 'development':
      return 'http://localhost:3030';
    case 'production':
      return 'https://bxn.keyko.rocks';
    default:
      return 'https://bxn.keyko.rocks';
  }
};

export const remoteMarketplaceUri = (): string => {
  switch (environment) {
    case 'development':
      return 'http://localhost:3030';
    case 'production':
      // here you can set another server for prod
      return 'https://bxn.keyko.rocks';
    default:
      return 'https://bxn.keyko.rocks';
  }
};
