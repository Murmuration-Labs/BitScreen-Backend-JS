import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Filter } from './Filter';
import { Provider } from './Provider';
import { Timestamps } from './Timestamps';

@Entity()
export class Provider_Filter extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Provider, (e) => e.id)
  @JoinColumn()
  provider: Provider;

  @OneToOne(() => Filter, (e) => e.id)
  @JoinColumn()
  filter: Filter;

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
}
