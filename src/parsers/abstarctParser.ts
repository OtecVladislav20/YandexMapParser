import { until, type WebDriver, type WebElement, type Locator } from "selenium-webdriver";


export type ParseResult = {
    name: string | null;
    rating: string | null;
    count_reviews: string | null;
    reviews: unknown[];
};

export type ParserOpts = {
    timeoutMs?: number;
};

export abstract class AbstractParser {
    protected driver: WebDriver;
    protected opts: Required<ParserOpts>;

    constructor(driver: WebDriver,  opts: ParserOpts = {}) {
        this.driver = driver;
        this.opts = { timeoutMs: 5000, ...opts };
    }

    normalizeText(value: string | number): string | null {
        if (value == null) return null;
        const t = String(value)
            .replace(/\\r\\n|\\n|\\r/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        return t.length ? t : null;
    }

    async waitLocated(locator: Locator, timeoutMs = this.opts.timeoutMs) {
        return await this.driver.wait(until.elementLocated(locator), timeoutMs);
    }

    async tryText(locator: Locator, timeoutMs = this.opts.timeoutMs) {
        try {
            const el = await this.waitLocated(locator, timeoutMs);
            return this.normalizeText(await el.getText());
        } catch {
            return null;
        }
    }

    async tryChildText(parent: WebElement, locator: Locator) {
        try {
            const el = await parent.findElement(locator);
            return this.normalizeText(await el.getText());
        } catch {
            return null;
        }
    }

    async tryChildTextContent(parent: WebElement, locator: Locator) {
        try {
            const el = await parent.findElement(locator);
            return this.normalizeText(await el.getAttribute("textContent"));
        } catch {
            return null;
        }
    }


    protected async assertNotCaptcha(): Promise<void> {}
    protected abstract getName(): Promise<string | null>;
    protected abstract getRating(): Promise<string | null>;
    protected abstract getCountReviews(): Promise<string | null>;
    protected abstract getReviews(): Promise<unknown[]>;

    async parse(url: string): Promise<ParseResult> {
        await this.driver.get(url);
        await this.assertNotCaptcha();

        return {
            name: await this.getName(),
            rating: await this.getRating(),
            count_reviews: await this.getCountReviews(),
            reviews: await this.getReviews(),
        };
    }
}
