import {getMockReq, getMockRes} from "@jest-mock/express";
import {getRepository} from "typeorm";
import {
    get_filter_count,
    get_owned_filters,
    get_public_filter_details,
    get_public_filters
} from "../../src/controllers/filter.controller";
import {mocked} from "ts-jest/utils";
import {
    addFilteringToFilterQuery,
    addPagingToFilterQuery, addSortingToFilterQuery, getFiltersPaged,
    getOwnedFiltersBaseQuery, getPublicFilterDetailsBaseQuery,
    getPublicFiltersBaseQuery
} from "../../src/service/filter.service";
import {Filter} from "../../src/entity/Filter";
import {Provider} from "../../src/entity/Provider";
import {Provider_Filter} from "../../src/entity/Provider_Filter";
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
        OneToOne: jest.fn(),
        Unique: jest.fn(),
        JoinColumn: jest.fn()
    }
})

jest.mock("../../src/service/filter.service")

describe("Filter Controller: GET /filter/count/:providerId", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error on missing providerId", async () => {
        const req = getMockReq()

        await get_filter_count(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({message: "Invalid provider id!"})
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
        mocked(getRepository).mockReturnValueOnce(providerRepo)

        await get_filter_count(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({message: "Provider not found!"})
    })

    it("Should return the filter count", async () => {
        const req = getMockReq({
            params: {
                providerId: 1
            }
        })

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce({id: 1})
        }

        const baseQuery = {
            getCount: jest.fn().mockResolvedValueOnce(123)
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(providerRepo)
        // @ts-ignore
        mocked(getOwnedFiltersBaseQuery).mockReturnValueOnce(baseQuery)

        await get_filter_count(req, res)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({count: 123})
    })
})

