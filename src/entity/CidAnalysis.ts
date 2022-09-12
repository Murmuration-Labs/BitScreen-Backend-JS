import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Timestamps } from './Timestamps';
import { AnalysisService } from './enums';

@Entity()
export class CidAnalysis extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cid: string;

  @Column()
  service: AnalysisService;

  @Column()
  isOk: boolean;

  @Column({
    nullable: true,
  })
  downloadUrl: string;
}
