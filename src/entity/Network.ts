import { Column, Entity, ManyToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Complaint } from './Complaint';
import { Filter } from './Filter';
import { Timestamps } from './Timestamps';
import { NetworkType } from './interfaces';

export enum LoginType {
  Wallet,
  Email,
}

export enum AccountType {
  NodeOperator = 1,
  Assessor = 2,
}

@Entity()
export class Network extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
  })
  networkType: NetworkType;

  @ManyToMany(() => Filter, (filter) => filter.networks)
  filters: Filter[];

  @ManyToMany(() => Complaint, (complaint) => complaint.networks)
  complaints: Complaint[];
}
