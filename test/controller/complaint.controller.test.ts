import {getMockReq, getMockRes} from "@jest-mock/express";
import {getComplaints, sendCreatedEmail} from "../../src/service/complaint.service";
import {create_complaint, get_complaint, search_complaints} from "../../src/controllers/complaint.controller";
import {mocked} from "ts-jest/utils";
import {getRepository} from "typeorm";
import {Complaint, ComplaintStatus, ViolationTypes} from "../../src/entity/Complaint";
import {Cid} from "../../src/entity/Cid";

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

jest.mock("../../src/service/complaint.service", () => ({
    sendCreatedEmail: jest.fn(),
    getComplaints: jest.fn()
}))

describe("Complaint Controller: GET /complaints/search", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
        process.env = { ...OLD_ENV };
    })

    afterAll(() => {
        process.env = OLD_ENV;
    });

    it("Should search complaints with empty string", async () => {
        const req = getMockReq()

        const expectedComplaints = [new Complaint(), new Complaint()]
        mocked(getComplaints).mockResolvedValueOnce(expectedComplaints)

        await search_complaints(req, res)

        expect(getComplaints).toHaveBeenCalledTimes(1)
        expect(getComplaints).toHaveBeenCalledWith('')

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith(expectedComplaints)
    })

    it("Should search complaints with query string", async () => {
        const req = getMockReq({
            query: {
                q: 'test'
            }
        })

        const expectedComplaints = [new Complaint(), new Complaint()]
        mocked(getComplaints).mockResolvedValueOnce(expectedComplaints)

        await search_complaints(req, res)

        expect(getComplaints).toHaveBeenCalledTimes(1)
        expect(getComplaints).toHaveBeenCalledWith('test')

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith(expectedComplaints)
    })
})

describe("Complaint Controller: POST /complaints", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
        process.env = { ...OLD_ENV };
    })

    afterAll(() => {
        process.env = OLD_ENV;
    });

    it("Should save the complaint and its CIDs", async () => {
        const req = getMockReq({
            body: {
                reporterEmail: 'test@test.com',
                typeOfViolation: ViolationTypes.Copyright,
                reporterName: 'Test Reporter',
                status: ComplaintStatus.Created,
                description: 'some description',
                dmcaNotice: 'whatever',
                businessName: 'Test Inc.',
                address: 'Test Avenue',
                phoneNumber: '8008132',
                cids: ['cid1', 'cid2'],
            }
        })

        const expectedComplaint = new Complaint()
        expectedComplaint.reporterEmail = 'test@test.com'
        expectedComplaint.typeOfViolation = ViolationTypes.Copyright
        expectedComplaint.reporterName = 'Test Reporter'
        expectedComplaint.description = 'some description'
        expectedComplaint.dmcaNotice = 'whatever'
        expectedComplaint.businessName = 'Test Inc.'
        expectedComplaint.address = 'Test Avenue'
        expectedComplaint.phoneNumber = '8008132'
        expectedComplaint.status = ComplaintStatus.Created

        const cid1 = new Cid()
        cid1.cid = 'cid1'
        cid1.complaint = expectedComplaint

        const cid2 = new Cid()
        cid2.cid = 'cid2'
        cid2.complaint = expectedComplaint

        const complaintRepo = {
            save: jest.fn().mockResolvedValueOnce(expectedComplaint)
        }

        const cidRepo = {
            save: jest.fn()
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(complaintRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)
        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(cidRepo)

        await create_complaint(req, res)

        expect(getRepository).toHaveBeenCalledTimes(3)
        expect(getRepository).toHaveBeenNthCalledWith(1, Complaint)
        expect(getRepository).toHaveBeenNthCalledWith(2, Cid)
        expect(getRepository).toHaveBeenNthCalledWith(3, Cid)

        expect(complaintRepo.save).toHaveBeenCalledTimes(1)
        expect(complaintRepo.save).toHaveBeenCalledWith(expectedComplaint)

        expect(cidRepo.save).toHaveBeenCalledTimes(2)
        expect(cidRepo.save).toHaveBeenNthCalledWith(1, cid1)
        expect(cidRepo.save).toHaveBeenNthCalledWith(2, cid2)

        expect(sendCreatedEmail).toHaveBeenCalledTimes(1)
        expect(sendCreatedEmail).toHaveBeenCalledWith('test@test.com')

        expect(res.send).toHaveBeenCalledWith(expectedComplaint)
    })
})

describe("Complaint Controller: GET /complaints/:id", () => {
    const OLD_ENV = process.env;

    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
        process.env = {...OLD_ENV};
    })

    afterAll(() => {
        process.env = OLD_ENV;
    });

    it("Should throw error on complaint not found", async () => {
        const req = getMockReq({
            params: {
                id: 43
            }
        })

        const complaintRepo = {
            findOne: jest.fn().mockResolvedValueOnce(null)
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(complaintRepo)

        await get_complaint(req, res)


        expect(getRepository).toHaveBeenCalledTimes(1)
        expect(getRepository).toHaveBeenCalledWith(Complaint)

        expect(complaintRepo.findOne).toHaveBeenCalledTimes(1)
        expect(complaintRepo.findOne).toHaveBeenCalledWith(43, {relations: ['cids']})

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({message: "Complaint not found"})
    })

    it("Should return complaint", async () => {
        const req = getMockReq({
            params: {
                id: 43
            }
        })

        const expectedComplaint = new Complaint()
        expectedComplaint._id = 43

        const complaintRepo = {
            findOne: jest.fn().mockResolvedValueOnce(expectedComplaint)
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(complaintRepo)

        await get_complaint(req, res)

        expect(getRepository).toHaveBeenCalledTimes(1)
        expect(getRepository).toHaveBeenCalledWith(Complaint)

        expect(complaintRepo.findOne).toHaveBeenCalledTimes(1)
        expect(complaintRepo.findOne).toHaveBeenCalledWith(43, {relations: ['cids']})

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith(expectedComplaint)
    })
})
