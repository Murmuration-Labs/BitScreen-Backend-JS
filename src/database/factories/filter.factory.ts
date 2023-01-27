import { define } from 'typeorm-seeding';
import { faker } from '@faker-js/faker';
import { Filter } from '../../entity/Filter';
import { Visibility } from '../../entity/enums';
import { generateRandomToken } from '../../service/crypto';
import { Provider } from '../../entity/Provider';

define(
  Filter,
  (
    fakerGenerator: typeof faker,
    context: {
      provider: Provider;
      visibility?: Visibility;
      name?: string;
      description?: string;
    }
  ) => {
    const { provider, visibility, name, description } = context;

    const filter = new Filter();
    filter.created = fakerGenerator.date.between(provider.created, new Date());
    if (Math.random() < 0.5) {
      filter.updated = fakerGenerator.date.between(filter.created, new Date());
    }
    filter.shareId = generateRandomToken(4);
    filter.name = name || fakerGenerator.random.words();
    filter.description = description || fakerGenerator.random.words(10);
    filter.visibility =
      visibility || Math.floor(Math.random() * (Object.keys(Visibility).length - 1) / 2);
    filter.provider = provider;
    filter.enabled = Math.random() < 0.1;

    return filter;
  }
);
