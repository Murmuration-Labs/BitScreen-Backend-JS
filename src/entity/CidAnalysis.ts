import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Timestamps } from './Timestamps';
import { AnalysisService, AnalysisStatus } from './enums';
import { Cid } from './Cid'

@Entity()
export class CidAnalysis extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Cid)
  @JoinColumn()
  cid: string;

  @Column()
  service: AnalysisService;

  @Column({
    nullable: true,
  })
  status: AnalysisStatus;

  @Column({
    nullable: true,
  })
  statusMessage?: string;

  @Column({
    nullable: true,
  })
  isOk?: boolean;

  @Column({
    nullable: true,
  })
  downloadUrl: string;
}
