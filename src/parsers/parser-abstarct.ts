import { until, type WebDriver, type WebElement, type Locator, By } from "selenium-webdriver";
import { logger } from "../logger.js";
import { TParseResult } from "../domain/type-parse-result.js";
import { TReview } from "../domain/type-review.js";


export type ParserOpts = {
    timeoutMs?: number;
};

export abstract class AbstractParser {
    protected driver: WebDriver;
    protected opts: Required<ParserOpts>;

    protected static CAPTCHA_RE = /not a robot|не робот|подтверд/i;
    protected static REVIEW_LIMIT = 150;

    constructor(driver: WebDriver,  opts: ParserOpts = {}) {
        this.driver = driver;
        this.opts = { timeoutMs: 5000, ...opts };
    }

    protected async getNameText(locator: Locator): Promise<string | null> {
        return await this.tryText(locator);
    }

    protected async getRatingText(locator: Locator): Promise<string | null> {
        try {
            const root = await this.waitLocated(locator, 5000);
            return this.normalizeText(await root.getText());
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Ошибка получения рейтинга");
            return null;
        }
    }

    protected async getCountReviewsText(locator: Locator): Promise<string | null> {
        try {
            const root = await this.waitLocated(locator, 5000);
            let text = this.normalizeText(await root.getText());
            if (!text) return null;
            const digits = text.replace(/\D/g, "");
            return digits.length ? digits : null;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            logger.warn({ msg }, "Ошибка получения кол-ва отзывов");
            return null;
        }
    }

    protected async assertNotCaptcha(): Promise<void> {
        let text = await this.tryText(By.css("h1"));
        if (text && AbstractParser.CAPTCHA_RE.test(text)) {
            await this.driver.sleep(20000);
            text = await this.tryText(By.css("h1"));
            if (text && AbstractParser.CAPTCHA_RE.test(text)) {
                logger.error("Вышла капча");
                throw new Error("captcha_required");
            }
        }
    }

    protected abstract getName(): Promise<string | null>;
    protected abstract getRating(): Promise<string | null>;
    protected abstract getCountReviews(): Promise<string | null>;
    protected abstract getReviews(): Promise<TReview[]>;

    async parse(url: string): Promise<TParseResult> {
        await this.driver.get(url);
        await this.assertNotCaptcha();

        return {
            name: await this.getName(),
            rating: await this.getRating(),
            count_reviews: await this.getCountReviews(),
            reviews: await this.getReviews(),
        };
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
}
