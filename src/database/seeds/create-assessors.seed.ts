import { Factory, Seeder } from 'typeorm-seeding';
import { Provider } from '../../entity/Provider';
import { Assessor } from '../../entity/Assessor';
import { Config } from '../../entity/Settings';

export default class CreateAssessors implements Seeder {
  public async run(factory: Factory): Promise<any> {
    const wallets = [
      '0x9e18Eb11B0a8b6fa764bbA5bDD6894ab906FB01d',
      '0xfc9a4a78260b514a3de6337Dd8e45292769Cdf5a',
      '0xc9827E9587A6FA94454f54AE9180B15130FAE929',
      '0x5D342f52DC21169338509bc1Fe5910844070d09d',
      '0x0D563437aB53CE3Bd927BB54534865d7b90c75C1',
    ];

    const providerPromises = wallets.map((wallet) =>
      factory(Provider)({
        wallet,
      }).create()
    );

    const providers = await Promise.all(providerPromises);

    const assessorPromises = providers.map((provider) =>
      factory(Assessor)({
        provider,
      }).create()
    );

    await Promise.all(assessorPromises);

    const configPromises = providers.map((provider) =>
      factory(Config)({
        provider,
      }).create()
    );

    await Promise.all(configPromises);
  }
}
