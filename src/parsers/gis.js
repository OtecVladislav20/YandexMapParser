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

async function openReviewsPage(driver) {
    try {
        const tab = await driver.wait(until.elementLocated(By.xpath("//a[contains(@href,'tab/reviews')]")), 10000);
        await driver.executeScript("arguments[0].scrollIntoView(true);", tab);
        await driver.executeScript("arguments[0].click();", tab);
        await driver.wait(until.elementLocated(By.className("_1k5soqfl")), 10000);
        return true;
    } catch (e) {
        console.error("ERROR openReviewsPage:", e?.message ?? e);
        return false;
    }
}

export async function parse2gis(url, profileId) {
    return await withDriver(profileId, async (driver) => {
        await driver.get(url);
        
        const name = await tryText(driver, By.css("h1"));
        const rating = await tryText(driver, By.className("_y10azs"));
        const countReviews = await tryText(driver, By.className("_jspzdm"));
        
        const ok = await openReviewsPage(driver);
        if (!ok) return { name, rating, count_reviews: countReviews, reviews: [] };
        
        const reviews = [];
        let loaded = 0;

        for (let i = 0; i < 6 && loaded < 10; i++) {
            await driver.executeScript("window.scrollBy(0, 600)");
            await driver.sleep(400);

            const blocks = await driver.findElements(By.className("_1k5soqfl"));
            for (const block of blocks) {
                if (loaded >= 10) break;

                let reviewerName = null;
                let text = null;
                let avatar = null;
                let raiting = null;

                try {
                  const els = await block.findElements(By.className("_16s5yj36"));
                  reviewerName = els[0] ? (await els[0].getAttribute("textContent")).trim() : null;
                } catch {}

                try {
                  const els = await block.findElements(By.className("_1msln3t"));
                  text = els[0] ? (await els[0].getAttribute("textContent")).trim() : null;
                } catch {}

                try {
                  const ratingBlocks = await block.findElements(By.className("_1fkin5c"));
                  if (ratingBlocks[0]) {
                    const spans = await ratingBlocks[0].findElements(By.css("span"));
                    raiting = spans.length;
                  }
                } catch {}

                try {
                  const avatarEl = await block.findElement(By.className("_1dk5lq4"));
                  const style = await avatarEl.getAttribute("style");
                  if (style && style.includes("url(")) {
                    avatar = style.split("url(")[1].split(")")[0].replace(/["']/g, "");
                  }
                } catch {}

                reviews.push({ name: reviewerName, text, raiting, avatar });
                loaded++;
            }
        }

        return { name, rating, count_reviews: countReviews, reviews };
    });
}
