import {isArray} from "util";

export const filterFields = (objects, allowedFields) => {
    if (!isArray(objects)) {
        return [];
    }

    return objects.map(unfiltered => {
        return allowedFields.reduce((obj, key) => {
            obj[key] = unfiltered[key];
            return obj
        }, {})
    })
}
