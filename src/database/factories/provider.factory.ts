import { Provider } from '../../entity/Provider';
import { define } from 'typeorm-seeding';
import { faker } from '@faker-js/faker';
import { v4 } from 'uuid';
import { getAddressHash } from '../../service/crypto';
import { getDatesInterval, getRandomItem } from '../../service/util.service';
import countryList from 'react-select-country-list';

define(
  Provider,
  (
    fakerGenerator: typeof faker,
    context: {
      wallet?: string;
      email?: string;
      previousProviderCreatedDate?: Date;
      fromDateInIteration: Date;
      toDateInIteration: Date;
      isLastIteration: boolean;
      iterationStepInDays: number;
      numberOfCreatedProvidersPerIteration: number;
    }
  ) => {
    const {
      wallet,
      email,
      previousProviderCreatedDate,
      isLastIteration,
      numberOfCreatedProvidersPerIteration,
    } = context;
    let { fromDateInIteration, toDateInIteration } = context;

    if (!fromDateInIteration) {
      var { fromDate: fromDateIfNotGiven, toDate: toDateIfNotGiven } =
        getDatesInterval(21, 6);
    }

    if (isLastIteration) {
      const minimumNumberOfDaysNeeded =
        3 * numberOfCreatedProvidersPerIteration;

      toDateInIteration = new Date(
        new Date().valueOf() - minimumNumberOfDaysNeeded * 24 * 60 * 60 * 1000
      );
      if (toDateInIteration.valueOf() < fromDateInIteration.valueOf()) {
        fromDateInIteration = new Date(toDateInIteration.valueOf() - 1000);
      }
    }

    let newToDate: Date;

    if (previousProviderCreatedDate) {
      newToDate = new Date(
        previousProviderCreatedDate.valueOf() +
          Math.random() * 3 * 24 * 60 * 60 * 1000
      );
    }

    const created = fakerGenerator.date.between(
      previousProviderCreatedDate || fromDateInIteration || fromDateIfNotGiven,
      newToDate || toDateInIteration || toDateIfNotGiven
    );

    const configDate = new Date(created.valueOf() + 5000);
    const consentDate = new Date(created.valueOf() + 10000).toISOString();

    const nonce = v4();

    const provider = new Provider();
    provider.created = created;
    provider.updated = configDate;
    provider.consentDate = consentDate;
    provider.nonce = nonce;
    provider.guideShown = true;

    if (wallet || email || Math.random() < 0.8) {
      const countries = countryList().getValues();

      const contactPersonFirstName = fakerGenerator.name.firstName();
      const contactPersonLastName = fakerGenerator.name.lastName();
      const domainName = fakerGenerator.internet.domainName();
      provider.address =
        fakerGenerator.address.streetAddress() +
        ', ' +
        fakerGenerator.address.city() +
        ', ' +
        fakerGenerator.address.country();
      provider.website = 'https://' + domainName;
      provider.email =
        email ||
        fakerGenerator.internet.email(
          contactPersonFirstName,
          contactPersonLastName,
          domainName
        );
      provider.businessName = fakerGenerator.company.companyName();
      provider.contactPerson =
        contactPersonFirstName + ' ' + contactPersonLastName;
      provider.country = getRandomItem(countries);
    }

    if (wallet) {
      provider.walletAddressHashed = getAddressHash(
        wallet ||
          '0x' + fakerGenerator.random.alphaNumeric(40, { casing: 'mixed' })
      );
    }

    if (email) {
      provider.loginEmail = email;
    }

    return provider;
  }
);
