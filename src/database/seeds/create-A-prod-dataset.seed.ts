import { Factory, Seeder } from 'typeorm-seeding';
import { Filter } from '../../entity/Filter';
import { Network } from '../../entity/Network';
import { Provider } from '../../entity/Provider';
import { Provider_Filter } from '../../entity/Provider_Filter';
import { Config } from '../../entity/Settings';
import { Visibility } from '../../entity/enums';
import { NetworkType } from '../../entity/interfaces';
import { getAllNetworks } from '../../service/network.service';

export default class CreateProdDataSet implements Seeder {
  public async run(factory: Factory): Promise<any> {
    const wallet = '0x058B7Db751733178FE08721E558825c33f9ff29B';

    const provider = await factory(Provider)({
      wallet,
      isProdDataset: true,
    }).create();

    factory(Config)({
      provider,
    }).create();

    const networks = await getAllNetworks();

    const badBitsFilterList = await factory(Filter)({
      networks,
      provider,
      isProdDataset: true,
      name: 'Bad Bits Denylist',
      visibility: Visibility.Public,
      enabled: true,
      description:
        'CIDs reported via IPFS as copyright infringement, malware, etc. Imported from https://badbits.dwebops.pub/, maintained by Protocol Labs',
    }).create();

    const saferFilterList = await factory(Filter)({
      networks,
      provider,
      isProdDataset: true,
      name: 'Safer',
      visibility: Visibility.Public,
      enabled: true,
      description: 'CSAM filtering from https://safer.io/',
    }).create();

    await factory(Provider_Filter)({
      provider,
      filter: badBitsFilterList,
    }).create();

    await factory(Provider_Filter)({
      provider,
      filter: saferFilterList,
    }).create();

    const networkTypeValues = Object.keys(NetworkType);
    for (let i = 0; i < networkTypeValues.length; i++) {
      await factory(Network)({
        networkType: networkTypeValues[i],
      }).create();
    }
  }
}