describe("Filter Controller: GET /filter/public", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should return empty response without sorting and filtering", async () => {
        const req = getMockReq({
            query: {
                providerId: 43
            }
        })

        const baseQuery = {
            getCount: jest.fn().mockResolvedValueOnce(123),
            loadAllRelationIds: jest.fn(),
            getRawAndEntities: jest.fn()
        }

        // @ts-ignore
        mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery)
        // @ts-ignore
        mocked(addPagingToFilterQuery).mockReturnValueOnce(baseQuery)
        mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery)
        mocked(baseQuery.getRawAndEntities).mockResolvedValueOnce(null)

        await get_public_filters(req, res)

        expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1)
        expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('filter', 43)
        expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(0)
        expect(baseQuery.getCount).toHaveBeenCalledTimes(1)
        expect(addSortingToFilterQuery).toHaveBeenCalledTimes(0)
        expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1)
        expect(addPagingToFilterQuery).toHaveBeenCalledWith('filter', baseQuery, 0, 5)
        expect(baseQuery.loadAllRelationIds).toHaveBeenCalledTimes(1)
        expect(baseQuery.loadAllRelationIds).toHaveBeenCalledWith({relations: ['provider_Filters', 'cids']})
        expect(baseQuery.getRawAndEntities).toHaveBeenCalledTimes(1)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            data: [],
            sort: {},
            page: 0,
            per_page: 5,
            count: 123
        })
    })

    it("Should return empty response without sorting and filtering, custom page settings", async () => {
        const req = getMockReq({
            query: {
                providerId: 43,
                page: 4678,
                per_page: 921
            }
        })

        const baseQuery = {
            getCount: jest.fn().mockResolvedValueOnce(123),
            loadAllRelationIds: jest.fn(),
            getRawAndEntities: jest.fn()
        }

        // @ts-ignore
        mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery)
        // @ts-ignore
        mocked(addPagingToFilterQuery).mockReturnValueOnce(baseQuery)
        mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery)
        mocked(baseQuery.getRawAndEntities).mockResolvedValueOnce(null)

        await get_public_filters(req, res)

        expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1)
        expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('filter', 43)
        expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(0)
        expect(baseQuery.getCount).toHaveBeenCalledTimes(1)
        expect(addSortingToFilterQuery).toHaveBeenCalledTimes(0)
        expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1)
        expect(addPagingToFilterQuery).toHaveBeenCalledWith('filter', baseQuery, 4678, 921)
        expect(baseQuery.loadAllRelationIds).toHaveBeenCalledTimes(1)
        expect(baseQuery.loadAllRelationIds).toHaveBeenCalledWith({relations: ['provider_Filters', 'cids']})
        expect(baseQuery.getRawAndEntities).toHaveBeenCalledTimes(1)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            data: [],
            sort: {},
            page: 4678,
            per_page: 921,
            count: 123
        })
    })

    it("Should return empty response with filtering, without sorting", async () => {
        const req = getMockReq({
            query: {
                providerId: 43,
                q: 'someString'
            }
        })

        const baseQuery = {
            something: true
        }

        const filterQuery = {
            getCount: jest.fn().mockResolvedValueOnce(123),
            loadAllRelationIds: jest.fn(),
            getRawAndEntities: jest.fn()
        }

        // @ts-ignore
        mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery)
        // @ts-ignore
        mocked(addFilteringToFilterQuery).mockReturnValueOnce(filterQuery)
        // @ts-ignore
        mocked(addPagingToFilterQuery).mockReturnValueOnce(filterQuery)
        mocked(filterQuery.loadAllRelationIds).mockReturnValueOnce(filterQuery)
        mocked(filterQuery.getRawAndEntities).mockResolvedValueOnce(null)

        await get_public_filters(req, res)

        expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1)
        expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('filter', 43)
        expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(1)
        expect(addFilteringToFilterQuery).toHaveBeenCalledWith('filter', baseQuery, {q: '%someString%'})
        expect(filterQuery.getCount).toHaveBeenCalledTimes(1)
        expect(addSortingToFilterQuery).toHaveBeenCalledTimes(0)
        expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1)
        expect(addPagingToFilterQuery).toHaveBeenCalledWith('filter', filterQuery, 0, 5)
        expect(filterQuery.loadAllRelationIds).toHaveBeenCalledTimes(1)
        expect(filterQuery.loadAllRelationIds).toHaveBeenCalledWith({relations: ['provider_Filters', 'cids']})
        expect(filterQuery.getRawAndEntities).toHaveBeenCalledTimes(1)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            data: [],
            sort: {},
            page: 0,
            per_page: 5,
            count: 123
        })
    })

    it("Should return empty response with filtering, with sorting", async () => {
        const req = getMockReq({
            query: {
                providerId: 43,
                q: 'someString',
                sort: '{"name": "asc"}'
            }
        })

        const baseQuery = {
            something: true
        }

        const filterQuery = {
            getCount: jest.fn().mockResolvedValueOnce(123),
        }

        const sortQuery = {
            loadAllRelationIds: jest.fn(),
            getRawAndEntities: jest.fn()
        }

        // @ts-ignore
        mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery)
        // @ts-ignore
        mocked(addFilteringToFilterQuery).mockReturnValueOnce(filterQuery)
        // @ts-ignore
        mocked(addSortingToFilterQuery).mockReturnValueOnce(sortQuery)
        // @ts-ignore
        mocked(addPagingToFilterQuery).mockReturnValueOnce(sortQuery)
        mocked(sortQuery.loadAllRelationIds).mockReturnValueOnce(sortQuery)
        mocked(sortQuery.getRawAndEntities).mockResolvedValueOnce(null)

        await get_public_filters(req, res)

        expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1)
        expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('filter', 43)
        expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(1)
        expect(addFilteringToFilterQuery).toHaveBeenCalledWith('filter', baseQuery, {q: '%someString%'})
        expect(filterQuery.getCount).toHaveBeenCalledTimes(1)
        expect(addSortingToFilterQuery).toHaveBeenCalledTimes(1)
        expect(addSortingToFilterQuery).toHaveBeenCalledWith('filter', filterQuery, {name: 'asc'})
        expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1)
        expect(addPagingToFilterQuery).toHaveBeenCalledWith('filter', sortQuery, 0, 5)
        expect(sortQuery.loadAllRelationIds).toHaveBeenCalledTimes(1)
        expect(sortQuery.loadAllRelationIds).toHaveBeenCalledWith({relations: ['provider_Filters', 'cids']})
        expect(sortQuery.getRawAndEntities).toHaveBeenCalledTimes(1)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            data: [],
            sort: {name: 'asc'},
            page: 0,
            per_page: 5,
            count: 123
        })
    })

    it("Should parsed data", async () => {
        const req = getMockReq({
            query: {
                providerId: 43
            }
        })

        const baseQuery = {
            getCount: jest.fn().mockResolvedValueOnce(123),
            loadAllRelationIds: jest.fn(),
            getRawAndEntities: jest.fn()
        }

        const firstFilter = new Filter()
        firstFilter.id = 16
        firstFilter.provider_Filters = [new Provider_Filter(), new Provider_Filter()]
        firstFilter.cids = [new Cid(), new Cid(), new Cid()]
        firstFilter.provider = new Provider()
        firstFilter.provider.id = 43
        firstFilter.provider.businessName = 'Test Business'
        firstFilter.provider.country = 'Germany'
        firstFilter.description = 'test'

        const secondFilter = new Filter()
        secondFilter.id = 17
        secondFilter.provider_Filters = [new Provider_Filter()]
        secondFilter.cids = [new Cid(), new Cid()]
        secondFilter.provider = new Provider()
        secondFilter.provider.id = 44
        secondFilter.provider.businessName = 'Test Business 2'
        secondFilter.provider.country = 'Romania'
        secondFilter.description = 'test2'

        const filters = {
            raw: [{isImported: '0'}, {isImported: '1'}],
            entities: [
                firstFilter,
                secondFilter
            ]
        }

        // @ts-ignore
        mocked(getPublicFiltersBaseQuery).mockReturnValueOnce(baseQuery)
        // @ts-ignore
        mocked(addPagingToFilterQuery).mockReturnValueOnce(baseQuery)
        mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery)
        mocked(baseQuery.getRawAndEntities).mockResolvedValueOnce(filters)

        await get_public_filters(req, res)

        expect(getPublicFiltersBaseQuery).toHaveBeenCalledTimes(1)
        expect(getPublicFiltersBaseQuery).toHaveBeenCalledWith('filter', 43)
        expect(addFilteringToFilterQuery).toHaveBeenCalledTimes(0)
        expect(baseQuery.getCount).toHaveBeenCalledTimes(1)
        expect(addSortingToFilterQuery).toHaveBeenCalledTimes(0)
        expect(addPagingToFilterQuery).toHaveBeenCalledTimes(1)
        expect(addPagingToFilterQuery).toHaveBeenCalledWith('filter', baseQuery, 0, 5)
        expect(baseQuery.loadAllRelationIds).toHaveBeenCalledTimes(1)
        expect(baseQuery.loadAllRelationIds).toHaveBeenCalledWith({relations: ['provider_Filters', 'cids']})
        expect(baseQuery.getRawAndEntities).toHaveBeenCalledTimes(1)

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            data: [
                {
                    id: 16,
                    isImported: false,
                    cids: 3,
                    subs: 2,
                    provider: firstFilter.provider,
                    providerId: 43,
                    providerName: 'Test Business',
                    providerCountry: 'Germany',
                    description: 'test'
                },
                {
                    id: 17,
                    isImported: true,
                    cids: 2,
                    subs: 1,
                    provider: secondFilter.provider,
                    providerId: 44,
                    providerName: 'Test Business 2',
                    providerCountry: 'Romania',
                    description: 'test2'
                }
            ],
            sort: {},
            page: 0,
            per_page: 5,
            count: 123
        })
    })
})

