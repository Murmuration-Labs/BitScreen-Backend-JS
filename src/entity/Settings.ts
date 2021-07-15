import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamps } from './Timestamps';

@Entity()
export class Config extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  config: string;
}
