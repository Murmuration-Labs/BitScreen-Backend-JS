import { BeforeInsert, BeforeUpdate, Column } from 'typeorm';

export class Timestamps {
  @Column()
  created: Date;

  @Column({
    nullable: true,
  })
  updated: Date;

  @BeforeInsert()
  setCreated() {
    this.created = new Date();
  }

  @BeforeUpdate()
  setUpdated() {
    this.updated = new Date();
  }
}
