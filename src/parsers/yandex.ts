import { By, WebElement } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";
import { logger } from "../logger.js";
import { TReview } from "../types/type-review.js";
import { normalizeYandexDate } from "../utils/normalize-date-review.js";


const CAPTCHA_RE = /not a robot|не робот|подтверд/i;

const REVIEW_LIMIT = 150;

class YandexParser extends AbstractParser {
    private async maybeExpandReview(block: WebElement) {
        try {
            const moreBtns = await block.findElements(By.css(".spoiler-view__button .business-review-view__expand"));
            if (moreBtns[0]) await this.driver.executeScript("arguments[0].click();", moreBtns[0]);
        } catch {}
    }

    async assertNotCaptcha() {
        let name = await this.tryText(By.css("h1"));
        if (name && CAPTCHA_RE.test(name)) {
            await this.driver.sleep(20000);
            name = await this.tryText(By.css("h1"));
            if (name && CAPTCHA_RE.test(name)) {
                logger.warn('Вышла капча');
                throw new Error("captcha_required");
            }
        }
    }

    async getRating() {
        try {
            const root = await this.waitLocated(By.css(".business-summary-rating-badge-view__rating"), 8000);
            const spans = await root.findElements(By.css(".business-summary-rating-badge-view__rating-text"));
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
        try {
            const root = await this.waitLocated(By.css(".business-rating-amount-view._summary"), 8000);
            let countReviews = this.normalizeText(await root.getAttribute("textContent"));
            if (!countReviews) return null;
            return countReviews?.split(" ")[0];
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Ошибка получения кол-ва отзывов");
            return null
        }
    }

    async getReviews() {
        let reviewsContainer = await this.waitLocated(By.css('.business-reviews-card-view__reviews-container'), 10000);
      
        const seen = new Set<string>();
        const reviews: TReview[] = [];

        // Получает макисмальную позицию элемента среди загруженных отзывов
        const getMaxPosSafe = async () =>
            (await this.driver.executeScript(
              `
              const root = arguments[0];
              const cards = root.querySelectorAll('.business-reviews-card-view__review');
              let max = 0;
              for (const c of cards) {
                const v = Number(c.getAttribute('aria-posinset') || 0);
                if (Number.isFinite(v) && v > max) max = v;
              }
              return max;
              `,
              reviewsContainer
            )) as number;
      
        while (reviews.length < REVIEW_LIMIT) {
            const cards = await reviewsContainer.findElements(By.css('.business-reviews-card-view__review'));

            for (const card of cards) {
                let block: WebElement | null = null;
                
                let reviewerName: string | null = null;
                let text: string | null = null;
                let rating: number | null = null;
                let avatar: string | null = null;
                let date: string | null = null;
                
                if (reviews.length >= REVIEW_LIMIT) break;

                const pos = await card.getAttribute("aria-posinset");
                if (!pos || seen.has(pos)) continue;
                seen.add(pos);
            
                try {
                    block = await card.findElement(By.css(".business-review-view"));
                } catch {
                    continue;
                }
          
                try {
                    reviewerName = await this.tryChildText(block, By.css("[itemprop='name']"));
                } catch {
                    logger.warn("Не удалось получить имя ревьювера");
                }
          
                await this.maybeExpandReview(block);

                try {
                    text = await this.tryChildTextContent(block, By.css(".spoiler-view__text-container"));
                } catch {
                    logger.warn("Не удалось получить текст отзыва");
                }
          
                try {
                    rating = (await block.findElements(By.css(".business-rating-badge-view__star._full"))).length;
                } catch {
                    logger.warn("Не удалось получить рейтинг отзыва");
                }
          
                try {
                    const avatarEl = await block.findElement(By.css(".user-icon-view__icon"));
                    const style = await avatarEl.getAttribute("style");
                    if (style?.includes("url(")) {
                        avatar = style.split("url(")[1].split(")")[0].replace(/['"]/g, "");
                    }
                } catch {
                    logger.warn("Не удалось получить аватар ревьювера");
                }

                try {
                    date = await this.tryChildText(block, By.css(".business-review-view__date span"));
                    date = normalizeYandexDate(date);
                } catch {
                    logger.warn("Не удалось получить дату отзыва");
                }
          
                reviews.push({ name: reviewerName, rating, text, avatar, date });
            }

            if (cards.length < 50) break;

            const before = await getMaxPosSafe();
            let progressed = false;

            for (let i = 0; i < 5; i++) {
                await this.driver.executeScript(
                    "arguments[0].scrollIntoView({block:'end'});",
                    cards[cards.length - 1]
                );
                await this.driver.sleep(120);
          
                const after = await getMaxPosSafe();
                if (after > before) {
                    progressed = true;
                    break;
                }
            }

            if (!progressed) break;
        }
      
        logger.warn(reviews.length, "Найдено отзывов");
        return reviews;
    }
}

export async function parseYandex(url: string, profileId: string) {
    return await withDriver(profileId, async (driver) => {
        const parser = new YandexParser(driver);
        return await parser.parse(url);
    });
}
