import { By, until, WebElement } from "selenium-webdriver";
import { withDriver } from "../../selenium.js";
import { AbstractParser } from "../parser-abstarct.js";
import { logger } from "../../logger.js";
import { TReview } from "../../types/type-review.js";
import { normalize2gisDate } from "../../utils/normalize-date-review.js";
import { Gis } from "./const-gis.js";


class GisParser extends AbstractParser {
	async getName() {
        return await this.getNameText(By.css(Gis.name));
    }

	async getRating() {
		return await this.getRatingText(By.css(Gis.rating));
	}

	async getCountReviews() {
	  	return await this.getCountReviewsText(By.css(Gis.countReviews));
	}

	async getReviews() {
		const ok = await this.openReviewsPage();
		if (!ok) return [];

		const scrollEl = await this.waitLocated(By.css(Gis.scrollContainer), 10000);

		const seen = new Set<string>();
		const reviews: TReview[] = [];

		while (reviews.length < AbstractParser.REVIEW_LIMIT) {
			const cards = await scrollEl.findElements(By.css(Gis.reviewCard));
	
			for (const card of cards) {
				if (reviews.length >= AbstractParser.REVIEW_LIMIT) break;
				await this.parseReviewCard(card, seen, reviews);
			}

			if (cards.length < 50) break;

			const progressed = await this.scrollToNextBatch(scrollEl);
			if (!progressed) break;
		}

		logger.info({ kind: "2gis", reviewsCount: reviews.length }, "Собрано отзывов с 2ГИС");
		return reviews;
	}

	private async parseReviewCard(card: WebElement, seen: Set<string>, reviews: TReview[]) {
		let reviewerName: string | null = null;
        let text: string | null = null;
        let rating: number | null = null;
        let avatar: string | null = null;
        let date: string | null = null;

		try {
      	  	const more = await card.findElement(By.css(Gis.moreButton));
      	  	await this.driver.executeScript("arguments[0].click();", more);
      	} catch {}

		try {
      	  	const nameEl = await card.findElement(By.css(Gis.author));
      	  	reviewerName = this.normalizeText(await nameEl.getAttribute("textContent"));
      	} catch {
			logger.warn("Не удалось получить имя ревьювера");
		}

      	try {
      	  	const textEl = await card.findElement(By.css(Gis.text));
      	  	text = this.normalizeText(await textEl.getAttribute("textContent"));
      	} catch {
			logger.warn("Не удалось получить текст отзыва");
		}

		try {
      	  	const dateEl = await card.findElement(By.css(Gis.date));
      	  	date = this.normalizeText(await dateEl.getAttribute("textContent"))?.split(",")[0].trim() ?? null;
			date = normalize2gisDate(date);
		} catch {
			logger.warn("Не удалось получить дату отзыва");
		}

		try {
      	  	const stars = await card.findElements(By.css(Gis.reviewRating));
      	  	rating = stars.length || null;
      	} catch {
			logger.warn("Не удалось получить рейтинг отзыва");
		}

		try {
      	  	const avatarEl = await card.findElement(By.css(Gis.avatar));
      	  	const style = await avatarEl.getAttribute("style");
      	  	if (style?.includes("url(")) {
      	  	  	avatar = style.split("url(")[1].split(")")[0].replace(/['\"]/g, "");
      	  	}
      	} catch {
			avatar = null;
		}

		const key = `${reviewerName ?? ""}||${date ?? ""}||${text ?? ""}`;
		if (seen.has(key)) return false;
		seen.add(key);

		reviews.push({ name: reviewerName, text, rating, avatar, date });
		return true;
	}

	private async scrollToNextBatch(reviewsContainer: WebElement): Promise<boolean> {
		const beforeKey = await this.getLastKeyFast(reviewsContainer);

		for (let i = 0; i < 5; i++) {
		  	const freshCards = await reviewsContainer.findElements(By.css(Gis.reviewCard));
		  	if (!freshCards.length) break;

		  	await this.wheelToLastVisibleCard(reviewsContainer, freshCards[freshCards.length - 1]);
			await this.bounceUp(reviewsContainer, 200);
			
		  	await this.driver.sleep(80);

		  	const afterKey = await this.getLastKeyFast(reviewsContainer);
		  	if (afterKey && afterKey !== beforeKey) {
		  	  	return true;
		  	}
		}

		return false;
	}

	private async openReviewsPage() {
    	try {
    	    const tab = await this.driver.wait(until.elementLocated(By.xpath(Gis.tabReviews)), 10000);
    	    await this.driver.executeScript("arguments[0].scrollIntoView(true);", tab);
    	    await this.driver.executeScript("arguments[0].click();", tab);
    	    await this.driver.wait(until.elementLocated(By.css(Gis.reviewCard)), 10000);
    	    return true;
    	} catch (e) {
			logger.warn("Не получилось открыть страницу с отзывами '2ГИС'!");
    	    return false;
    	}
	}

	private async getLastKeyFast(scrollEl: WebElement): Promise<string | null> {
	  	return (await this.driver.executeScript(
	  	  	`
	  	  	const root = arguments[0];
	  	  	const cards = root.querySelectorAll('${Gis.reviewCard}');
	  	  	const last = cards[cards.length - 1];
	  	  	if (!last) return null;
			
	  	  	const name = last.querySelector('${Gis.author}')?.textContent?.trim() ?? '';
	  	  	const date = (last.querySelector('${Gis.date}')?.textContent ?? '').split(',')[0].trim();
	  	  	const text = last.querySelector('${Gis.text}')?.textContent?.trim() ?? '';
	  	  	const stars = last.querySelectorAll('${Gis.reviewRating}').length;
			
	  	  	return name + '||' + date + '||' + stars + '||' + text;
	  	  	`,
	  	  	scrollEl
	  	)) as string | null;
	}

	private async wheelToLastVisibleCard(scrollEl: WebElement, lastCard: WebElement): Promise<void> {
		await this.driver.executeScript(
		  	`
		  	const sc = arguments[0];
		  	const last = arguments[1];
			
		  	const scRect = sc.getBoundingClientRect();
		  	const lastRect = last.getBoundingClientRect();
			
		  	let dy = (lastRect.bottom - scRect.bottom) + 120;
		  	const minStep = Math.max(200, Math.floor(sc.clientHeight * 0.6));
		  	dy = Math.max(dy, minStep);
			
		  	sc.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true }));
		  	sc.scrollTop = sc.scrollTop + dy;
		  	sc.dispatchEvent(new Event('scroll', { bubbles: true }));
		  	`,
		  	scrollEl,
		  	lastCard
		);
	}

	private async bounceUp(scrollEl: WebElement, px = 250): Promise<void> {
	  	await this.driver.executeScript(
	  	  	"const el = arguments[0]; const px = arguments[1]; el.scrollTop = Math.max(0, el.scrollTop - px);",
	  	  	scrollEl,
	  	  	px
	  	);
	}
}

export async function parse2gis(url: string, profileId: string) {
	return await withDriver(profileId, async (driver) => {
		const parser = new GisParser(driver);
		return await parser.parse(url);
	});
}

