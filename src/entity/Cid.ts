import {
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { getCidHash } from '../service/crypto';
import { CidAnalysis } from './CidAnalysis';
import { Deal } from './Deal';
import { Filter } from './Filter';
import { Timestamps } from './Timestamps';

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

  @Column({
    nullable: true,
    type: 'jsonb',
  })
  belongsToFolders: string[];

  setCid(cid: string) {
    this.cid = cid;
    this.hashedCid = getCidHash(cid);
  }
}
