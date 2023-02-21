import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Filter } from './Filter';
import { Timestamps } from './Timestamps';
import { Deal } from './Deal';
import { getAddressHash } from '../service/crypto';
import { CidAnalysis } from './CidAnalysis';

@Entity()
export class Cid extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  cid: string;

  @Column()
  hashedCid: string;

  @Column({
    nullable: true,
  })
  refUrl: string;

  @ManyToMany(() => Filter, (filter) => filter.cids)
  filters: Filter[];

  @OneToMany(() => Deal, (e) => e.cid)
  deals: Deal[];

  @OneToMany(() => CidAnalysis, (a) => a.cid)
  cidAnalysis?: CidAnalysis[];

  setCid(cid: string) {
    this.cid = cid;
    this.hashedCid = getAddressHash(cid);
  }
}
