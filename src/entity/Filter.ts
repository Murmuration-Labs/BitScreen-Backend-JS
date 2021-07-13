import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Cid } from "./Cid";
import { Provider_Filter } from "./Provider_Filter";
import { Timestamps } from "./Timestamps";

@Entity()
export class Filter extends Timestamps {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({
        nullable: true,
    })
    description: string;

    @Column({
        nullable: true,
    })
    override: boolean;

    @Column({
        nullable: true,
    })
    visibility: number;

    @Column({
        nullable: true,
    })
    shareId: string;

    @ManyToOne(() => Provider_Filter, e => e.filter)
    providerFilters: Provider_Filter[]

    @OneToMany(() => Cid, cid => cid.filter)
    cids: Cid[];
}
