import {Request, Response} from "express";
import {Brackets, getRepository} from "typeorm";
import {Provider} from "../entity/Provider";
import {Filter} from "../entity/Filter";
import {Cid} from "../entity/Cid";
import {Provider_Filter} from "../entity/Provider_Filter";
import {Visibility} from "../entity/enums";
import {Deal, DealStatus} from "../entity/Deal";
import {generateRandomToken} from "../service/crypto";
import {
    addFilteringToFilterQuery,
    addPagingToFilterQuery,
    addSortingToFilterQuery,
    getDeclinedDealsCount, getFilterById,
    getFilterByShareId,
    getFiltersPaged, getOwnedFilterById,
    getOwnedFiltersBaseQuery, getPublicFilterDetailsBaseQuery,
    getPublicFiltersBaseQuery
} from "../service/filter.service";
import {getProviderFilterCount} from "../service/provider_filter.service";

export const get_filter_count = async (request: Request, response: Response) => {
    const { params } = request;
    const providerId = params.providerId;
    if (!providerId) {
        return response.status(400).send({
            message: 'Invalid provider id!',
        });
    }

    const provider = await getRepository(Provider).findOne(providerId);

    if (!provider) {
        return response.status(404).send({
            message: 'Provider not found!',
        });
    }

    const count = await getOwnedFiltersBaseQuery(provider.id).getCount().catch((err) => {
        return response.status(400).send(JSON.stringify(err));
    });

    return response.send({
        count,
    });
}

export const get_public_filters = async (request: Request, response: Response) => {
    const { query } = request;
    const page = parseInt((query.page as string) || '0');
    const per_page = parseInt((query.per_page as string) || '5');
    const q = query.q as string;
    const sort = JSON.parse((query.sort as string) || '{}');
    const providerId = query.providerId;

    const alias = 'filter';

    const baseQuery = getPublicFiltersBaseQuery(alias, providerId)

    const params = {
        q: `%${q}%`,
    };

    const withFiltering = !q
        ? baseQuery
        : addFilteringToFilterQuery(alias, baseQuery, params)

    const count = await withFiltering.getCount().catch((err) => {
        response.status(400).send(JSON.stringify(err));
    });

    const withSorting =
        !sort || !Object.keys(sort).length
            ? withFiltering
            : addSortingToFilterQuery(alias, withFiltering, sort)

    const withPaging = addPagingToFilterQuery(alias, withSorting, page, per_page)

    const filters = await withPaging
        .loadAllRelationIds({ relations: ['provider_Filters', 'cids'] })
        .getRawAndEntities()
        .catch((err) => {
            response.status(400).end(err);
        });

    if (!filters) {
        return response.send({ data: [], sort, page, per_page, count });
    }

    const data = filters.entities.map(
        ({ provider_Filters, cids, provider, ...f }, idx) => ({
            ...f,
            isImported: !!parseInt(filters.raw[idx].isImported),
            cids: cids.length,
            subs: provider_Filters.length,
            provider,
            providerId: provider.id,
            providerName: provider.businessName,
            providerCountry: provider.country,
        })
    );

    return response.send({ data, sort, page, per_page, count });
}

export const get_public_filter_details = async (req: Request, res: Response) => {
    const shareId = req.params.shareId;
    const providerId = req.query.providerId;

    const data = await getPublicFilterDetailsBaseQuery(shareId, providerId)
        .loadAllRelationIds()
        .getRawAndEntities();

    if (!data) {
        return res
            .status(404)
            .send({ message: `Cannot find filter with shareId ${shareId}` });
    }

    const filter = data.entities[0];

    const provider = await getRepository(Provider).findOne(filter.provider)

    return res.send({
        filter,
        provider,
        isImported: !!parseInt(data.raw[0].isImported),
    });
}

export const get_owned_filters = async (req, res) => {
    const { query } = req;
    const page = parseInt((query.page as string) || '0');
    const per_page = parseInt((query.perPage as string) || '5');
    const sort = JSON.parse((query.sort as string) || '{}');
    let q = query.q;
    let providerId = query.providerId;

    if (!providerId) {
        return res.status(400).send({ message: 'providerId must be provided' });
    }

    providerId = providerId.toString();

    q = q ? `%${q.toString().toLowerCase()}%` : q;

    const { filters, count } = await getFiltersPaged({
        providerId,
        q,
        sort,
        page,
        per_page,
    });

    res.send({ filters, count });
}

