import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Filter } from './Filter';
import { Provider_Filter } from './Provider_Filter';
import { Timestamps } from './Timestamps';

@Entity()
export class Provider extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  walletAddressHashed: string;

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
  nonce: string;

  @OneToMany(() => Filter, (e) => e.provider)
  filters: Filter[];

  @OneToMany(() => Provider_Filter, (e) => e.provider)
  provider_Filters: Provider_Filter[];
}
