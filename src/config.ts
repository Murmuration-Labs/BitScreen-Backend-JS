// process.env.NODE_ENV is set in package.json when running nodemon
const environment = process.env.NODE_ENV;

// Needs to be put inside some sort of .env file
export const JWT_SECRET = '5L@NWcoJ@Vau3dI@y@ICMhd8z?uD2wbF!8bn0hFB';

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
