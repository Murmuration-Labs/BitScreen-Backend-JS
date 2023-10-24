import { getMockReq, getMockRes } from '@jest-mock/express';
import {
  getComplaintById,
  getComplaints,
  getPublicComplaints,
  sendCreatedEmail,
  adjustNetworksOnIndividualComplaint,
  adjustNetworksOnMultipleComplaints,
} from '../../src/service/complaint.service';
import {
  create_complaint,
  get_complaint,
  public_complaints,
  search_complaints,
} from '../../src/controllers/complaint.controller';
import { mocked } from 'ts-jest/utils';
import { getRepository } from 'typeorm';
import {
  ComplainantType,
  Complaint,
  ComplaintStatus,
  ComplaintType,
  OnBehalfOf,
} from '../../src/entity/Complaint';
import { FileType, Infringement } from '../../src/entity/Infringement';
import { Cid } from '../../src/entity/Cid';
import { Network } from '../../src/entity/Network';
import { NetworkType } from '../../src/entity/interfaces';

const { res, next, mockClear } = getMockRes<any>({
  status: jest.fn(),
  send: jest.fn(),
});
const OLD_ENV = process.env;

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
    ManyToMany: jest.fn(),
    Unique: jest.fn(),
    JoinTable: jest.fn(),
    JoinColumn: jest.fn(),
    OneToOne: jest.fn(),
  };
});

jest.mock('web3.storage', () => {
  return {
    Web3Storage: jest.fn().mockReturnValue({
      status: jest.fn(() => []),
    }),
  };
});

jest.mock('../../src/service/complaint.service', () => {
  const originalModule = jest.requireActual(
    '../../src/service/complaint.service'
  );

  return {
    ...originalModule,
    sendCreatedEmail: jest.fn(),
    getComplaints: jest.fn(),
    getPublicComplaints: jest.fn(),
    getComplaintById: jest.fn(),
  };
});

const ipfsNetwork = new Network();
ipfsNetwork.networkType = NetworkType.IPFS;
ipfsNetwork.id = 1;

const filecoinNetwork = new Network();
filecoinNetwork.networkType = NetworkType.Filecoin;
filecoinNetwork.id = 1;

let complaint1 = new Complaint();
complaint1._id = 1;
complaint1.networks = [ipfsNetwork, filecoinNetwork];

let complaint2 = new Complaint();
complaint2._id = 2;
complaint2.networks = [ipfsNetwork, filecoinNetwork];

beforeEach(() => {
  mockClear();
  jest.clearAllMocks();
  process.env = { ...OLD_ENV };
});

afterAll(() => {
  process.env = OLD_ENV;
});

describe('Complaint Controller: GET /complaints/search', () => {
  it('Should search complaints with empty string', async () => {
    const req = getMockReq();
    const page = 1;
    const itemsPerPage = 15;

    const totalCount = 2;
    const expectedComplaints = [complaint1, complaint2];
    mocked(getComplaints).mockResolvedValueOnce([
      expectedComplaints,
      totalCount,
    ]);

    await search_complaints(req, res);

    expect(getComplaints).toHaveBeenCalledTimes(1);
    expect(getComplaints).toHaveBeenCalledWith('', 1, 10, 'created', 'DESC');

    const totalPages =
      totalCount < itemsPerPage
        ? 1
        : totalCount % itemsPerPage === 0
        ? totalCount / itemsPerPage
        : Math.floor(totalCount / itemsPerPage) + 1;

    expect(totalPages).toBe(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      complaints: adjustNetworksOnMultipleComplaints(expectedComplaints),
      page,
      totalPages: 1,
    });
  });

  it('Should search complaints with query string', async () => {
    const req = getMockReq({
      query: {
        q: 'test',
      },
    });
    const page = 1;
    const itemsPerPage = 15;

    const expectedComplaints = [complaint1, complaint2];
    const totalCount = 2;
    mocked(getComplaints).mockResolvedValueOnce([
      expectedComplaints,
      totalCount,
    ]);

    await search_complaints(req, res);

    expect(getComplaints).toHaveBeenCalledTimes(1);
    expect(getComplaints).toHaveBeenCalledWith(
      'test',
      1,
      10,
      'created',
      'DESC'
    );

    const totalPages =
      totalCount < itemsPerPage
        ? 1
        : totalCount % itemsPerPage === 0
        ? totalCount / itemsPerPage
        : Math.floor(totalCount / itemsPerPage) + 1;

    expect(totalPages).toBe(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      complaints: adjustNetworksOnMultipleComplaints(expectedComplaints),
      page,
      totalPages: 1,
    });
  });

  it('Should search complaints with custom parameters', async () => {
    const req = getMockReq({
      query: {
        q: 'test',
        itemsPerPage: '100',
        page: '1',
        orderBy: 'someColumn',
        orderDirection: 'ASC',
      },
    });
    const page = 1;
    const itemsPerPage = 15;

    const expectedComplaints = [complaint1, complaint2];
    const totalCount = 2;
    mocked(getComplaints).mockResolvedValueOnce([
      expectedComplaints,
      totalCount,
    ]);

    await search_complaints(req, res);

    expect(getComplaints).toHaveBeenCalledTimes(1);
    expect(getComplaints).toHaveBeenCalledWith(
      'test',
      1,
      100,
      'someColumn',
      'ASC'
    );

    const totalPages =
      totalCount < itemsPerPage
        ? 1
        : totalCount % itemsPerPage === 0
        ? totalCount / itemsPerPage
        : Math.floor(totalCount / itemsPerPage) + 1;

    expect(totalPages).toBe(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      complaints: adjustNetworksOnMultipleComplaints(expectedComplaints),
      page,
      totalPages: 1,
    });
  });
});

