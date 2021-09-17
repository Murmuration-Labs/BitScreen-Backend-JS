import {Column, Entity, ManyToOne, PrimaryGeneratedColumn} from "typeorm";
import {Filter} from "./Filter";
import {Timestamps} from "./Timestamps";
import {Provider} from "./Provider";
import {Cid} from "./Cid";

export enum DealType {
    Storage,
    Retrieval,
}

export enum DealStatus {
    Rejected,
    Accepted,
}

@Entity()
export class Deal extends Timestamps {

    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Provider, provider => provider.deals)
    provider: Provider;

    @ManyToOne(() => Cid, cid => cid.deals)
    cid: Cid;

    @Column({enum: DealType})
    type: DealType;

    @Column({enum: DealStatus})
    status: DealStatus;
}
