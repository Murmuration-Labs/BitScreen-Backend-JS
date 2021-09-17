import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Filter} from "./Filter";
import {Timestamps} from "./Timestamps";
import {Deal} from "./Deal";
import {Provider_Filter} from "./Provider_Filter";

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

    @OneToMany(() => Deal, (e) => e.cid)
    deals: Deal[];
}
