import {Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Provider} from "./Provider";
import {Timestamps} from "./Timestamps";
import {Cid} from "./Cid";

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

    @ManyToOne(() => Provider, provider => provider.filters)
    provider: Provider;

    @OneToMany(() => Cid, cid => cid.filter)
    cids: Cid[];
}
