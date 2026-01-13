import { TReview } from "../types/type-review.js";
import { ResponseQueryParameters } from "./get-query-parameters.js";


type TData = {
    reviews: TReview[];
} & Record<string, unknown>;

export function applyResponseOptions(data: TData, opts: ResponseQueryParameters): TData {
    let reviews = data.reviews;

    if (opts.minRating !== undefined || opts.maxRating !== undefined) {
        const min = opts.minRating ?? 1;
        const max = opts.maxRating ?? 5;
        
        reviews = reviews.filter((r) => r.rating !== null && r.rating >= min && r.rating <= max);
    }

    if (opts.count !== undefined) {
        reviews = reviews.slice(0, opts.count);
    }

    return { ...data, reviews };
}
