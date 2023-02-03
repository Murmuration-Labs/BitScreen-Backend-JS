import {
  Column,
  Entity,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Assessor } from './Assessor';
import { Filter } from './Filter';
import { Infringement } from './Infringement';
import { Timestamps } from './Timestamps';

export enum ComplainantType {
  None,
  Individual,
  Organization,
  Government,
}

export enum OnBehalfOf {
  None,
  Self,
  OtherParty,
}

export enum ComplaintType {
  Copyright = 1,
  Inappropriate = 2,
  Other = 3,
}

export enum ComplaintStatus {
  'New',
  'UnderReview',
  'Resolved',
  'Spam',
}

@Entity()
export class Complaint extends Timestamps {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column()
  fullName: string;

  @Column()
  email: string;

  @Column({ enum: ComplainantType })
  complainantType: ComplainantType;

  @Column({ enum: OnBehalfOf })
  onBehalfOf: OnBehalfOf;

  @Column()
  city?: string;

  @Column()
  state?: string;

  @Column()
  country?: string;

  @Column({ enum: ComplaintType })
  type: ComplaintType;

  @Column({ enum: ComplaintStatus })
  status: ComplaintStatus;

  @Column({
    nullable: true,
  })
  complaintDescription: string;

  @Column({
    type: 'jsonb',
    array: false,
    default: () => "'[]'",
    nullable: false,
  })
  redactedAreas: Array<{
    rangeStart: number;
    rangeEnd: number;
  }>;

  @Column({
    nullable: true,
  })
  title: string;

  @Column({
    type: 'jsonb',
  })
  geoScope: string[];

  @OneToMany(() => Infringement, (e) => e.complaint)
  infringements: Infringement[];

  @Column({
    nullable: true,
  })
  companyName?: string;

  @Column({
    nullable: true,
  })
  address?: string;

  @Column({
    nullable: true,
  })
  phoneNumber?: string;

  @Column({
    nullable: true,
  })
  workDescription?: string;

  @Column({
    nullable: true,
  })
  agreement?: boolean;

  @Column({
    nullable: true,
  })
  privateNote?: string;

  @Column({
    nullable: true,
  })
  submitted: boolean;

  @Column({
    nullable: true,
  })
  submittedOn: Date;

  @Column({
    nullable: true,
  })
  resolvedOn: Date;

  @Column({
    nullable: true,
  })
  isSpam: boolean;

  @ManyToMany(() => Filter, (filter) => filter.complaints)
  filterLists: Filter[];

  @Column({
    type: 'jsonb',
    nullable: true,
  })
  filterListTimestamps: { listId: number; timestamp: Date }[];

  @ManyToOne(() => Assessor, (e) => e.complaints)
  assessor: Assessor;
}
