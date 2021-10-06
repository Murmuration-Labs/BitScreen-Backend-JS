import { getMockReq, getMockRes } from '@jest-mock/express'
import * as typeorm from "typeorm";
import {mocked} from "ts-jest/utils";
import {getRepository, Repository} from "typeorm";
import {cid_override, create_cid, delete_cid, edit_cid, move_cid} from "../../src/controllers/cid.controller";
import {Cid} from "../../src/entity/Cid";
import {Filter} from "../../src/entity/Filter";
import {getLocalCidCount, getRemoteCidCount} from "../../src/service/cid.service";

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

jest.mock("../../src/service/cid.service")

describe("CID Controller: POST /cid", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error on missing filterId", async () => {
        const req = getMockReq({
            body: {
                cid: 'asdfg',
                refUrl: 'google.com'
            }
        })

        await create_cid(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ message: 'Missing filterId' })
    })

    it("Should throw error on filter not found", async () => {
        const req = getMockReq({
            body: {
                filterId: 1,
                cid: 'asdfg',
                refUrl: 'google.com'
            }
        })

        const cidRepo = {
            metadata: {
                columns: [],
                relations: [],
            },
            findOne: jest.fn().mockResolvedValueOnce(null)
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(cidRepo)

        await create_cid(req, res)

        expect(getRepository).toHaveBeenCalledTimes(1)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ message: `Filter with id 1 not found.` })
    })

    it("Should create cid", async () => {
        const req = getMockReq({
            body: {
                filterId: 1,
                cid: 'asdfg',
                refUrl: 'google.com'
            }
        })

        const filter = new Filter()
        filter.id = 1

        const cidRepo = {
            metadata: {
                columns: [],
                relations: [],
            },
            findOne: jest.fn().mockResolvedValueOnce(filter),
            save: jest.fn().mockReturnValueOnce({test: 'value'})
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValue(cidRepo)

        await create_cid(req, res)

        const cid = new Cid()
        cid.filter = filter
        cid.cid = 'asdfg'
        cid.refUrl = 'google.com'

        expect(getRepository).toHaveBeenCalledTimes(2)
        expect(cidRepo.findOne).toHaveBeenCalledTimes(1)
        expect(cidRepo.save).toHaveBeenCalledTimes(1)
        expect(cidRepo.save).toHaveBeenCalledWith(cid)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ test: `value` })
    })
})

