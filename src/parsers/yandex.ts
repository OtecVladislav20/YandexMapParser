import { By, WebElement } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";
import { logger } from "../logger.js";
import { TReview } from "../types/type-review.js";


const CAPTCHA_RE = /not a robot|не робот|подтверд/i;
const REVIEW_LIMIT = 150;


class YandexParser extends AbstractParser {
    async maybeExpandReview(block: WebElement) {
        try {
            const moreButton = await block.findElement( By.css(".spoiler-view__button .business-review-view__expand"));
            await this.driver.executeScript("arguments[0].click();", moreButton);
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

    async getName() {
        return await this.tryText(By.css("h1"));
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
            return this.normalizeText(await root.getText());
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Ошибка получения кол-ва отзывов");
            return null
        }
    }

    async getReviews() {
        const scrollEl = await this.waitLocated(By.css('.scroll__content'), 10000);
        let reviewsContainer = await this.waitLocated(By.css('.business-reviews-card-view__reviews-container'), 10000);
        
        const getMaxPosSafe = async () => {
            const cards = await reviewsContainer.findElements(By.css('.business-reviews-card-view__review'));
            const poses = await Promise.all(cards.map((c) => c.getAttribute("aria-posinset")));
            const nums = poses.map((p) => Number(p ?? 0)).filter((n) => Number.isFinite(n) && n > 0);
            return nums.length ? Math.max(...nums) : 0;
        };
      
        const seen = new Set<string>();
        const reviews: TReview[] = [];
      
        let stalled = 0;
        let lastMax = await getMaxPosSafe();
      
        while (reviews.length < REVIEW_LIMIT && stalled < 9) {
            const cards = await reviewsContainer.findElements(By.css('.business-reviews-card-view__review'));
            
            let added = 0;
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
                } catch {
                    logger.warn("Не удалось получить дату отзыва");
                }
          
                reviews.push({ name: reviewerName, rating, text, avatar, date });
                added++;
            }

            const before = lastMax;

            if (cards.length) {
                await this.driver.executeScript("arguments[0].scrollIntoView({block:'end'});", cards[cards.length - 1]);
            } else {
                await this.driver.executeScript("arguments[0].scrollTop = arguments[0].scrollHeight;", scrollEl);
            }

            const progressed = await this.driver
              .wait(async () => (await getMaxPosSafe()) > before, 5000)
              .catch(() => false);
        
            const after = await getMaxPosSafe();
            lastMax = Math.max(lastMax, after);
        
            if (added > 0 || progressed || after > before) stalled = 0;
            else stalled++;
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
