import { By, until, WebElement } from "selenium-webdriver";
import { withDriver } from "../../selenium.js";
import { AbstractParser } from "../parser-abstarct.js";
import { logger } from "../../logger.js";
import { TReview } from "../../types/type-review.js";
import { normalizeDoctorsDate } from "../../utils/normalize-date-review.js";
import { Doctors } from "./const-about-doctors.js";


class AboutDoctors extends AbstractParser {
    async getName() {
        return await this.getNameText(By.css(Doctors.name));
    }

    async getRating() {
        return await this.getRatingText(By.css(Doctors.rating));
    }

    async getCountReviews() {
	  	return await this.getCountReviewsText(By.css(Doctors.countReviews));
	}

    async getReviews() {
        const ok = await this.openReviewsPage();
        if (!ok) return [];

        const seen = new Set<string>();
        const reviews: TReview[] = [];

        while (reviews.length < AbstractParser.REVIEW_LIMIT) {
            await this.driver.wait(until.elementsLocated(By.css(Doctors.reviewCard)), 10000);
            const cards = await this.driver.findElements(By.css(Doctors.reviewCard));

            for (const card of cards) {
                if (reviews.length >= AbstractParser.REVIEW_LIMIT) break;
                await this.parseReviewCard(card, seen, reviews);
            }

            await this.driver.executeScript("window.scrollTo(0, document.body.scrollHeight)");
            await this.driver.sleep(200);

            const moved = await this.getNextReviewsPage();
            if (!moved) break;
        }

        logger.info({ kind: "Doctors", reviewsCount: reviews.length }, "Собрано отзывов с ПроДокторов");
        return reviews;
    }

    private async parseReviewCard(card: WebElement, seen: Set<string>, reviews: TReview[]) {
        let reviewerName: string | null = null;
        let text: string | null = null;
        let rating: number | null = null;
        let avatar: string | null = null;
        let date: string | null = null;

        try {
            reviewerName = await this.tryChildTextContent(card, By.css(Doctors.author));
        } catch {
            logger.warn("Ошибка получения имени автора отзыва");
        }
    
        try {
            text = await this.tryChildTextContent(card, By.css(Doctors.text));
        } catch {
            logger.warn("Ошибка получения текста отзыва");
        }
    
        try {
            rating = Number(await this.tryChildTextContent(card, By.css(Doctors.reviewRating)));
        } catch {
            logger.warn("Ошибка получения рейтинга отзыва");
        }
    
        try {
            date = await this.tryChildTextContent(card, By.css(Doctors.date));
            date = normalizeDoctorsDate(date);
        } catch {
            logger.warn("Ошибка получения даты отзыва");
        }

        const key = `${reviewerName ?? ""}||${date ?? ""}||${text ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
    
        reviews.push({ name: reviewerName, rating, text, avatar, date });
        return true;
    }

    private async openReviewsPage() {
        try {
            const tab = await this.driver.wait(until.elementLocated(By.css(Doctors.tabReviews)), 10000);
            await this.driver.executeScript("arguments[0].scrollIntoView({block:'center'});", tab);
            await this.driver.executeScript("arguments[0].click();", tab);
            await this.driver.wait(until.urlContains("/otzivi/"), 10000);
            await this.driver.wait(until.elementLocated(By.css(Doctors.reviewCard)), 10000);
            return true;
        } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Не получилось открыть страницу с отзывами 'ПроДокторов'!");
            return false;
        }
    }

    private async getNextReviewsPage(): Promise<boolean> {
        const nextBtn = await this.driver.findElements(By.css(Doctors.nextPageButton));
        if (!nextBtn.length) return false;

        const href = await nextBtn[0].getAttribute("href");
        if (!href) return false;

        const nextUrl = new URL(href, await this.driver.getCurrentUrl()).toString();
        await this.driver.get(nextUrl);

        return true;
    }
}

export async function parseAboutDoctors(url: string, profileId: string) {
    return await withDriver(profileId, async (driver) => {
        const parser = new AboutDoctors(driver);
        return await parser.parse(url);
    });
}
