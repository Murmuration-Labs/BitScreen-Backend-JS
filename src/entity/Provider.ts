import {Column, Entity, OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Filter} from "./Filter";
import {Timestamps} from "./Timestamps";

@Entity()
export class Provider extends Timestamps {

    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        nullable: true,
    })
    walletAddressHashed: string;

    @Column({
        nullable: true,
    })
    country: string;

    @Column({
        nullable: true,
    })
    businessName: string;

    @Column({
        nullable: true,
    })
    website: string;

    @Column({
        nullable: true,
    })
    email: string;

    @Column({
        nullable: true,
    })
    contactPerson: string;

    @Column({
        nullable: true,
    })
    address: string;

    @OneToMany(() => Filter, filter => filter.provider)
    filters: Filter[];

}