export const get_filter_dashboard = async (req, res) => {
    const { query } = req;
    const page = parseInt((query.page as string) || '0');
    const per_page = parseInt((query.perPage as string) || '5');
    const sort = JSON.parse((query.sort as string) || '{}');
    let q = query.q;
    let providerId = query.providerId as string;

    if (!providerId) {
        return res.status(400).send({ message: 'providerId must be provided' });
    }

    providerId = providerId.toString();

    q = q ? `%${q.toString().toLowerCase()}%` : q;

    const { filters, count } = await getFiltersPaged({
        providerId,
        q,
        sort,
        page,
        per_page,
    });

    const dealsDeclined = await getDeclinedDealsCount(providerId)

    let currentlyFiltering = 0;
    let listSubscribers = 0;
    let activeLists = 0;
    let inactiveLists = 0;
    let importedLists = 0;
    let privateLists = 0;
    let publicLists = 0;

    filters.forEach((filter) => {
        if (filter.enabled) {
            currentlyFiltering += filter.cidsCount;
            activeLists += 1;
        }

        if (filter.provider_Filters.length > 0) {
            listSubscribers += filter.provider_Filters.length - 1;
        }

        if (filter.provider.id !== parseInt(providerId)) {
            importedLists += 1;
        }

        if (filter.visibility === Visibility.Private) {
            privateLists += 1;
        }

        if (filter.visibility === Visibility.Public) {
            publicLists += 1;
        }
    });

    inactiveLists = count - activeLists;

    res.send({
        currentlyFiltering,
        listSubscribers,
        dealsDeclined,
        activeLists,
        inactiveLists,
        importedLists,
        privateLists,
        publicLists,
    });
}

export const get_filter = async (request: Request, response: Response) => {
    const shareId = request.params.shareId;
    const providerId = request.query.providerId.toString();

    const f = await getRepository(Filter).findOne(
        {
            shareId,
        },
        {
            relations: [
                'cids',
                'provider',
                'provider_Filters',
                'provider_Filters.provider',
            ],
        }
    );

    if (!f) {
        response.status(404).send({message: 'Filter not found.'});
    }

    const pf = f.provider_Filters.filter((pf) => {
        return pf.provider.id.toString() === providerId;
    })[0];
    const filter = { ...f, enabled: pf.active };

    response.send(filter);
}

export const get_shared_filter = async (request: Request, response: Response) => {
    const shareId = request.params.shareId as string;
    const providerId = request.query.providerId;

    switch (true) {
        case !shareId:
            return response
                .status(400)
                .send({ message: 'ShareId must be provided' });
        case !providerId:
            return response
                .status(400)
                .send({ message: 'ProviderId must be provided' });
    }

    const filter = await getFilterByShareId(shareId, providerId)

    if (!filter) {
        return response
            .status(404)
            .send({ message: `Cannot find filter with id ${shareId}` });
    }

    const providerFilter = await getProviderFilterCount(providerId, filter.id)

    if (providerFilter) {
        return response
            .status(404)
            .send({ message: `Cannot import filter because you already have it` });
    }

    return response.send(filter);
}

export const get_filter_by_id = async (request: Request, response: Response) => {
    const {
        query: { providerId },
    } = request;

    const {
        params: { _id },
    } = request;

    if (!providerId) {
        return response.status(400).send({
            message: 'Please provide providerId',
        });
    }

    const id = _id as string;

    if (!id) {
        return response.status(404).send({
            message: 'Filter not found',
        });
    }

    const ownedFilter = await getOwnedFilterById(id, providerId)

    if (ownedFilter) {
        return response.send(ownedFilter);
    }

    const otherFilter = await getFilterById(id)

    if (!otherFilter) {
        return response.status(404).send({
            message: 'Filter not found',
        });
    }

    response.send(otherFilter);
}

export const edit_filter = async (req, res) => {
    const {
        body: {
            updated,
            created,
            cids,
            notes,
            isBulkSelected,
            cidsCount,
            provider_Filters,
            provider,
            ...updatedFilter
        },
        params: { id },
    } = req;

    if (!id) {
        return res
            .status(400)
            .send({ message: 'Please provide and ID for the filter to be updated' });
    }

    const _id = id as string;

    await getRepository(Filter).update(_id, updatedFilter);

    res.send(await getRepository(Filter).findOne(_id));
}

export const create_filter = async (request: Request, response: Response) => {
    const data = request.body;
    if (typeof data.providerId !== 'number') {
        return response
            .status(400)
            .send({ message: 'Please provide a providerId.' });
    }

    const provider = await getRepository(Provider).findOne(data.providerId);

    if (!provider) {
        return response.status(404).send({});
    }

    const filter = new Filter();

    filter.name = data.name;
    filter.description = data.description;
    filter.override = data.override;
    filter.visibility = data.visibility;
    filter.provider = provider;
    filter.enabled = data.enabled;

    // generate shareId
    let shareId: string, existing: Filter;
    do {
        shareId = await generateRandomToken(4);
        existing = await getRepository(Filter).findOne({
            shareId,
        });
    } while (existing);

    filter.shareId = shareId;

    await getRepository(Filter).save(filter);

    await Promise.all(
        data.cids.map((x) => {
            const cid = new Cid();

            cid.cid = x.cid;
            cid.refUrl = x.refUrl;
            cid.filter = filter;

            return getRepository(Cid).save(cid);
        })
    );

    response.send(filter);
}
