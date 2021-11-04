import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Timestamps} from "./Timestamps";

export enum ComplainantType {
    None,
    Individual,
    Organization,
    Government,
}

export enum OnBehalfOf {
    None,
    Self,
    OtherParty,
}

export enum ComplaintType {
    Copyright = 1,
    Inappropriate = 2,
    Other = 3,
}

export enum ComplaintStatus {
    "Created",
    "Finalized",
}

@Entity()
export class Complaint extends Timestamps {
    @PrimaryGeneratedColumn()
    _id: number;

    @Column()
    fullName: string;

    @Column()
    email: string;

    @Column({enum: ComplainantType})
    complainantType: ComplainantType;

    @Column({enum: OnBehalfOf})
    onBehalfOf: OnBehalfOf;

    @Column()
    city?: string;

    @Column()
    state?: string;

    @Column()
    country?: string;

    @Column({enum: ComplaintType})
    type: ComplaintType;

    @Column({enum: ComplaintStatus})
    status: ComplaintStatus;

    @Column({
        nullable: true,
    })
    complaintDescription: string;

    @Column({
        type: 'jsonb'
    })
    geoScope: string[];

    @Column({
        type: 'jsonb'
    })
    infringements: string[];

    @Column({
        nullable: true,
    })
    companyName?: string;

    @Column({
        nullable: true,
    })
    address?: string;

    @Column({
        nullable: true,
    })
    phoneNumber?: string;

    @Column()
    workDescription?: string;

    @Column()
    agreement?: boolean;
}
