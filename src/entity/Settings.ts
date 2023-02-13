import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Provider } from './Provider';
import { Timestamps } from './Timestamps';

export interface ConfigSettings {
  bitscreen: boolean;
  share: boolean;
  import: boolean;
}

@Entity()
export class Config extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Provider)
  @JoinColumn()
  provider: Provider;

  @Column({ type: 'text' })
  config: string;
}