describe("CID Controller: PUT /cid/:id", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should create cid with filter", async () => {
        const req = getMockReq({
            params: {
                id: 2
            },
            body: {
                filterId: 2,
                cid: 'newVal',
                refUrl: 'newRef'
            }
        })

        const oldFilter = new Filter()
        oldFilter.id = 1

        const cid = new Cid()
        cid.filter = oldFilter
        cid.cid = 'oldVal'
        cid.refUrl = 'oldRef'

        const newFilter = new Filter()
        newFilter.id = 2

        const newCid = new Cid()
        newCid.filter = newFilter
        newCid.cid = 'newVal'
        newCid.refUrl = 'newRef'

        const cidRepo = {
            findOne: jest.fn(),
            save: jest.fn()
        }

        const filterRepo = {
            findOne: jest.fn()
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(filterRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)
        mocked(cidRepo.findOne).mockReturnValueOnce(cid)
        mocked(cidRepo.save).mockReturnValueOnce({test: 'value'})
        mocked(filterRepo.findOne).mockReturnValueOnce(newFilter)

        await edit_cid(req, res)

        expect(getRepository).toHaveBeenCalledTimes(3)
        expect(cidRepo.findOne).toHaveBeenCalledTimes(1)
        expect(cidRepo.findOne).toHaveBeenCalledWith(2, {relations: ['filter']})
        expect(filterRepo.findOne).toHaveBeenCalledTimes(1)
        expect(filterRepo.findOne).toHaveBeenCalledWith(2)
        expect(cidRepo.save).toHaveBeenCalledTimes(1)
        expect(cidRepo.save).toHaveBeenCalledWith(newCid)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith(newCid)
    })

    it("Should create cid without filter", async () => {
        const req = getMockReq({
            params: {
                id: 2
            },
            body: {
                filterId: 1,
                cid: 'newVal',
                refUrl: 'newRef'
            }
        })

        const filter = new Filter()
        filter.id = 1

        const cid = new Cid()
        cid.filter = filter
        cid.cid = 'oldVal'
        cid.refUrl = 'oldRef'

        const newCid = new Cid()
        newCid.filter = filter
        newCid.cid = 'newVal'
        newCid.refUrl = 'newRef'

        const cidRepo = {
            findOne: jest.fn(),
            save: jest.fn()
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValue(cidRepo)
        mocked(cidRepo.findOne).mockReturnValueOnce(cid)
        mocked(cidRepo.save).mockReturnValueOnce({test: 'value'})

        await edit_cid(req, res)

        expect(getRepository).toHaveBeenCalledTimes(2)
        expect(cidRepo.findOne).toHaveBeenCalledTimes(1)
        expect(cidRepo.findOne).toHaveBeenCalledWith(2, {relations: ['filter']})
        expect(cidRepo.save).toHaveBeenCalledTimes(1)
        expect(cidRepo.save).toHaveBeenCalledWith(newCid)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith(newCid)
    })

    it("Should create cid without filterId", async () => {
        const req = getMockReq({
            params: {
                id: 2
            },
            body: {
                cid: 'newVal',
                refUrl: 'newRef'
            }
        })

        const filter = new Filter()
        filter.id = 1

        const cid = new Cid()
        cid.filter = filter
        cid.cid = 'oldVal'
        cid.refUrl = 'oldRef'

        const newCid = new Cid()
        newCid.filter = filter
        newCid.cid = 'newVal'
        newCid.refUrl = 'newRef'

        const cidRepo = {
            findOne: jest.fn(),
            save: jest.fn()
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValue(cidRepo)
        mocked(cidRepo.findOne).mockReturnValueOnce(cid)
        mocked(cidRepo.save).mockReturnValueOnce({test: 'value'})

        await edit_cid(req, res)

        expect(getRepository).toHaveBeenCalledTimes(2)
        expect(cidRepo.findOne).toHaveBeenCalledTimes(1)
        expect(cidRepo.findOne).toHaveBeenCalledWith(2, {relations: ['filter']})
        expect(cidRepo.save).toHaveBeenCalledTimes(1)
        expect(cidRepo.save).toHaveBeenCalledWith(newCid)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith(newCid)
    })
})

describe("CID Controller: POST /cid/:id/move/:toFilterId", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error for CID not found", async () => {
        const req = getMockReq({
            params: {
                id: 2,
                toFilterId: 10
            }
        })

        const cidRepo = {
            findOne: jest.fn(),
        }

        const filterRepo = {
            findOne: jest.fn()
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(filterRepo)

        mocked(cidRepo.findOne).mockReturnValueOnce(null)
        mocked(filterRepo.findOne).mockReturnValueOnce({id: 10})

        await move_cid(req, res)

        expect(getRepository).toHaveBeenCalledTimes(2)
        expect(cidRepo.findOne).toHaveBeenCalledTimes(1)
        expect(cidRepo.findOne).toHaveBeenCalledWith(2, {relations: ['filter']})
        expect(filterRepo.findOne).toHaveBeenCalledTimes(1)
        expect(filterRepo.findOne).toHaveBeenCalledWith(10)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({})
    })

    it("Should throw error for filter not found", async () => {
        const req = getMockReq({
            params: {
                id: 2,
                toFilterId: 10
            }
        })

        const cidRepo = {
            findOne: jest.fn(),
        }

        const filterRepo = {
            findOne: jest.fn()
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(filterRepo)

        mocked(cidRepo.findOne).mockReturnValueOnce({id: 2})
        mocked(filterRepo.findOne).mockReturnValueOnce(null)

        await move_cid(req, res)

        expect(getRepository).toHaveBeenCalledTimes(2)
        expect(cidRepo.findOne).toHaveBeenCalledTimes(1)
        expect(cidRepo.findOne).toHaveBeenCalledWith(2, {relations: ['filter']})
        expect(filterRepo.findOne).toHaveBeenCalledTimes(1)
        expect(filterRepo.findOne).toHaveBeenCalledWith(10)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({})
    })

    it("Should change CID filter", async () => {
        const req = getMockReq({
            params: {
                id: 2,
                toFilterId: 10
            }
        })

        const cidRepo = {
            findOne: jest.fn(),
            save: jest.fn()
        }

        const filterRepo = {
            findOne: jest.fn()
        }

        const oldFilter = new Filter()
        oldFilter.id = 1

        const newFilter = new Filter()
        newFilter.id = 10

        const cid = new Cid()
        cid.id = 2
        cid.filter = oldFilter

        const expectedCid = new Cid()
        expectedCid.id = 2
        expectedCid.filter = newFilter

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(filterRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)

        mocked(cidRepo.findOne).mockReturnValueOnce(cid)
        mocked(filterRepo.findOne).mockReturnValueOnce(newFilter)

        await move_cid(req, res)

        expect(getRepository).toHaveBeenCalledTimes(3)
        expect(cidRepo.findOne).toHaveBeenCalledTimes(1)
        expect(cidRepo.findOne).toHaveBeenCalledWith(2, {relations: ['filter']})
        expect(filterRepo.findOne).toHaveBeenCalledTimes(1)
        expect(filterRepo.findOne).toHaveBeenCalledWith(10)
        expect(cidRepo.save).toHaveBeenCalledTimes(1)
        expect(cidRepo.save).toHaveBeenCalledWith(expectedCid)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith(expectedCid)
    })
})

