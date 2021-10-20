import * as express from 'express';
import { verifyAccessToken } from '../service/jwt';
import {
    create_filter, edit_filter, get_filter, get_filter_by_id,
    get_filter_count, get_filter_dashboard, get_owned_filters,
    get_public_filter_details,
    get_public_filters, get_shared_filter
} from "../controllers/filter.controller";

const filterRouter = express.Router();

/**
 * @api {get} /filter/count/:providerId Get filter count for provider
 * @apiName GetFilterCount
 * @apiGroup Filters
 *
 * @apiParam {String} providerId The unique id of the provider
 *
 * @apiSuccess {Number} count The filter count
 */
filterRouter.get('/count/:providerId', verifyAccessToken, get_filter_count);

/**
 * @api {get} /filter/public Get public filters
 * @apiName GetPublicFilters
 * @apiGroup Filters
 *
 * @apiQuery {Number} providerId The provider for which to search
 * @apiQuery {Number} [page=0] The page number to return
 * @apiQuery {Number} [per_page=5] The number of filters per page
 * @apiQuery {String} [q=''] Search criteria
 * @apiQuery {Object} [sort={}] Fields to sort by and their order (asc/desc)
 *
 * @apiSuccess {Object[]} data The filter list
 * @apiSuccess {Number} count Filter count
 * @apiSuccess {Object} sort Sorting that was applied
 * @apiSuccess {Object} page Page returned
 * @apiSuccess {Object} per_page Number of elements per page
 */
filterRouter.get('/public', verifyAccessToken, get_public_filters);

/**
 * @api {get} /filter/public/details/:shareId Get public filter details by id
 * @apiName GetPublicFilterDetails
 * @apiGroup Filters
 *
 * @apiParam {String} shareId The unique id of the filter
 * @apiQuery {String} providerId The unique id of the provider
 *
 * @apiSuccess {Object} filter The filter data
 * @apiSuccess {Object} provider The provider data
 * @apiSuccess {Boolean} isImported If the filter is being imported by the provider or not
 */
filterRouter.get('/public/details/:shareId', verifyAccessToken, get_public_filter_details);

/**
 * @api {get} /filter Get owned filters
 * @apiName GetFilters
 * @apiGroup Filters
 *
 * @apiQuery {Number} providerId The provider for which to search
 * @apiQuery {Number} [page=0] The page number to return
 * @apiQuery {Number} [per_page=5] The number of filters per page
 * @apiQuery {String} [q=''] Search criteria
 * @apiQuery {Object} [sort={}] Fields to sort by and their order (asc/desc)
 *
 * @apiSuccess {Object[]} filters The filter list
 * @apiSuccess {Number} count Filter count
 */
filterRouter.get('/', get_owned_filters);

/**
 * @api {get} /filter Get filters dashboard
 * @apiName GetFilterDashboard
 * @apiGroup Filters
 *
 * @apiQuery {Number} providerId The provider for which to search
 * @apiQuery {Number} [page=0] The page number to return
 * @apiQuery {Number} [per_page=5] The number of filters per page
 * @apiQuery {String} [q=''] Search criteria
 * @apiQuery {Object} [sort={}] Fields to sort by and their order (asc/desc)
 *
 * @apiSuccess {Number} currentlyFiltering Number of CIDs that are actively blocked
 * @apiSuccess {Number} listSubscribers Number of subscribers to owned lists
 * @apiSuccess {Number} dealsDeclined Number of declined deals
 * @apiSuccess {Number} activeLists Number of active filters
 * @apiSuccess {Number} inactiveLists Number of inactive filters
 * @apiSuccess {Number} importedLists Number of imported filters
 * @apiSuccess {Number} privateLists Number of private owned filters
 * @apiSuccess {Number} publicLists Number of public owned filters
 */
filterRouter.get('/dashboard', get_filter_dashboard);

/**
 * @api {get} /filter/:shareId Get filter details by id
 * @apiName GetFilterDetails
 * @apiGroup Filters
 *
 * @apiParam {String} shareId The unique id of the filter
 * @apiQuery {String} providerId The unique id of the provider
 *
 * @apiSuccess {Object} filter The filter data
 */
filterRouter.get('/:shareId', verifyAccessToken, get_filter);

/**
 * @api {get} /filter/share/:shareId Get shared filter by id
 * @apiName GetSharedFilter
 * @apiGroup Filters
 *
 * @apiParam {String} shareId The unique id of the filter
 * @apiQuery {String} providerId The unique id of the provider
 *
 * @apiSuccess {Object} filter The filter data
 */
filterRouter.get('/share/:shareId', verifyAccessToken, get_shared_filter);

/**
 * @api {get} /filter/:_id Get filter by id
 * @apiName GetFilterById
 * @apiGroup Filters
 *
 * @apiParam {String} _id The unique id of the filter (autoincrement ID)
 * @apiQuery {String} providerId The unique id of the provider
 *
 * @apiSuccess {Object} filter The filter data
 */
filterRouter.get('/:_id', verifyAccessToken, get_filter_by_id);

/**
 * @api {put} /filter/:id Edit filter by id
 * @apiName EditFilter
 * @apiGroup Filters
 *
 * @apiBody {Object} updatedFilter The filter data to update
 *
 * @apiSuccess {Object} filter The saved filter data
 */
filterRouter.put('/:id', verifyAccessToken, edit_filter);

/**
 * @api {post} /filter Create new filter
 * @apiName CreateFilter
 * @apiGroup Filters
 *
 * @apiBody {Object} filter The filter data to save
 *
 * @apiSuccess {Object} filter The saved filter data
 */
filterRouter.post('/', verifyAccessToken, create_filter);

export default filterRouter;
