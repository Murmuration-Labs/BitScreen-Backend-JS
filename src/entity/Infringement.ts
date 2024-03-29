import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Timestamps } from './Timestamps';
import { Complaint } from './Complaint';

export enum FilteringStatus {
  'NotAvailable' = 0,
  'Filtering' = 1,
  'NotFiltering' = 2,
}

export interface NodeDeal {
  node: string;
  dealId: string;
  filtering?: FilteringStatus;
  country?: string;
}

export enum FileType {
  NotAvailable = 'N/A',
  Text = 'text',
  Image = 'image',
  Video = 'video',
  Other = 'other',
}

@Entity()
export class Infringement extends Timestamps {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column()
  value: string;

  @ManyToOne(() => Complaint, (complaint) => complaint.infringements)
  complaint: Complaint;

  @Column({
    nullable: true,
  })
  reason?: string;

  @Column({
    nullable: true,
  })
  fileType?: FileType;

  @Column()
  accepted: boolean;

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  hostedBy: NodeDeal[];

  @Column({
    nullable: true,
  })
  resync: boolean;
}
