import { TReview } from "../types/type-review.js";
import { ResponseQueryParameters } from "./get-query-parameters.js";
import { QueryParam } from "./query-parameters.js";


type TData = {
    reviews: TReview[];
} & Record<string, unknown>;

export function applyResponseOptions(data: TData, opts: ResponseQueryParameters): TData {
    let reviews = data.reviews;

    reviews = filterByRating(reviews, opts[QueryParam.MinRating], opts[QueryParam.MaxRating]);
    reviews = filterByDate(reviews, opts[QueryParam.DateStart], opts[QueryParam.DateEnd]);
    reviews = filterByCount(reviews, opts[QueryParam.Count]);

    return { ...data, reviews };
}

function filterByRating(reviews: TReview[], minRating?: number, maxRating?: number) {
    if (minRating !== undefined || maxRating !== undefined) {
        const min = minRating ?? 1;
        const max = maxRating ?? 5;
        return reviews.filter((r) => r.rating !== null && r.rating >= min && r.rating <= max);
    }
    
    return reviews;
}

function filterByDate(reviews: TReview[], dateStart?: string, dateEnd?: string) {
    if (!dateStart && !dateEnd) return reviews;

    return reviews.filter((r) => {
        if (!r.date) return false;
        if (dateStart && r.date < dateStart) return false;
        if (dateEnd && r.date > dateEnd) return false;
        return true;
    });
}


function filterByCount(reviews: TReview[], count?: number) {
    if (count === undefined) {
        return reviews;
    }
    return reviews.slice(0, count);
}
