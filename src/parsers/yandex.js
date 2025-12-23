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

function normalizeText(s) {
    if (!s) return null;
    const t = String(s).replace(/\s+/g, " ").trim();
    return t.length ? t : null;
}

async function getFullTextReview(driver, block) {
    try {
        const moreButton = await block.findElement(By.css(".spoiler-view__button .business-review-view__expand"));
        if (moreButton) {
            await driver.executeScript("arguments[0].click();", moreButton);
            await driver.sleep(500);
        }
    } catch {
        return false;
    }
}

export async function parseYandex(url, profileId) {
    return await withDriver(profileId, async (driver) => {
        await driver.get(url);

        let name = await tryText(driver, By.css("h1"));

        const CAPTCHA_RE = /not a robot|не робот|подтверд/i;

        if (name && CAPTCHA_RE.test(name)) {
            await driver.sleep(20000);
            name = await tryText(driver, By.css("h1"));
            if (name && CAPTCHA_RE.test(name)) {
                throw new Error("captcha_required");
            }
        }

        let rating = null;
        try {
            const els = await driver.findElements(By.className("business-summary-rating-badge-view__rating-text"));
            const parts = [];
            for (const el of els) parts.push((await el.getText()) ?? "");
            const merged = parts.join("").trim();
            rating = merged.length ? merged : null;
        } catch {}

        // TODO
        // const countReviews = (await driver.findElement(By.css(".business-rating-amount-view._summary")).getText()).trim();
        const countReviews = await tryText(driver, By.css(".business-rating-amount-view._summary"));

        for (let i = 0; i < 5; i++) {
            await driver.executeScript("window.scrollBy(0, 800)");
            await driver.sleep(500);
        }

        const blocks = await driver.findElements(By.css("div.business-review-view"));
        const reviews = [];
        for (const block of blocks.slice(0, 20)) {
            let reviewerName = null;
            let text = null;
            let avatar = null;
            let raiting = null;
            let date = null;
            
            try {
                reviewerName = (await block.findElement(By.css("[itemprop='name']")).getText()).trim();
            } catch {}
          
            try {
                await getFullTextReview(driver, block);
                const textEl = await block.findElement(By.css(".spoiler-view__text-container"));
                text = normalizeText(await textEl.getAttribute("textContent"));
            } catch {
                text = null;
            }
          
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

            try {
                date = await block.findElement(By.css('.business-review-view__date span')).getText();
            } catch {}
          
            reviews.push({ name: reviewerName, raiting, text, avatar, date });
        }

        return { name, rating, count_reviews: countReviews, reviews };
    });
}
