import {DealType} from "../entity/Deal";
import {BucketSize} from "../controllers/deal.controller";

export const fillDates = (existing, type, start?, end?) => {
    if (!start) {
        start = Object.keys(existing)[0];
    }

    if (!end) {
        end = new Date();
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    let allDates = {};
    switch(type) {
        case BucketSize.Daily:
            allDates = getDays(startDate, endDate);
            break;
        case BucketSize.Monthly:
            allDates = getMonths(startDate, endDate);
            break;
        case BucketSize.Yearly:
            allDates = getYears(startDate, endDate);
            break;
    }

    existing = {
        ...allDates,
        ...existing
    };

    return existing;
}

const getDays = (start: Date, end: Date) => {
    let result = {};
    for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        const key = d.getFullYear()+'-'+("0" + (d.getMonth() + 1)).slice(-2)+'-'+("0" + d.getDate()).slice(-2);
        result[key] = {
            'unique_count': 0,
            'total_count': 0,
            'key': key,
        };
    }

    return result;
}

const getMonths = (start: Date, end: Date) => {
    let result = {};
    for (let d = start; d <= end; d.setMonth(d.getMonth() + 1)) {
        const key = d.getFullYear()+'-'+("0" + (d.getMonth() + 1)).slice(-2);
        result[key] = {
            'unique_count': 0,
            'total_count': 0,
            'key': key,
        };
    }

    return result;
}

const getYears = (start: Date, end: Date) => {
    let result = {};
    for (let d = start; d <= end; d.setFullYear(d.getFullYear() + 1)) {
        const key = d.getFullYear();
        result[key] = {
            'unique_count': 0,
            'total_count': 0,
            'key': key,
        };
    }

    return result;
}
