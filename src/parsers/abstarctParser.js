import { until } from "selenium-webdriver";


export class AbstractParser {
    constructor(driver, log, opts = {}) {
        this.driver = driver;
        this.log = log;
        this.opts = { timeoutMs: 8000, ...opts };
    }

    normalizeText(value) {
        if (value == null) return null;
        const t = String(value).replace(/\s+/g, " ").trim();
        return t.length ? t : null;
    }

    async waitLocated(locator, timeoutMs = this.opts.timeoutMs) {
        return await this.driver.wait(until.elementLocated(locator), timeoutMs);
    }

    async tryText(locator, timeoutMs = this.opts.timeoutMs) {
        try {
            const el = await this.waitLocated(locator, timeoutMs);
            return this.normalizeText(await el.getText());
        } catch {
            return null;
        }
    }

    async tryChildText(parent, locator) {
        try {
            const el = await parent.findElement(locator);
            return this.normalizeText(await el.getText());
        } catch {
            return null;
        }
    }

    async tryChildTextContent(parent, locator) {
        try {
            const el = await parent.findElement(locator);
            return this.normalizeText(await el.getAttribute("textContent"));
        } catch {
            return null;
        }
    }

    async parse(url) {
        await this.driver.get(url);

        if (typeof this.assertNotCaptcha === "function") {
            await this.assertNotCaptcha();
        }

        return {
            name: await this.getName(),
            rating: await this.getRating(),
            count_reviews: await this.getCountReviews(),
            reviews: await this.getReviews(),
        };
    }
}
