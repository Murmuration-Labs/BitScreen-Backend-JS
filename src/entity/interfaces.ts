import { ParsedQs } from 'qs';
import { Provider } from '../entity/Provider';
import { Provider_Filter } from '../entity/Provider_Filter';
import { Filter } from '../entity/Filter';
import { Visibility } from './enums';

export interface GetFiltersPagedProps {
  providerId: string;
  q: string | ParsedQs | string[] | ParsedQs[];
  sort: {
    [key: string]: string;
  };
  page: number;
  per_page: number;
  network?: NetworkType | null;
}

export interface FilterItem extends Filter {
  enabled: boolean;
  id: number;
  name: string;
  description: string;
  visibility: Visibility;
  shareId: string;
  provider: Provider;
  provider_Filters: Provider_Filter[];
  cidsCount: number;
  created: Date;
  updated: Date;
}

export enum NetworkType {
  IPFS = 'IPFS',
  Filecoin = 'Filecoin',
}
