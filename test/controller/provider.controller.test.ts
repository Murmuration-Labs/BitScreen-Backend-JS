import {create_provider, edit_provider, get_by_wallet, provider_auth} from "../../src/controllers/provider.controller";
import { getMockReq, getMockRes } from '@jest-mock/express'
import * as typeorm from "typeorm";
import {mocked} from "ts-jest/utils";
import {getRepository, Repository} from "typeorm";
import * as crypto_lib from "../../../app/crypto_lib";
import {bufferToHex} from "ethereumjs-util";
import {recoverPersonalSignature} from "eth-sig-util";
import * as jwt from "jsonwebtoken";
import { v4 } from 'uuid';
import {Provider} from "../../src/entity/Provider";

const {res, next, mockClear} = getMockRes<any>({
    status: jest.fn(),
    send: jest.fn()
})

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

jest.mock('ethereumjs-util')
jest.mock('eth-sig-util')
jest.mock('jsonwebtoken', () => {
    return {
        sign: jest.fn()
    }
})
jest.mock('uuid', () => {
    return {
        v4: jest.fn()
    }
})

describe("Provider Controller: GET /provider/:wallet", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should get a provider by wallet", async () => {
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

        await get_by_wallet(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith({walletAddressHashed: 'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a'})

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({test: 'result'})
    })
})
describe("Provider Controller: POST /provider/auth/:wallet", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error for missing signature ", async () => {
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

        await provider_auth(req, res)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledWith({
            error: 'Request should have signature and wallet',
        })
    })

    it("Should throw error for missing wallet", async () => {
        const req = getMockReq({
            body: {
                signature: '78910'
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

        await provider_auth(req, res)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledWith({
            error: 'Request should have signature and wallet',
        })
    })

    it("Should throw error for provider not found", async () => {
        const req = getMockReq({
            body: {
                signature: '78910'
            },
            params: {
                wallet: '123456'
            }
        })

        const providerRepo = {
            metadata: {
                columns: [],
                relations: [],
            },
            findOne: jest.fn().mockResolvedValueOnce(null)
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)

        await provider_auth(req, res)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledWith({
            error: 'User does not exist in our database.',
        })
    })

    it("Should throw error for unauthorized", async () => {
        const req = getMockReq({
            body: {
                signature: '78910'
            },
            params: {
                wallet: '123456'
            }
        })

        const providerRepo = {
            metadata: {
                columns: [],
                relations: [],
            },
            findOne: jest.fn().mockResolvedValueOnce({
                nonce: 'some-nonce'
            })
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)
        mocked(bufferToHex).mockReturnValue('hex-nonce')
        mocked(recoverPersonalSignature).mockReturnValue('invalid-address')

        await provider_auth(req, res)

        expect(getRepository).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith({
            walletAddressHashed: 'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a'
        })
        expect(recoverPersonalSignature).toHaveBeenCalledTimes(1)
        expect(recoverPersonalSignature).toHaveBeenCalledWith({
            data: 'hex-nonce',
            sig: '78910',
        })

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(401)
        expect(res.send).toHaveBeenCalledWith({
            error: 'Unauthorized access. Signatures do not match.',
        })
    })

    it("Should authenticate the provider", async () => {
        const req = getMockReq({
            body: {
                signature: '78910'
            },
            params: {
                wallet: '123456'
            }
        })

        const providerRepo = {
            metadata: {
                columns: [],
                relations: [],
            },
            findOne: jest.fn().mockResolvedValueOnce({
                nonce: 'some-nonce',
                walletAddressHashed: 'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a'
            }),
            save: jest.fn()
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)
        mocked(bufferToHex).mockReturnValue('hex-nonce')
        mocked(recoverPersonalSignature).mockReturnValue('123456')
        // @ts-ignore
        mocked(jwt.sign).mockReturnValue('some-jwt-token')
        mocked(v4).mockReturnValue('another-nonce')

        await provider_auth(req, res)

        expect(recoverPersonalSignature).toHaveBeenCalledTimes(1)
        expect(recoverPersonalSignature).toHaveBeenCalledWith({
            data: 'hex-nonce',
            sig: '78910',
        })

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.send).toHaveBeenCalledWith({
            accessToken: "some-jwt-token",
            nonce: 'another-nonce',
            walletAddress: "123456",
            walletAddressHashed: "c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a"
        })
    })
})

describe("Provider Controller: PUT provider", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error for missing wallet ", async () => {
        const req = getMockReq()

        await edit_provider(req, res)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledWith({
            message: 'Missing wallet',
        })
    })

    it("Should throw error for missing provider ", async () => {
        const req = getMockReq({
            body: {
                walletAddress: '123456'
            }
        })

        const providerRepo = {
            metadata: {
                columns: [],
                relations: [],
            },
            findOne: jest.fn().mockResolvedValueOnce(null)
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)

        await edit_provider(req, res)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledWith({ message: 'Tried to update nonexistent provider' })
    })

    it("Should update provider ", async () => {
        const req = getMockReq({
            body: {
                walletAddress: '123456',
                id: 123,
                someField: '123',
                anotherField: '456'
            }
        })

        const providerRepo = {
            metadata: {
                columns: [],
                relations: [],
            },
            findOne: jest.fn().mockResolvedValueOnce({
                id: 123,
                someField: '321',
                anotherField: '654'
            }),
            update: jest.fn().mockReturnValueOnce({test: 'value'})
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)

        await edit_provider(req, res)

        expect(getRepository).toHaveBeenCalledTimes(2)
        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.update).toHaveBeenCalledTimes(1)
        expect(providerRepo.update).toHaveBeenCalledWith(
            {id: 123},
            {
                id: 123,
                someField: '123',
                anotherField: '456'
            }
        )

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({test: 'value'})
    })
})

describe("Provider Controller: POST provider/:wallet", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error for missing wallet ", async () => {
        const req = getMockReq()

        await create_provider(req, res)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledWith({
            message: 'Missing wallet',
        })
    })

    it("Should throw error for already existing provider ", async () => {
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
            findOne: jest.fn().mockResolvedValueOnce({id: 1})
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)

        await create_provider(req, res)

        expect(getRepository).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(
            {
                where: {
                    walletAddressHashed: 'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a'
                }
            }
        )

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledWith({ message: 'Provider already exists' })
    })

    it("Should create new provider ", async () => {
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
            findOne: jest.fn().mockResolvedValueOnce(null),
            save: jest.fn().mockReturnValueOnce({test: 'value'})
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)
        mocked(v4).mockReturnValue('another-nonce')

        await create_provider(req, res)

        expect(getRepository).toHaveBeenCalledTimes(2)
        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(
            {
                where: {
                    walletAddressHashed: 'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a'
                }
            }
        )

        const provider = new Provider()
        provider.walletAddressHashed = 'c888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a'
        provider.nonce = 'another-nonce'

        expect(providerRepo.save).toHaveBeenCalledTimes(1)
        expect(providerRepo.save).toHaveBeenCalledWith(provider)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            test: 'value',
            walletAddress: '123456'
        })
    })
})