describe("Filter Controller: GET /filter/public/details/:shareId", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error on missing data", async () => {
        const req = getMockReq({
            query: {
                providerId: 43
            },
            params: {
                shareId: 'asdf-ghjk'
            }
        })

        const baseQuery = {
            loadAllRelationIds: jest.fn(),
            getRawAndEntities: jest.fn()
        }

        // @ts-ignore
        mocked(getPublicFilterDetailsBaseQuery).mockReturnValueOnce(baseQuery)
        // @ts-ignore
        mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery)
        mocked(baseQuery.getRawAndEntities).mockReturnValueOnce(null)

        await get_public_filter_details(req, res)

        expect(getPublicFilterDetailsBaseQuery).toHaveBeenCalledTimes(1)
        expect(getPublicFilterDetailsBaseQuery).toHaveBeenCalledWith('asdf-ghjk', 43)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(404)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({message: 'Cannot find filter with shareId asdf-ghjk'})
    })

    it("Should return public filter details", async () => {
        const req = getMockReq({
            query: {
                providerId: 43
            },
            params: {
                shareId: 'asdf-ghjk'
            }
        })

        const baseQuery = {
            loadAllRelationIds: jest.fn(),
            getRawAndEntities: jest.fn()
        }

        const provider = new Provider()
        provider.id = 32;

        const filter = new Filter()
        filter.id = 87
        filter.provider = provider

        const providerRepo = {
            findOne: jest.fn().mockResolvedValueOnce(provider)
        }

        // @ts-ignore
        mocked(getRepository).mockReturnValueOnce(providerRepo)
        // @ts-ignore
        mocked(getPublicFilterDetailsBaseQuery).mockReturnValueOnce(baseQuery)
        // @ts-ignore
        mocked(baseQuery.loadAllRelationIds).mockReturnValueOnce(baseQuery)
        mocked(baseQuery.getRawAndEntities).mockReturnValueOnce({entities: [filter], raw: [{isImported: '0'}]})

        await get_public_filter_details(req, res)

        expect(getPublicFilterDetailsBaseQuery).toHaveBeenCalledTimes(1)
        expect(getPublicFilterDetailsBaseQuery).toHaveBeenCalledWith('asdf-ghjk', 43)
        expect(getRepository).toHaveBeenCalledTimes(1)
        expect(getRepository).toHaveBeenCalledWith(Provider)
        expect(providerRepo.findOne).toHaveBeenCalledTimes(1)
        expect(providerRepo.findOne).toHaveBeenCalledWith({id: 32})

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            filter: filter,
            provider: provider,
            isImported: false
        })
    })
})

