import { By, until } from "selenium-webdriver";
import { withDriver } from "../selenium.js";

async function tryText(driver, locator, timeoutMs = 10000) {
    try {
        const el = await driver.wait(until.elementLocated(locator), timeoutMs);
        return (await el.getText()) || null;
    } catch {
        return null;
    }
}

export async function parseYandex(url, profileId) {
    return await withDriver(profileId, async (driver) => {
        await driver.get(url);
        
        const name = await tryText(driver, By.css("h1"));
        let rating = null;
        try {
            const els = await driver.findElements(By.className("business-summary-rating-badge-view__rating-text"));
            const parts = [];
            for (const el of els) parts.push((await el.getText()) ?? "");
            const merged = parts.join("").trim();
            rating = merged.length ? merged : null;
        } catch {}

        const countReviews = await tryText(driver, By.className("business-rating-amount-view"));

        for (let i = 0; i < 5; i++) {
            await driver.executeScript("window.scrollBy(0, 800)");
            await driver.sleep(500);
        }

        const blocks = await driver.findElements(By.css("div.business-review-view"));
        const reviews = [];
        for (const block of blocks.slice(0, 10)) {
            let reviewerName = null;
            let text = null;
            let avatar = null;
            let raiting = null;
            
            try {
                reviewerName = (await block.findElement(By.css("[itemprop='name']")).getText()).trim();
            } catch {}
          
            try {
                text = (await block.findElement(By.css(".spoiler-view__text-container")).getText()).trim();
            } catch {}
          
            try {
                const stars = await block.findElements(By.css(".business-rating-badge-view__star._full"));
                raiting = stars.length;
            } catch {}
          
            try {
                const avatarEl = await block.findElement(By.css(".user-icon-view__icon"));
                const style = await avatarEl.getAttribute("style");
                if (style && style.includes("url(")) {
                  avatar = style.split("url(")[1].split(")")[0].replace(/["']/g, "");
                }
            } catch {}
          
            reviews.push({ name: reviewerName, raiting, text, avatar });
        }

        return { name, rating, count_reviews: countReviews, reviews };
    });
}
