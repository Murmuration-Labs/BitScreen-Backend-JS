import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cid } from './Cid';
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
    nullable: true,
  })
  override: boolean;

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

  @OneToMany(() => Cid, (cid) => cid.filter)
  cids: Cid[];
}
