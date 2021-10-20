<a name="top"></a>
# BitScreen API v0.1.0

Documentation of the BitScreen API

# Table of contents

- [CID](#CID)
  - [Check the override status of a CID](#Check-the-override-status-of-a-CID)
  - [Create a new CID](#Create-a-new-CID)
  - [Delete CID](#Delete-CID)
  - [Edit existing CID](#Edit-existing-CID)
  - [Get blocked CID list](#Get-blocked-CID-list)
  - [Move CID to another filter](#Move-CID-to-another-filter)
- [Complaints](#Complaints)
  - [Create a new complaint](#Create-a-new-complaint)
  - [Get complaint by ID](#Get-complaint-by-ID)
  - [Search complaints](#Search-complaints)
- [Config](#Config)
  - [Get config of provider](#Get-config-of-provider)
  - [Save config](#Save-config)
- [Deals](#Deals)
  - [Create a new deal](#Create-a-new-deal)
  - [Get deal stats](#Get-deal-stats)
- [Filters](#Filters)
  - [Create new filter](#Create-new-filter)
  - [Edit filter by id](#Edit-filter-by-id)
  - [Get filter by id](#Get-filter-by-id)
  - [Get filter count for provider](#Get-filter-count-for-provider)
  - [Get filter details by id](#Get-filter-details-by-id)
  - [Get filters dashboard](#Get-filters-dashboard)
  - [Get owned filters](#Get-owned-filters)
  - [Get public filter details by id](#Get-public-filter-details-by-id)
  - [Get public filters](#Get-public-filters)
  - [Get shared filter by id](#Get-shared-filter-by-id)
- [Provider](#Provider)
  - [Authenticate provider](#Authenticate-provider)
  - [Create provider](#Create-provider)
  - [Edit provider](#Edit-provider)
  - [Get provider data by wallet](#Get-provider-data-by-wallet)
- [ProviderFilter](#ProviderFilter)
  - [Change providerFilter status](#Change-providerFilter-status)
  - [Create providerFilter](#Create-providerFilter)
  - [Delete providerFilter](#Delete-providerFilter)
  - [Edit providerFilter](#Edit-providerFilter)

___


# <a name='CID'></a> CID

## <a name='Check-the-override-status-of-a-CID'></a> Check the override status of a CID
[Back to top](#top)

```
GET /cid/override
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| local | `Number` | <p>The local count</p> |
| remote | `Number` | <p>The remote count</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| InvalidCID |  | <p>cid is invalid</p> |
| InvalidFilter |  | <p>filter is invalid</p> |
| InvalidProvider |  | <p>provider is invalid</p> |

## <a name='Create-a-new-CID'></a> Create a new CID
[Back to top](#top)

```
POST /cid
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| cid | `Object` | <p>The saved CID object</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| BadRequest |  | <p>filterId is not set</p> |
| FilterNotFound |  | <p>filter is not found</p> |

## <a name='Delete-CID'></a> Delete CID
[Back to top](#top)

```
DELETE /cid/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>CIDs unique ID.</p> |

## <a name='Edit-existing-CID'></a> Edit existing CID
[Back to top](#top)

```
PUT /cid/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>CIDs unique ID.</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| cid | `Object` | <p>The saved CID object</p> |

## <a name='Get-blocked-CID-list'></a> Get blocked CID list
[Back to top](#top)

```
GET /blocked
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| cids | `String[]` | <p>A list of blocked CIDs</p> |

## <a name='Move-CID-to-another-filter'></a> Move CID to another filter
[Back to top](#top)

```
POST /cid/:id/move/:toFilterId
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>CIDs unique ID.</p> |
| toFilterId | `Number` | <p>Filter ID to move CID to</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| cid | `Object` | <p>The saved CID object</p> |

### Error response

#### Error response - `Error 4xx`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| CIDNotFound |  | <p>cid is not found</p> |
| FilterNotFound |  | <p>filter is not found</p> |

# <a name='Complaints'></a> Complaints

## <a name='Create-a-new-complaint'></a> Create a new complaint
[Back to top](#top)

```
POST /complaints
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| complaint | `Object` | <p>The submitted complaint</p> |

## <a name='Get-complaint-by-ID'></a> Get complaint by ID
[Back to top](#top)

```
GET /complaints/:id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| id | `Number` | <p>The unique Complaint ID</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| complaint | `Object` | <p>The complaint requested</p> |

## <a name='Search-complaints'></a> Search complaints
[Back to top](#top)

```
GET /complaints/search
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| complaints | `Object[]` | <p>The list of complaints that match the criteria</p> |

# <a name='Config'></a> Config

## <a name='Get-config-of-provider'></a> Get config of provider
[Back to top](#top)

```
GET /config/:providerId
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| providerId | `String` | <p>The ID of the provider whose config we requested</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| config | `Object` | <p>The config</p> |

## <a name='Save-config'></a> Save config
[Back to top](#top)

```
GET /config
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| config | `Object` | <p>The config</p> |

# <a name='Deals'></a> Deals

## <a name='Create-a-new-deal'></a> Create a new deal
[Back to top](#top)

```
POST /deals
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| deal | `Object` | <p>The saved Deal</p> |

## <a name='Get-deal-stats'></a> Get deal stats
[Back to top](#top)

```
GET /deals/stats/:bucketSize
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| bucketSize | `String` | <p>The bucket size</p>_Allowed values: daily,monthly,yearly_ |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| result | `Object[]` | <p>List of entries for the table</p> |

# <a name='Filters'></a> Filters

## <a name='Create-new-filter'></a> Create new filter
[Back to top](#top)

```
POST /filter
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filter | `Object` | <p>The saved filter data</p> |

## <a name='Edit-filter-by-id'></a> Edit filter by id
[Back to top](#top)

```
PUT /filter/:id
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filter | `Object` | <p>The saved filter data</p> |

## <a name='Get-filter-by-id'></a> Get filter by id
[Back to top](#top)

```
GET /filter/:_id
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| _id | `String` | <p>The unique id of the filter (autoincrement ID)</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filter | `Object` | <p>The filter data</p> |

## <a name='Get-filter-count-for-provider'></a> Get filter count for provider
[Back to top](#top)

```
GET /filter/count/:providerId
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| providerId | `String` | <p>The unique id of the provider</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| count | `Number` | <p>The filter count</p> |

## <a name='Get-filter-details-by-id'></a> Get filter details by id
[Back to top](#top)

```
GET /filter/:shareId
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| shareId | `String` | <p>The unique id of the filter</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filter | `Object` | <p>The filter data</p> |

## <a name='Get-filters-dashboard'></a> Get filters dashboard
[Back to top](#top)

```
GET /filter
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| currentlyFiltering | `Number` | <p>Number of CIDs that are actively blocked</p> |
| listSubscribers | `Number` | <p>Number of subscribers to owned lists</p> |
| dealsDeclined | `Number` | <p>Number of declined deals</p> |
| activeLists | `Number` | <p>Number of active filters</p> |
| inactiveLists | `Number` | <p>Number of inactive filters</p> |
| importedLists | `Number` | <p>Number of imported filters</p> |
| privateLists | `Number` | <p>Number of private owned filters</p> |
| publicLists | `Number` | <p>Number of public owned filters</p> |

## <a name='Get-owned-filters'></a> Get owned filters
[Back to top](#top)

```
GET /filter
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filters | `Object[]` | <p>The filter list</p> |
| count | `Number` | <p>Filter count</p> |

## <a name='Get-public-filter-details-by-id'></a> Get public filter details by id
[Back to top](#top)

```
GET /filter/public/details/:shareId
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| shareId | `String` | <p>The unique id of the filter</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filter | `Object` | <p>The filter data</p> |
| provider | `Object` | <p>The provider data</p> |
| isImported | `Boolean` | <p>If the filter is being imported by the provider or not</p> |

## <a name='Get-public-filters'></a> Get public filters
[Back to top](#top)

```
GET /filter/public
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| data | `Object[]` | <p>The filter list</p> |
| count | `Number` | <p>Filter count</p> |
| sort | `Object` | <p>Sorting that was applied</p> |
| page | `Object` | <p>Page returned</p> |
| per_page | `Object` | <p>Number of elements per page</p> |

## <a name='Get-shared-filter-by-id'></a> Get shared filter by id
[Back to top](#top)

```
GET /filter/share/:shareId
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| shareId | `String` | <p>The unique id of the filter</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filter | `Object` | <p>The filter data</p> |

# <a name='Provider'></a> Provider

## <a name='Authenticate-provider'></a> Authenticate provider
[Back to top](#top)

```
POST /provider/auth/:wallet
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| wallet | `String` | <p>The wallet to authenticate</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| provider | `Object` | <p>The provider data</p> |
| walletAddress | `String` | <p>The provider wallet</p> |
| accessToken | `String` | <p>The JWT token</p> |

## <a name='Create-provider'></a> Create provider
[Back to top](#top)

```
POST /provider
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| wallet | `Object` | <p>The provider wallet</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| provider | `Object` | <p>The provider data</p> |
| walletAddress | `String` | <p>The provider wallet</p> |

## <a name='Edit-provider'></a> Edit provider
[Back to top](#top)

```
PUT /provider
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| provider | `Object` | <p>The provider data</p> |

## <a name='Get-provider-data-by-wallet'></a> Get provider data by wallet
[Back to top](#top)

```
GET /provider/:wallet
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| wallet | `String` | <p>The wallet to authenticate</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| provider | `Object` | <p>The provider data</p> |

# <a name='ProviderFilter'></a> ProviderFilter

## <a name='Change-providerFilter-status'></a> Change providerFilter status
[Back to top](#top)

```
PUT /provider-filter/:filterId/shared/enabled
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filterId | `Number` | <p>The unique filter id</p> |

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| filter | `Object` | <p>The filter data</p> |

## <a name='Create-providerFilter'></a> Create providerFilter
[Back to top](#top)

```
POST /provider-filter
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| providerFilter | `Object` | <p>The provider filter data</p> |

## <a name='Delete-providerFilter'></a> Delete providerFilter
[Back to top](#top)

```
DELETE /provider-filter/:providerId/:filterId
```

### Parameters - `Parameter`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| providerId | `Number` | <p>The unique provider id</p> |
| filterId | `Number` | <p>The unique filter id</p> |

## <a name='Edit-providerFilter'></a> Edit providerFilter
[Back to top](#top)

```
PUT /provider-filter/:providerId/:filterId
```

### Success response

#### Success response - `Success 200`

| Name     | Type       | Description                           |
|----------|------------|---------------------------------------|
| providerFilter | `Object` | <p>The provider filter data</p> |

