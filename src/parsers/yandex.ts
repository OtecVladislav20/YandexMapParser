import { By, WebElement } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";
import { logger } from "../logger.js";


const CAPTCHA_RE = /not a robot|не робот|подтверд/i;

class YandexParser extends AbstractParser {
    async scrollToLoadReviews() {
        for (let i = 0; i < 5; i++) {
            await this.driver.executeScript("window.scrollBy(0, 800)");
            await this.driver.sleep(500);
        }
    }

    async maybeExpandReview(block: WebElement) {
        try {
          const moreButton = await block.findElement( By.css(".spoiler-view__button .business-review-view__expand"));
          await this.driver.executeScript("arguments[0].click();", moreButton);
          await this.driver.sleep(500);
        } catch {

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
        try {
            const root = await this.waitLocated(By.css(".business-summary-rating-badge-view__rating"), 8000);
            const spans = await root.findElements(By.css(".business-summary-rating-badge-view__rating-text"));
            const parts = await Promise.all(spans.map(s => s.getAttribute("textContent")));
            const merged = parts.map(p => (p ?? "").trim()).join("");
            return merged.length ? merged : null;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.info({ msg }, "Ошибка получения рейтинга");
            return null;
        }
    }

    async getCountReviews() {
        try {
            const root = await this.waitLocated(By.css(".business-rating-amount-view._summary"), 8000);
            return this.normalizeText(await root.getText());
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.info({ msg }, "Ошибка получения кол-ва отзывов");
            return null
        }
    }

    async getReviews() {
        await this.scrollToLoadReviews();
        
        const blocks = await this.driver.findElements(By.css("div.business-review-view"));
        const reviews = [];

        for (const block of blocks.slice(0, 20)) {
            let reviewerName = null;
            let text = null;
            let avatar = null;
            let raiting = null;
            let date = null;
            
            reviewerName = await this.tryChildText(block, By.css("[itemprop='name']"));
            
            await this.maybeExpandReview(block);
            text = await this.tryChildTextContent(block, By.css(".spoiler-view__text-container"));
            
            try {
                const stars = await block.findElements(
                  By.css(".business-rating-badge-view__star._full")
                );
                raiting = stars.length;
            } catch {}
          
            try {
                const avatarEl = await block.findElement(By.css(".user-icon-view__icon"));
                const style = await avatarEl.getAttribute("style");
                if (style && style.includes("url(")) {
                    avatar = style.split("url(")[1].split(")")[0].replace(/["']/g, "");
                }
            } catch {}
          
            date = await this.tryChildText(block, By.css(".business-review-view__date span"));
          
            reviews.push({ name: reviewerName, raiting, text, avatar, date });
        }

        return reviews;
    }
}

export async function parseYandex(url: string, profileId: string) {
    return await withDriver(profileId, async (driver) => {
        const parser = new YandexParser(driver);
        return await parser.parse(url);
    });
}
