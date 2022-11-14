import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Cid } from './Cid'
import { Timestamps } from './Timestamps';
import { AnalysisService, AnalysisStatus } from './enums';

@Entity()
export class CidAnalysis extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Cid)
  @JoinColumn()
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
