import { By } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";


const CAPTCHA_RE = /not a robot|не робот|подтверд/i;

class YandexParser extends AbstractParser {
    async assertNotCaptcha() {
        let name = await this.tryText(By.css("h1"));
        if (name && CAPTCHA_RE.test(name)) {
            await this.driver.sleep(20000);
            name = await this.tryText(By.css("h1"));
            if (name && CAPTCHA_RE.test(name)) {
                throw new Error("captcha_required");
            }
        }
    }

    async getName() {
        return await this.tryText(By.css("h1"));
    }

    async getRating() {
        let rating = 'Не был распарсен (';
        try {
            const els = await this.driver.findElements(
              By.className("business-summary-rating-badge-view__rating-text")
            );
            const parts = [];
            for (const el of els) parts.push((await el.getText()) ?? "");
            const merged = parts.join("").trim();
            rating = merged.length ? merged : null;
        } catch {
            rating = 'Была поймана ошибка';
        }

        return rating;
    }

    async getCountReviews() {
        let countRating = 'Не был распарсен (';

        try {
            countRating = await this.tryText(By.css(".business-rating-amount-view._summary"));
        } catch {
            countRating = 'Была поймана ошибка';
        }

        return countRating;
    }

    async scrollToLoadReviews() {
        for (let i = 0; i < 5; i++) {
            await this.driver.executeScript("window.scrollBy(0, 800)");
            await this.driver.sleep(500);
        }
    }

    async maybeExpandReview(block) {
        try {
          const moreButton = await block.findElement( By.css(".spoiler-view__button .business-review-view__expand"));
          await this.driver.executeScript("arguments[0].click();", moreButton);
          await this.driver.sleep(500);
        } catch {

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

export async function parseYandex(url, profileId) {
    return await withDriver(profileId, async (driver) => {
        const parser = new YandexParser(driver);
        return await parser.parse(url);
    });
}
