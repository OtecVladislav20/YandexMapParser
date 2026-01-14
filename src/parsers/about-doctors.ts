import { By, until } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";
import { logger } from "../logger.js";
import { TReview } from "../types/type-review.js";
import { normalizeDoctorsDate } from "../utils/normalize-date-review.js";


const CAPTCHA_RE = /not a robot|не робот|подтверд/i;
const REVIEW_LIMIT = 150;

class AboutDoctors extends AbstractParser {
    private async openReviewsPage() {
        try {
            const tab = await this.driver.wait(until.elementLocated(By.css("a.b-doctor-details__toc-item[data-anchor-target='otzivi']")), 10000);
            await this.driver.executeScript("arguments[0].scrollIntoView({block:'center'});", tab);
            await this.driver.executeScript("arguments[0].click();", tab);
            await this.driver.wait(until.urlContains("/otzivi/"), 10000);
            await this.driver.wait(until.elementLocated(By.css("div.b-review-card")), 10000);
            return true;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Не получилось открыть страницу с отзывами 'ПроДокторов'!");
            return false;
        }
    }

    private async getNextReviewsPage(): Promise<boolean> {
        const nextBtn = await this.driver.findElements(By.css("a[data-qa='next_page_button']"));
        if (!nextBtn.length) return false;

        const href = await nextBtn[0].getAttribute("href");
        if (!href) return false;

        const nextUrl = new URL(href, await this.driver.getCurrentUrl()).toString();
        await this.driver.get(nextUrl);

        return true;
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
            const root = await this.waitLocated(By.css(".text-h5.text--text.font-weight-medium.mr-2"), 5000);
            return this.normalizeText(await root.getText());
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Ошибка получения рейтинга");
            return null;
        }
    }

    async getCountReviews() {
        try {
            const root = await this.waitLocated(By.css(".b-box-rating__text"), 5000);
            let text = this.normalizeText(await root.getText());
            if (!text) return null;
            return text.split(" ")[0];
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Ошибка получения кол-ва отзывов");
            return null;
        }
    }

    async getReviews() {
        const ok = await this.openReviewsPage();
        if (!ok) return [];

        const seen = new Set<string>();
        const reviews: TReview[] = [];

        while (reviews.length < REVIEW_LIMIT) {
            await this.driver.wait(until.elementsLocated(By.css("div.b-review-card")), 10000);
            const blocks = await this.driver.findElements(By.css("div.b-review-card"));

            for (const block of blocks) {
                let reviewerName: string | null = null;
                let text: string | null = null;
                let rating: number | null = null;
                let avatar: string | null = null;
                let date: string | null = null;

                if (reviews.length >= REVIEW_LIMIT) break;
    
                try {
                    reviewerName = await this.tryChildTextContent(block,By.css(".b-review-card__author-link"))
                } catch {
                    logger.warn("Ошибка получения имени автора отзыва");
                }
    
                try {
                    text = await this.tryChildTextContent(block,By.css(".b-review-card__comment.text-body-1.text--text.mt-2"));
                } catch {
                    logger.warn("Ошибка получения текста отзыва");
                }
    
                try {
                    rating = Number(await this.tryChildTextContent(block,By.css(".text-subtitle-2.text--text.ml-1")));
                } catch {
                    logger.warn("Ошибка получения рейтинга отзыва");
                }
    
                try {
                    date = await this.tryChildTextContent(block,By.css(".text-body-2.text-secondary--text.mb-5"));
                    date = normalizeDoctorsDate(date);
                } catch {
                    logger.warn("Ошибка получения даты отзыва");
                }

                const key = `${reviewerName ?? ""}||${date ?? ""}||${text ?? ""}`;
                if (seen.has(key)) continue;
                seen.add(key);
    
                reviews.push({ name: reviewerName, rating, text, avatar, date });
            }

            if (reviews.length >= REVIEW_LIMIT) break;

            await this.driver.executeScript("window.scrollTo(0, document.body.scrollHeight)");
            await this.driver.sleep(200);

            const moved = await this.getNextReviewsPage();
            if (!moved) break;
        }

        logger.warn(reviews.length, 'Всего отзывов собрано с ПроДокторов');
        return reviews;
    }
}

export async function parseAboutDoctors(url: string, profileId: string) {
    return await withDriver(profileId, async (driver) => {
        const parser = new AboutDoctors(driver);
        return await parser.parse(url);
    });
}
