import { Provider } from '../../entity/Provider';
import { define } from 'typeorm-seeding';
import { faker } from '@faker-js/faker';
import { Config } from '../../entity/Settings';

define(
  Config,
  (fakerGenerator: typeof faker, context: { provider: Provider }) => {
    const { provider } = context;

    const config = new Config();
    config.created = provider.updated;
    config.config = '{"bitscreen":true, "import":false, "share":false}';
    config.provider = provider;

    if (provider.country) {
      config.config = '{"bitscreen":true, "import":true, "share":false}';

      if (provider.contactPerson) {
        config.config = '{"bitscreen":true, "import":true, "share":true}';
      }
    }

    return config;
  }
);
