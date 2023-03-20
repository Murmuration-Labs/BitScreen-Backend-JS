import { define } from 'typeorm-seeding';
import { Filter } from '../../entity/Filter';
import { faker } from '@faker-js/faker';
import { Provider } from '../../entity/Provider';
import { Provider_Filter } from '../../entity/Provider_Filter';

define(
  Provider_Filter,
  (
    fakerGenerator: typeof faker,
    context: { provider: Provider; filter: Filter }
  ) => {
    const { provider, filter } = context;

    const providerFilter = new Provider_Filter();
    providerFilter.active = true;
    providerFilter.filter = filter;
    providerFilter.provider = provider;
    providerFilter.created = new Date();

    return providerFilter;
  }
);