describe("Filter Controller: GET /filter", () => {
    beforeEach(() => {
        mockClear()
        jest.clearAllMocks()
    })

    it("Should throw error for missing providerId", async () => {
        const req = getMockReq()

        get_owned_filters(req, res)

        expect(res.status).toHaveBeenCalledTimes(1)
        expect(res.status).toHaveBeenCalledWith(400)
        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({message: 'providerId must be provided'})
    })

    it("Should return filters, without q, default values", async () => {
        const req = getMockReq({
            query: {
                providerId: 43
            }
        })

        const filter = new Filter()
        filter.id = 23

        const filterItem = {
            ...filter,
            cidsCount: 10
        }

        mocked(getFiltersPaged).mockResolvedValueOnce({filters: [filterItem], count: 1})

        await get_owned_filters(req, res)

        expect(getFiltersPaged).toHaveBeenCalledTimes(1)
        expect(getFiltersPaged).toHaveBeenCalledWith({
            providerId: '43',
            q: undefined,
            sort: {},
            page: 0,
            per_page: 5
        })

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            filters: [filterItem],
            count: 1
        })
    })

    it("Should return filters, with q, default values", async () => {
        const req = getMockReq({
            query: {
                providerId: 43,
                q: 'tESt'
            }
        })

        const filter = new Filter()
        filter.id = 23

        const filterItem = {
            ...filter,
            cidsCount: 10
        }

        mocked(getFiltersPaged).mockResolvedValueOnce({filters: [filterItem], count: 1})

        await get_owned_filters(req, res)

        expect(getFiltersPaged).toHaveBeenCalledTimes(1)
        expect(getFiltersPaged).toHaveBeenCalledWith({
            providerId: '43',
            q: '%test%',
            sort: {},
            page: 0,
            per_page: 5
        })

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            filters: [filterItem],
            count: 1
        })
    })

    it("Should return filters, with q, custom values", async () => {
        const req = getMockReq({
            query: {
                providerId: 43,
                q: 'tESt',
                page: 213,
                perPage: 15,
                sort: '{"name": "asc"}'
            }
        })

        const filter = new Filter()
        filter.id = 23

        const filterItem = {
            ...filter,
            cidsCount: 10
        }

        mocked(getFiltersPaged).mockResolvedValueOnce({filters: [filterItem], count: 1})

        await get_owned_filters(req, res)

        expect(getFiltersPaged).toHaveBeenCalledTimes(1)
        expect(getFiltersPaged).toHaveBeenCalledWith({
            providerId: '43',
            q: '%test%',
            sort: {name: 'asc'},
            page: 213,
            per_page: 15
        })

        expect(res.send).toHaveBeenCalledTimes(1)
        expect(res.send).toHaveBeenCalledWith({
            filters: [filterItem],
            count: 1
        })
    })
})
