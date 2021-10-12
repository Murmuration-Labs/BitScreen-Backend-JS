import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Timestamps} from "./Timestamps";
import {Cid} from "./Cid";
import {DealStatus} from "./Deal";

export enum ViolationTypes {
    "Copyright",
    "Inappropriate Content",
}

export enum ComplaintStatus {
    "Created",
    "Finalized",
}

@Entity()
export class Complaint extends Timestamps {
    @PrimaryGeneratedColumn()
    _id: number;

    @Column({
        nullable: true,
    })
    reporterEmail: string;

    @Column({enum: ViolationTypes})
    typeOfViolation: ViolationTypes;

    @Column({
        nullable: true,
    })
    reporterName: string;

    @Column({
        nullable: true,
    })
    description: string;

    @Column({enum: ComplaintStatus})
    status: ComplaintStatus;

    @Column({
        nullable: true,
    })
    dmcaNotice: string;

    @Column({
        nullable: true,
    })
    businessName?: string;

    @Column({
        nullable: true,
    })
    address?: string;

    @Column({
        nullable: true,
    })
    phoneNumber?: string;

    @OneToMany(() => Cid, (cid) => cid.complaint)
    cids: Cid[];
}
