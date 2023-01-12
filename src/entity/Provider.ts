import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Deal } from './Deal';
import { Filter } from './Filter';
import { Provider_Filter } from './Provider_Filter';
import { Timestamps } from './Timestamps';

export enum LoginType {
  Wallet,
  Email,
}

@Entity()
export class Provider extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'login_email',
    nullable: true,
  })
  loginEmail: string;

  @Column({
    name: 'wallet_address_hashed',
    nullable: true,
  })
  walletAddressHashed: string;

  @Column({
    nullable: true,
  })
  nonce: string;

  @Column({
    nullable: true,
  })
  country: string;

  @Column({
    nullable: true,
  })
  businessName: string;

  @Column({
    nullable: true,
  })
  website: string;

  @Column({
    nullable: true,
  })
  email: string;

  @Column({
    nullable: true,
  })
  contactPerson: string;

  @Column({
    nullable: true,
  })
  address: string;

  @Column({
    nullable: true,
  })
  minerId: string;

  @Column({
    nullable: true,
  })
  consentDate: string;

  @Column({
    nullable: true,
  })
  guideShown: boolean;

  @OneToMany(() => Filter, (e) => e.provider)
  filters: Filter[];

  @OneToMany(() => Provider_Filter, (e) => e.provider)
  provider_Filters: Provider_Filter[];

  @OneToMany(() => Deal, (e) => e.provider)
  deals: Deal[];

  @Column({
    nullable: true,
  })
  lastUpdate: Date;

  @Column({
    nullable: true,
  })
  deletedAt: Date;
}
