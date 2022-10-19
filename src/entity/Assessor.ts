import {
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Complaint } from './Complaint';
import { Provider } from './Provider';
import { Timestamps } from './Timestamps';

@Entity()
export class Assessor extends Timestamps {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Provider)
  @JoinColumn()
  provider: Provider;

  @Column({
    nullable: true,
  })
  loginEmail: string;

  @Column({
    nullable: true,
  })
  walletAddressHashed: string;

  @Column({
    nullable: true,
  })
  nonce: string;

  @OneToMany(() => Complaint, (e) => e.assessor)
  complaints: Complaint[];

  @Column({
    nullable: true,
  })
  rodeoConsentDate: string;

  @Column({
    nullable: true,
  })
  lastUpdate: Date;
}
