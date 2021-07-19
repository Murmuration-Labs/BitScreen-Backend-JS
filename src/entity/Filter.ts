import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cid } from './Cid';
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
    nullable: true,
  })
  override: boolean;

  @Column({
    default: false,
  })
  enabled: boolean;

  @Column({
    nullable: true,
  })
  visibility: number;

  @Column({
    nullable: true,
    unique: true,
  })
  shareId: string;

  /**
   * This column is not null only when this filter was created as an "Import Filter" action.
   * Contains the shareId of the filter from which this was imported.
   */
  @Column({
    nullable: true,
  })
  originId: string;

  @ManyToOne(() => Provider, (e) => e.id)
  provider: Provider;

  @OneToMany(() => Provider_Filter, (e) => e.filter)
  provider_Filters: Provider_Filter[];

  @OneToMany(() => Cid, (cid) => cid.filter)
  cids: Cid[];
}
