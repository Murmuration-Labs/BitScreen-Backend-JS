import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Complaint } from "./Complaint";
import { Provider } from './Provider';
import { Timestamps } from './Timestamps';

@Entity()
export class Assessor extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: true,
  })
  lastUpdate: Date;

  @OneToMany(() => Complaint, (e) => e.assessor)
  complaints: Complaint[];

  @Column({
    nullable: true,
  })
  rodeoConsentDate: string;

  @OneToOne(() => Provider)
  @JoinColumn()
  provider: Provider
}
