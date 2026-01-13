import { TReview } from "../types/type-review.js";
import { ResponseQueryParameters } from "./get-query-parameters.js";


type TData = {
    reviews: TReview[];
} & Record<string, unknown>;

export function applyResponseOptions(data: TData, opts: ResponseQueryParameters): TData {
    let reviews = data.reviews;

    reviews = filterByRating(reviews, opts.minRating, opts.maxRating);
    reviews = limitCount(reviews, opts.count);

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

function limitCount(reviews: TReview[], count?: number) {
    if (count === undefined) {
        return reviews;
    }
    return reviews.slice(0, count);
}
