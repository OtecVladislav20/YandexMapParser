import { By, until, WebElement } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";
import { logger } from "../logger.js";


const CAPTCHA_RE = /not a robot|не робот|подтверд/i;

class AboutDoctors extends AbstractParser {
    async openReviewsPage() {
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

    async scrollToLoadReviews() {
        const need = 20;
        let last = 0;
        for (let i = 0; i < 20; i++) {
            const blocksNow = await this.driver.findElements(By.css("div.b-review-card"));
            if (blocksNow.length >= need) break;
            
            if (blocksNow.length === last) {
                await this.driver.executeScript("window.scrollBy(0, 1200)");
            } else {
                last = blocksNow.length;
                await this.driver.executeScript("window.scrollTo(0, document.body.scrollHeight)");
            }
          
            await this.driver.sleep(700);
        }
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
        const root = await this.waitLocated(By.css(".text-h5.text--text.font-weight-medium.mr-2"), 5000);
        return this.normalizeText(await root.getText());
    }

    async getCountReviews() {
        const root = await this.waitLocated(By.css(".b-box-rating__text"), 5000);
        return this.normalizeText(await root.getText());
    }

    async getReviews() {
        const ok = await this.openReviewsPage();
        if (!ok) return [];

        await this.scrollToLoadReviews();

        const blocks = await this.driver.findElements(By.css(".b-review-card.year2025.b-review-card_positive"));

        const reviews: Array<
		{ 
			name: string | null; 
			text: string | null; 
			raiting: string | null; 
			avatar: string | null; 
			date: string | null;
		}> = [];

        for (const block of blocks.slice(0, 20)) { 
            let reviewerName = null;
            let text = null;
            let avatar = null;
            let raiting = null;
            let date = null;

            reviewerName = await this.tryChildTextContent(block,By.css(".b-review-card__author-link"))
            text = await this.tryChildTextContent(block,By.css(".b-review-card__comment.text-body-1.text--text.mt-2"));
            avatar = 'Аватара нет на сайте';
            raiting = await this.tryChildTextContent(block,By.css(".text-subtitle-2.text--text.ml-1"));
            date = await this.tryChildTextContent(block,By.css(".text-body-2.text-secondary--text.mb-5"));

            reviews.push({ name: reviewerName, raiting, text, avatar, date });
        }

        return reviews;
    }
}

export async function parseAboutDoctors(url: string, profileId: string) {
    return await withDriver(profileId, async (driver) => {
        const parser = new AboutDoctors(driver);
        return await parser.parse(url);
    });
}
