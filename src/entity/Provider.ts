import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { Provider_Filter } from "./Provider_Filter";
import { Timestamps } from "./Timestamps";

@Entity()
export class Provider extends Timestamps {

    @PrimaryColumn()
    id: string;

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

    @OneToMany(() => Provider_Filter, e => e.provider)
    providerFilters: Provider_Filter[]
}
