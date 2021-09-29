import {get_by_wallet} from "../../src/controllers/providerController";
import { getMockReq, getMockRes } from '@jest-mock/express'
import * as typeorm from "typeorm";
import {mocked} from "ts-jest/utils";
import {getRepository, Repository} from "typeorm";
import {getAddressHash} from "../../../app/crypto_lib";

const {res, next, mockClear} = getMockRes()

jest.mock('typeorm', () => {
    return {
        getRepository: jest.fn(),
        PrimaryGeneratedColumn: jest.fn(),
        Column: jest.fn(),
        Entity: jest.fn(),
        BeforeInsert: jest.fn(),
        BeforeUpdate: jest.fn(),
        ManyToOne: jest.fn(),
        OneToMany: jest.fn(),
        Unique: jest.fn(),
    }
})

describe("Provider tests", () => {
    beforeEach(() => {
        mockClear()
    })

    it("Should get a provider by wallet", () => {
        const req = getMockReq({
            params: {
                wallet: '123456'
            }
        })

        const providerRepo = {
            metadata: {
                columns: [],
                relations: [],
            },
            findOne: jest.fn().mockResolvedValueOnce({test: 'result'})
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)

        get_by_wallet(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith({walletAddressHashed: 'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a'})
    })
})
