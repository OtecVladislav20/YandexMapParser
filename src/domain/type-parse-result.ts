import type { TReview } from "./type-review.js";


export type TParseResult = {
    name: string | null;
    rating: string | null;
    count_reviews: string | null;
    reviews: TReview[];
};