describe("CID Controller: DELETE /cid/:id", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should delete CID", async () => {
        const req = getMockReq({
            params: {
                id: 2
            }
        })

        const cidRepo = {
            delete: jest.fn()
        }
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)

        await delete_cid(req, res)

        expect(getRepository).toHaveBeenCalledTimes(1)
        expect(cidRepo.delete).toHaveBeenCalledTimes(1)
        expect(cidRepo.delete).toHaveBeenCalledWith({id: 2})

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({})
    })
})

describe("CID Controller: GET /cid/override", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error on wrong filterId type", async () => {
        const req = getMockReq({
            query: {
                filterId: true,
                cid: 'some-cid',
                providerId: 'google.com'
            }
        })

        await cid_override(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ message: 'Please provide a valid filterId' })
    })

    it("Should throw error on wrong CID type", async () => {
        const req = getMockReq({
            query: {
                filterId: 1,
                cid: 12,
                providerId: 'google.com'
            }
        })

        await cid_override(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ message: 'Please provide a valid cid' })
    })

    it("Should throw error on wrong providerId type", async () => {
        const req = getMockReq({
            query: {
                filterId: 1,
                cid: 'some-cid',
                providerId: true
            }
        })

        await cid_override(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ message: 'Please provide a valid providerId' })
    })

    it("Should return values with string input", async () => {
        const req = getMockReq({
            query: {
                filterId: '1',
                cid: 'SOME-CID',
                providerId: '2'
            }
        })

        mocked(getLocalCidCount).mockResolvedValueOnce(5)
        mocked(getRemoteCidCount).mockResolvedValueOnce(10)

        await cid_override(req, res)

        expect(getLocalCidCount).toHaveBeenCalledTimes(1)
        expect(getLocalCidCount).toHaveBeenCalledWith(1, 2, 'some-cid')
        expect(getRemoteCidCount).toHaveBeenCalledTimes(1)
        expect(getRemoteCidCount).toHaveBeenCalledWith(1, 2, 'some-cid')

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ local: 5, remote: 10 })
    })

    it("Should return values with string input", async () => {
        const req = getMockReq({
            query: {
                filterId: 1,
                cid: 'SOME-CID',
                providerId: 2
            }
        })

        mocked(getLocalCidCount).mockResolvedValueOnce(5)
        mocked(getRemoteCidCount).mockResolvedValueOnce(10)

        await cid_override(req, res)

        expect(getLocalCidCount).toHaveBeenCalledTimes(1)
        expect(getLocalCidCount).toHaveBeenCalledWith(1, 2, 'some-cid')
        expect(getRemoteCidCount).toHaveBeenCalledTimes(1)
        expect(getRemoteCidCount).toHaveBeenCalledWith(1, 2, 'some-cid')

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({ local: 5, remote: 10 })
    })
})
