import { Provider } from '../../entity/Provider';
import { define } from 'typeorm-seeding';
import { faker } from '@faker-js/faker';
import { v4 } from 'uuid';
import { Assessor } from '../../entity/Assessor';

define(
  Assessor,
  (fakerGenerator: typeof faker, context: { provider: Provider }) => {
    const { provider } = context;

    const nonce = v4();

    const assessor = new Assessor();

    const assessorCreationDateStep = new Date(
      provider.created.valueOf() +
        Math.ceil(Math.random() * 2) *
          Math.ceil(Math.random() * 24) *
          Math.ceil(Math.random() * 60) *
          Math.ceil(Math.random() * 60) *
          1000
    );
    let assessorToDate: Date;
    if (assessorCreationDateStep.valueOf() > new Date().valueOf()) {
      assessorToDate = new Date();
    } else {
      assessorToDate = assessorCreationDateStep;
    }
    assessor.created =
      Math.random() < 0.4
        ? provider.created
        : fakerGenerator.date.between(provider.created, assessorToDate);

    assessor.rodeoConsentDate = new Date(
      new Date(assessor.created).valueOf() + 5000
    ).toISOString();
    assessor.updated = new Date(assessor.rodeoConsentDate);
    assessor.nonce = nonce;
    assessor.provider = provider;

    if (provider.walletAddressHashed) {
      assessor.walletAddressHashed = provider.walletAddressHashed;
    }

    if (provider.loginEmail) {
      assessor.loginEmail = provider.loginEmail;
    }

    return assessor;
  }
);
