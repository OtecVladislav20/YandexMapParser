import { By, WebElement } from "selenium-webdriver";
import { withDriver } from "../../selenium.js";
import { AbstractParser } from "../parser-abstarct.js";
import { logger } from "../../logger.js";
import { TReview } from "../../types/type-review.js";
import { normalizeYandexDate } from "../../utils/normalize-date-review.js";
import { Yandex } from "./const-yandex.js";


class YandexParser extends AbstractParser {
    async getName() {
        return await this.getNameText(By.css(Yandex.name));
    }

    async getRating() {
        try {
            const root = await this.waitLocated(By.css(Yandex.ratingContainer), 8000);
            const spans = await root.findElements(By.css(Yandex.ratingText));
            const parts = await Promise.all(spans.map(s => s.getAttribute("textContent")));
            const merged = parts.map(p => (p ?? "").trim()).join("");
            return merged.length ? merged : null;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Ошибка получения рейтинга");
            return null;
        }
    }

    async getCountReviews() {
	  	return await this.getCountReviewsText(By.css(Yandex.countReviews));
	}

    async getReviews() {
        let reviewsContainer = await this.waitLocated(By.css(Yandex.reviewsContainer), 10000);
      
        const seen = new Set<string>();
        const reviews: TReview[] = [];
      
        while (reviews.length < AbstractParser.REVIEW_LIMIT) {
            const cards = await reviewsContainer.findElements(By.css(Yandex.reviewCard));

            for (const card of cards) {
                if (reviews.length >= AbstractParser.REVIEW_LIMIT) break;
                await this.parseReviewCard(card, seen, reviews);
            }

            if (cards.length < 50) break;

            const progressed = await this.scrollToNextBatch(reviewsContainer, cards[cards.length - 1]);
            if (!progressed) break;
        }

        logger.info({ kind: "yandex", reviewsCount: reviews.length }, "Собрано отзывов с Яндекса");
        return reviews;
    }

    private async parseReviewCard(card: WebElement, seen: Set<string>, reviews: TReview[]) {
        let block: WebElement | null = null;
        let reviewerName: string | null = null;
        let text: string | null = null;
        let rating: number | null = null;
        let avatar: string | null = null;
        let date: string | null = null;
        
        const pos = await card.getAttribute("aria-posinset");
        if (!pos || seen.has(pos)) return false;
        seen.add(pos);

        try {
            block = await card.findElement(By.css(Yandex.review));
        } catch {
            return false;
        }
          
        try {
            reviewerName = await this.tryChildText(block, By.css(Yandex.author));
        } catch {
            logger.warn("Не удалось получить имя ревьювера");
        }
          
        await this.maybeExpandReview(block);

        try {
            text = await this.tryChildTextContent(block, By.css(Yandex.text));
        } catch {
            logger.warn("Не удалось получить текст отзыва");
        }
          
        try {
            rating = (await block.findElements(By.css(Yandex.reviewRating))).length;
        } catch {
            logger.warn("Не удалось получить рейтинг отзыва");
        }
          
        try {
            const avatarEl = await block.findElement(By.css(Yandex.avatarIcon));
            const style = await avatarEl.getAttribute("style");
            if (style?.includes("url(")) {
                avatar = style.split("url(")[1].split(")")[0].replace(/['"]/g, "");
            }
        } catch {
            logger.warn("Не удалось получить аватар ревьювера");
        }

        try {
            date = await this.tryChildText(block, By.css(Yandex.date));
            date = normalizeYandexDate(date);
        } catch {
            logger.warn("Не удалось получить дату отзыва");
        }
          
        reviews.push({ name: reviewerName, rating, text, avatar, date });
        return true;
    }

    private async maybeExpandReview(block: WebElement) {
        try {
            const moreBtns = await block.findElements(By.css(Yandex.moreButton));
            if (moreBtns[0]) await this.driver.executeScript("arguments[0].click();", moreBtns[0]);
        } catch {}
    }

    // Получает макисмальную позицию элемента среди загруженных отзывов
    private async getMaxPosSafe(reviewsContainer: WebElement): Promise<number> {
        return (await this.driver.executeScript(
            `
            const root = arguments[0];
            const sel = arguments[1];
            const cards = root.querySelectorAll(sel);
            let max = 0;
            for (const c of cards) {
              const v = Number(c.getAttribute('aria-posinset') || 0);
              if (Number.isFinite(v) && v > max) max = v;
            }
            return max;
            `,
            reviewsContainer,
            Yandex.reviewCard
        )) as number;
    }

    private async scrollToNextBatch(reviewsContainer: WebElement, lastCard: WebElement): Promise<boolean> {
        const before = await this.getMaxPosSafe(reviewsContainer);

        for (let i = 0; i < 5; i++) {
            await this.driver.executeScript(
                "arguments[0].scrollIntoView({block:'end'});",
                lastCard
            );
            await this.driver.sleep(120);
          
            const after = await this.getMaxPosSafe(reviewsContainer);
            if (after > before) return true;
        }
        return false;
    }
}

export async function parseYandex(url: string, profileId: string) {
    return await withDriver(profileId, async (driver) => {
        const parser = new YandexParser(driver);
        return await parser.parse(url);
    });
}
