import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Filter} from "./Filter";
import {Timestamps} from "./Timestamps";

@Entity()
export class Cid extends Timestamps {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    cid: string;

    @Column({
        nullable: true,
    })
    refUrl: string;

    @ManyToOne(() => Filter, filter => filter.cids)
    filter: Filter;
}
