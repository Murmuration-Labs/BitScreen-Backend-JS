import { BeforeInsert, BeforeUpdate, Column } from 'typeorm';

export class Timestamps {
  @Column()
  created: Date;

  @Column({
    nullable: true,
  })
  updated: Date;

  @BeforeInsert()
  setCreated?() {
    if (!this.created) this.created = new Date();
  }

  @BeforeUpdate()
  setUpdated?() {
    this.updated = new Date();
  }
}
