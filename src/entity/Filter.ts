import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cid } from './Cid';
import { Complaint } from './Complaint';
import { Visibility } from './enums';
import { Provider } from './Provider';
import { Provider_Filter } from './Provider_Filter';
import { Timestamps } from './Timestamps';

@Entity()
export class Filter extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    nullable: true,
  })
  description: string;

  @Column({
    default: false,
  })
  enabled: boolean;

  @Column({
    default: Visibility.Private,
  })
  visibility: Visibility;

  @Column({
    nullable: true,
    unique: true,
  })
  shareId: string;

  @ManyToOne(() => Provider, (e) => e.id)
  provider: Provider;

  @OneToMany(() => Provider_Filter, (e) => e.filter)
  provider_Filters: Provider_Filter[];

  @ManyToMany(() => Cid, (cid) => cid.filter)
  @JoinTable()
  cids: Cid[];

  @ManyToMany(() => Complaint, (complaint) => complaint.filterLists)
  @JoinTable()
  complaints: Complaint[];

  // ONLY USE THIS IF YOU ADDED THE PROVIDER RELATION FOR PROVIDER_FILTERS
  isOrphan(): boolean {
    for (let providerFilter of this.provider_Filters) {
      if (
        providerFilter.provider &&
        providerFilter.provider.id === this.provider.id
      ) {
        return false;
      }
    }

    return true;
  }
}
