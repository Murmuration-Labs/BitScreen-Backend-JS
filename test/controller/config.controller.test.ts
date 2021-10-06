import {getMockReq, getMockRes} from "@jest-mock/express";
import {get_config, save_config} from "../../src/controllers/config.controller";
import {getRepository} from "typeorm";
import {mocked} from "ts-jest/utils";
import {Config} from "../../src/entity/Settings";
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
        OneToOne: jest.fn(),
        Unique: jest.fn(),
        JoinColumn: jest.fn()
    }
})

describe("Config Controller: GET /config/:providerId", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error on missing providerId", async () => {
        const req = getMockReq()

        await get_config(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ message: 'Please provide a providerId.' })
    })

    it("Should throw error on provider not found", async () => {
        const req = getMockReq({
            params: {
                providerId: 1
            }
        })

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce(null)
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)

        await get_config(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(1)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({})
    })

    it("Should throw error on config not found", async () => {
        const req = getMockReq({
            params: {
                providerId: 1
            }
        })

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce({id: 1})
        }
        const configRepo = {
            findOne: jest.fn().mockReturnValueOnce(null)
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(providerRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(configRepo)

        await get_config(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(1)

        expect(configRepo.findOne).toHaveBeenCalledTimes(1)
        expect(configRepo.findOne).toHaveBeenCalledWith({where: {provider: {id: 1}}})

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({})
    })

    it("Should return config", async () => {
        const req = getMockReq({
            params: {
                providerId: 1
            }
        })

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce({id: 1})
        }
        const configRepo = {
            findOne: jest.fn().mockReturnValueOnce({id: 1234, config: '{"bitscreen": true}'})
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(providerRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(configRepo)

        await get_config(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(1)

        expect(configRepo.findOne).toHaveBeenCalledTimes(1)
        expect(configRepo.findOne).toHaveBeenCalledWith({where: {provider: {id: 1}}})

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            id: 1234,
            bitscreen: true
        })
    })
})

describe("Config Controller: POST /config", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error on missing providerId", async () => {
        const req = getMockReq()

        await save_config(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ message: 'Please provide a providerId.' })
    })

    it("Should throw error on provider not found", async () => {
        const req = getMockReq({
            body: {
                providerId: 1
            }
        })

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce(null)
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(providerRepo)

        await save_config(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(1)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({})
    })

    it("Should throw error on config missing", async () => {
        const req = getMockReq({
            body: {
                providerId: 1
            }
        })

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce({id: 1})
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(providerRepo)

        await save_config(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(1)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ message: 'Empty config not allowed.' })
    })

    it("Should update existing config", async () => {
        const req = getMockReq({
            body: {
                providerId: 1,
                bitscreen: false,
                someOtherConfig: true
            }
        })

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce({id: 1})
        }
        const configRepo = {
            findOne: jest.fn().mockResolvedValueOnce({id: 1234, config: '{"bitscreen": true, "someConfigToBeRemoved": false}'}),
            update: jest.fn()
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(providerRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValue(configRepo)

        await save_config(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(1)
        expect(configRepo.findOne).toHaveBeenCalledTimes(1)
        expect(configRepo.findOne).toHaveBeenCalledWith({where: {provider: {id: 1}}})
        expect(configRepo.update).toHaveBeenCalledTimes(1)
        expect(configRepo.update).toHaveBeenCalledWith(1234, {config: '{"bitscreen":false,"someOtherConfig":true}'})

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(200)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            id: 1234,
            bitscreen: false,
            someOtherConfig: true
        })
    })

    it("Should create new config", async () => {
        const req = getMockReq({
            body: {
                providerId: 1,
                bitscreen: false,
                someOtherConfig: true
            }
        })

        const provider = new Provider()
        provider.id = 1

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce(provider)
        }
        const configRepo = {
            findOne: jest.fn().mockResolvedValueOnce(null),
            save: jest.fn()
        }

        const config = new Config()
        config.provider = provider
        config.config = '{"bitscreen":false,"someOtherConfig":true}'

        const dbConfig = new Config()
        dbConfig.id = 123
        dbConfig.provider = provider
        dbConfig.config = '{"bitscreen":false,"someOtherConfig":true}'

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(providerRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValue(configRepo)
        mocked(configRepo.save).mockReturnValueOnce(dbConfig)

        await save_config(req, res)

        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith(1)
        expect(configRepo.findOne).toHaveBeenCalledTimes(1)
        expect(configRepo.findOne).toHaveBeenCalledWith({where: {provider: {id: 1}}})
        expect(configRepo.save).toHaveBeenCalledTimes(1)
        expect(configRepo.save).toHaveBeenCalledWith(config)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            id: 123,
            bitscreen: false,
            someOtherConfig: true
        })
    })
})
