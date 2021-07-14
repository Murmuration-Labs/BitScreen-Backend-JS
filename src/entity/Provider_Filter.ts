import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
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

  @ManyToOne(() => Provider, (e) => e.id)
  provider: Provider;

  @ManyToOne(() => Filter, (e) => e.id)
  filter: Filter;

  @Column({ default: false })
  active: boolean;

  @Column({ nullable: true })
  notes: string;
}