describe('Complaint Controller: GET /complaints/public', () => {
  it('Should search complaints with empty string', async () => {
    const req = getMockReq();
    const page = 1;
    const itemsPerPage = 15;

    const totalCount = 2;
    const expectedComplaints = [complaint1, complaint2];
    mocked(getPublicComplaints).mockResolvedValueOnce({
      complaints: expectedComplaints,
      totalCount,
    });

    await public_complaints(req, res);

    expect(getPublicComplaints).toHaveBeenCalledTimes(1);
    expect(getPublicComplaints).toHaveBeenCalledWith(
      '',
      1,
      10,
      'created',
      'DESC',
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    const totalPages =
      totalCount < itemsPerPage
        ? 1
        : totalCount % itemsPerPage === 0
        ? totalCount / itemsPerPage
        : Math.floor(totalCount / itemsPerPage) + 1;

    expect(totalPages).toBe(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      complaints: [
        {
          _id: 1,
          assessor: undefined,
          companyName: undefined,
          created: undefined,
          description: undefined,
          filterLists: undefined,
          fullName: undefined,
          geoScope: undefined,
          infringements: [],
          resolvedOn: undefined,
          type: undefined,
          networks: ['IPFS', 'Filecoin'],
        },
        {
          _id: 2,
          assessor: undefined,
          companyName: undefined,
          created: undefined,
          description: undefined,
          filterLists: undefined,
          fullName: undefined,
          geoScope: undefined,
          infringements: [],
          resolvedOn: undefined,
          type: undefined,
          networks: ['IPFS', 'Filecoin'],
        },
      ],
      page,
      totalPages: 1,
      totalCount: totalCount,
    });
  });

  it('Should search complaints with query string', async () => {
    const req = getMockReq({
      query: {
        q: 'test',
      },
    });
    const page = 1;
    const itemsPerPage = 15;

    const expectedComplaints = [complaint1, complaint2];
    const totalCount = 2;
    mocked(getPublicComplaints).mockResolvedValueOnce({
      complaints: expectedComplaints,
      totalCount,
    });

    await public_complaints(req, res);

    expect(getPublicComplaints).toHaveBeenCalledTimes(1);
    expect(getPublicComplaints).toHaveBeenCalledWith(
      'test',
      1,
      10,
      'created',
      'DESC',
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    const totalPages =
      totalCount < itemsPerPage
        ? 1
        : totalCount % itemsPerPage === 0
        ? totalCount / itemsPerPage
        : Math.floor(totalCount / itemsPerPage) + 1;

    expect(totalPages).toBe(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      complaints: [
        {
          _id: 1,
          assessor: undefined,
          companyName: undefined,
          created: undefined,
          description: undefined,
          filterLists: undefined,
          fullName: undefined,
          geoScope: undefined,
          infringements: [],
          resolvedOn: undefined,
          type: undefined,
          networks: ['IPFS', 'Filecoin'],
        },
        {
          _id: 2,
          assessor: undefined,
          companyName: undefined,
          created: undefined,
          description: undefined,
          filterLists: undefined,
          fullName: undefined,
          geoScope: undefined,
          infringements: [],
          resolvedOn: undefined,
          type: undefined,
          networks: ['IPFS', 'Filecoin'],
        },
      ],
      page,
      totalPages: 1,
      totalCount: totalCount,
    });
  });

  it('Should search complaints with custom parameters', async () => {
    const req = getMockReq({
      query: {
        q: 'test',
        itemsPerPage: '100',
        page: '1',
        orderBy: 'someColumn',
        orderDirection: 'ASC',
      },
    });
    const page = 1;
    const itemsPerPage = 15;

    const expectedComplaints = [complaint1, complaint2];
    const totalCount = 2;
    mocked(getPublicComplaints).mockResolvedValueOnce({
      complaints: expectedComplaints,
      totalCount,
    });

    await public_complaints(req, res);

    expect(getPublicComplaints).toHaveBeenCalledTimes(1);
    expect(getPublicComplaints).toHaveBeenCalledWith(
      'test',
      1,
      100,
      'someColumn',
      'ASC',
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    const totalPages =
      totalCount < itemsPerPage
        ? 1
        : totalCount % itemsPerPage === 0
        ? totalCount / itemsPerPage
        : Math.floor(totalCount / itemsPerPage) + 1;

    expect(totalPages).toBe(1);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({
      complaints: [
        {
          _id: 1,
          assessor: undefined,
          companyName: undefined,
          created: undefined,
          description: undefined,
          filterLists: undefined,
          fullName: undefined,
          geoScope: undefined,
          infringements: [],
          resolvedOn: undefined,
          type: undefined,
          networks: ['IPFS', 'Filecoin'],
        },
        {
          _id: 2,
          assessor: undefined,
          companyName: undefined,
          created: undefined,
          description: undefined,
          filterLists: undefined,
          fullName: undefined,
          geoScope: undefined,
          infringements: [],
          resolvedOn: undefined,
          type: undefined,
          networks: ['IPFS', 'Filecoin'],
        },
      ],
      page,
      totalPages: 1,
      totalCount: totalCount,
    });
  });
});

describe('Complaint Controller: POST /complaints', () => {
  it('Should save the complaint and its CIDs', async () => {
    const req = getMockReq({
      body: {
        email: 'test@test.com',
        type: ComplaintType.Copyright,
        fullName: 'Test Reporter',
        status: ComplaintStatus.New,
        title: 'test title',
        complaintDescription: 'some description',
        companyName: 'Test Inc.',
        address: 'Test Avenue',
        phoneNumber: '8008132',
        infringements: [
          { value: 'cid1', fileType: FileType.Text },
          { value: 'cid2', fileType: FileType.Other },
        ],
        agreement: true,
        city: 'Bucharest',
        country: 'Romania',
        complainantType: ComplainantType.Individual,
        geoScope: ['global'],
        onBehalfOf: OnBehalfOf.Self,
        state: 'Whatever',
        workDescription: 'asdf',
        networks: ['IPFS', 'Filecoin'],
      },
    });

    const expectedComplaint = new Complaint();
    expectedComplaint.email = 'test@test.com';
    expectedComplaint.type = ComplaintType.Copyright;
    expectedComplaint.fullName = 'Test Reporter';
    expectedComplaint.complaintDescription = 'some description';
    expectedComplaint.redactedComplaintDescription = 'some description';
    expectedComplaint.title = 'test title';
    expectedComplaint.companyName = 'Test Inc.';
    expectedComplaint.address = 'Test Avenue';
    expectedComplaint.phoneNumber = '8008132';
    expectedComplaint.status = ComplaintStatus.New;
    expectedComplaint.agreement = true;
    expectedComplaint.city = 'Bucharest';
    expectedComplaint.complainantType = ComplainantType.Individual;
    expectedComplaint.country = 'Romania';
    expectedComplaint.geoScope = ['global'];
    expectedComplaint.onBehalfOf = OnBehalfOf.Self;
    expectedComplaint.privateNote = '';
    expectedComplaint.state = 'Whatever';
    expectedComplaint.workDescription = 'asdf';
    expectedComplaint.networks = [ipfsNetwork, filecoinNetwork];

    const complaintRepo = {
      save: jest.fn().mockResolvedValueOnce(expectedComplaint),
    };

    const infringementRepo = {
      save: jest.fn(),
    };

    const cidRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const expectedInfringementOne = new Infringement();
    expectedInfringementOne.value = 'cid1';
    expectedInfringementOne.accepted = false;
    expectedInfringementOne.complaint = expectedComplaint;
    expectedInfringementOne.hostedBy = [];
    expectedInfringementOne.resync = false;
    expectedInfringementOne.fileType = FileType.Text;

    const expectedInfringementTwo = new Infringement();
    expectedInfringementTwo.value = 'cid2';
    expectedInfringementTwo.accepted = false;
    expectedInfringementTwo.complaint = expectedComplaint;
    expectedInfringementTwo.hostedBy = [];
    expectedInfringementTwo.resync = false;
    expectedInfringementTwo.fileType = FileType.Other;

    const expectedCid = new Cid();
    expectedCid.cid = 'someCid';
    expectedCid.hashedCid = 'hashedSomeCid';
    expectedCid.cidAnalysis = [];

    const networkRepo = {
      find: jest.fn().mockResolvedValueOnce([ipfsNetwork, filecoinNetwork]),
    };

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(networkRepo);

    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(complaintRepo);
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(infringementRepo);
    mocked(infringementRepo.save).mockResolvedValueOnce(
      expectedInfringementOne
    );
    // @ts-ignore
    mocked(getRepository).mockReturnValueOnce(infringementRepo);
    mocked(infringementRepo.save).mockResolvedValueOnce(
      expectedInfringementTwo
    );
    // @ts-ignore
    mocked(getRepository).mockReturnValue(cidRepo);
    mocked(cidRepo.findOne).mockReturnValueOnce(expectedCid);

    await create_complaint(req, res);

    expect(getRepository).toHaveBeenCalledTimes(7);
    expect(getRepository).toHaveBeenNthCalledWith(1, Network);
    expect(getRepository).toHaveBeenNthCalledWith(2, Complaint);
    expect(getRepository).toHaveBeenNthCalledWith(3, Infringement);
    expect(getRepository).toHaveBeenNthCalledWith(4, Infringement);

    expect(complaintRepo.save).toHaveBeenCalledTimes(1);
    expect(complaintRepo.save).toHaveBeenCalledWith(expectedComplaint);

    expect(infringementRepo.save).toHaveBeenCalledTimes(2);
    expect(infringementRepo.save).toHaveBeenNthCalledWith(
      1,
      expectedInfringementOne
    );
    expect(infringementRepo.save).toHaveBeenNthCalledWith(
      2,
      expectedInfringementTwo
    );

    expect(sendCreatedEmail).toHaveBeenCalledTimes(1);
    expect(sendCreatedEmail).toHaveBeenCalledWith('test@test.com');

    expect(res.send).toHaveBeenCalledWith(expectedComplaint);
  });
});

describe('Complaint Controller: GET /complaints/:id', () => {
  it('Should throw error on complaint not found', async () => {
    const req = getMockReq({
      params: {
        id: 43,
      },
    });

    await get_complaint(req, res);

    expect(getComplaintById).toHaveBeenCalledTimes(1);
    expect(getComplaintById).toHaveBeenCalledWith(43);

    expect(res.status).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith({ message: 'Complaint not found' });
  });

  it('Should return complaint', async () => {
    const req = getMockReq({
      params: {
        id: 1,
      },
    });

    mocked(getComplaintById).mockResolvedValueOnce(complaint1);

    await get_complaint(req, res);

    expect(getComplaintById).toHaveBeenCalledTimes(1);
    expect(getComplaintById).toHaveBeenCalledWith(1);

    expect(res.send).toHaveBeenCalledTimes(1);
    expect(res.send).toHaveBeenCalledWith(
      adjustNetworksOnIndividualComplaint(complaint1)
    );
  });
});
