import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Timestamps} from "./Timestamps";
import {Complaint} from "./Complaint";

@Entity()
export class Infringement extends Timestamps {
  @PrimaryGeneratedColumn()
  _id: number;

  @Column()
  value: string;

  @ManyToOne(() => Complaint, complaint => complaint.infringements)
  complaint: Complaint;

  @Column({
    nullable: true,
  })
  reason?: string;

  @Column({
    nullable: true,
  })
  fileType?: string;

  @Column()
  accepted: boolean;

  @Column({
    type: 'jsonb',
    nullable: true
  })
  hostedBy: {node: string, dealId: string}[];

  @Column({
    nullable: true
  })
  resync: boolean;
}
