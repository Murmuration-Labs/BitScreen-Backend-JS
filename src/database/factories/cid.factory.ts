import { faker } from '@faker-js/faker';
import { define } from 'typeorm-seeding';
import { Cid } from '../../entity/Cid';
import { Visibility } from '../../entity/enums';
import { Filter } from '../../entity/Filter';
import { getRandomItem } from '../../service/util.service';
import { cids } from '../helpers/cids';

define(
  Cid,
  (
    fakerGenerator: typeof faker,
    context: {
      filter: Filter;
      filtersOfCurrentProvider: Array<{
        filter: Filter;
        cids: Array<string>;
      }>;
      refUrl?: string;
    }
  ) => {
    const { filter, refUrl, filtersOfCurrentProvider } = context;

    const filtersOfOppositeVisiblity = filtersOfCurrentProvider.filter((f) => {
      if (filter.visibility === Visibility.Exception) {
        return f.filter.visibility !== Visibility.Exception;
      } else {
        return f.filter.visibility === Visibility.Exception;
      }
    });

    let allCidsOfOppositeVisiblity: Array<string> = [];

    filtersOfOppositeVisiblity.forEach((filter) => {
      allCidsOfOppositeVisiblity.push(...filter.cids);
    });

    const allCidsNotInOppositeFilterTypes = cids.filter((cid) => {
      return !allCidsOfOppositeVisiblity.includes(cid);
    });

    const cid = new Cid();
    cid.created =
      Math.random() < 0.5 && filter.updated
        ? fakerGenerator.date.between(filter.created, new Date())
        : filter.created;
    cid.updated = null;
    let cidString = getRandomItem(allCidsNotInOppositeFilterTypes);
    cid.setCid(cidString);
    cid.refUrl = refUrl || '';
    cid.filter = filter;

    return cid;
  }
);
