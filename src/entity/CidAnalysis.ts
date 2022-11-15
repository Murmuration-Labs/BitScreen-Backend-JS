import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Timestamps } from './Timestamps';
import { AnalysisService, AnalysisStatus } from './enums';

@Entity()
export class CidAnalysis extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  cid: string;

  @Column()
  service: AnalysisService;

  @Column()
  status: AnalysisStatus;

  @Column()
  statusMessage: string;

  @Column()
  isOk: boolean;

  @Column({
    nullable: true,
  })
  downloadUrl: string;
}
