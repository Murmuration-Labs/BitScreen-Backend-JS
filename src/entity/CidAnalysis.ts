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

  @ManyToOne(() => Cid, c => c.cidAnalysis)
  @JoinColumn({ name: 'cid_id' })
  cid: string;

  @Column()
  service: AnalysisService;

  @Column({
    nullable: true,
  })
  status: AnalysisStatus;

  @Column({
    nullable: true,
    name: 'status_message',
  })
  statusMessage?: string;

  @Column({
    nullable: true,
    name: 'is_ok',
  })
  isOk?: boolean;

  @Column({
    nullable: true,
    name: 'download_url',
  })
  downloadUrl?: string;
}
