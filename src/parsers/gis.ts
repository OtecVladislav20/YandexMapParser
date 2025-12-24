import { By, until, WebElement } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";
import { logger } from "../logger.js";


const CAPTCHA_RE = /not a robot|не робот|подтверд/i;

class GisParser extends AbstractParser {
	async openReviewsPage() {
    	try {
    	    const tab = await this.driver.wait(until.elementLocated(By.xpath("//a[contains(@href,'tab/reviews')]")), 10000);
    	    await this.driver.executeScript("arguments[0].scrollIntoView(true);", tab);
    	    await this.driver.executeScript("arguments[0].click();", tab);
    	    await this.driver.wait(until.elementLocated(By.className("_1k5soqfl")), 10000);
    	    return true;
    	} catch (e) {
    	    return false;
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
		return await this.tryText(By.className("_y10azs"));
	}

	async getCountReviews() {
		return await this.tryText(By.className("_jspzdm"));
	}

	async getReviews(): Promise<unknown[]> {
	    const ok = await this.openReviewsPage();
	    if (!ok) return [];

	    const reviews: Array<
		{ 
			name: string | null; 
			text: string | null; 
			raiting: number | null; 
			avatar: string | null; 
			date: string | null;
		}> = [];

	    let loaded = 0;

	    for (let i = 0; i < 10 && loaded < 20; i++) {
	      	await this.driver.executeScript("window.scrollBy(0, 600)");
	      	await this.driver.sleep(400);

	      	const blocks = await this.driver.findElements(By.className("_1k5soqfl"));

	      	for (const block of blocks) {
	      	  	if (loaded >= 20) break;
				
	      	  	let reviewerName: string | null = null;
	      	  	let text: string | null = null;
	      	  	let avatar: string | null = null;
	      	  	let raiting: number | null = null;
				let date: string | null = null;
				
	      	  	try {
	      	  	  	const reviewrHtml = await block.findElements(By.className("_16s5yj36"));
	      	  	  	reviewerName = reviewrHtml[0] ? this.normalizeText(await reviewrHtml[0].getAttribute("textContent")) : null;
	      	  	} catch {}
			  
	      	  	try {
	      	  	  	const textHtml = await block.findElements(By.css("div._49x36f"));
	      	  	  	text = textHtml[0]
  						? this.normalizeText(await textHtml[0].getAttribute("textContent"))
  						: null;
	      	  	} catch {}
			  
	      	  	try {
	      	  	  	const ratingBlocks = await block.findElements(By.className("_1fkin5c"));
	      	  	  	if (ratingBlocks[0]) {
	      	  	  	  	const spans = await ratingBlocks[0].findElements(By.css("span"));
	      	  	  	  	raiting = spans.length;
	      	  	  	}
	      	  	} catch {}
			  
	      	  	try {
	      	  	  	const avatarHtml: WebElement = await block.findElement(By.className("_1dk5lq4"));
	      	  	  	const style = await avatarHtml.getAttribute("style");
	      	  	  	if (style && style.includes("url(")) {
	      	  	  	  	avatar = style.split("url(")[1].split(")")[0].replace(/["']/g, "");
	      	  	  	}
	      	  	} catch {}

				try {
					const dateHtml = await block.findElements(By.css("div._a5f6uz"));
					date = dateHtml[0]
  						? (this.normalizeText(await dateHtml[0].getAttribute("textContent"))?.split(",")[0].trim() ?? null)
  						: null;
				} catch {}
			  
	      	  	reviews.push({ name: reviewerName, text, raiting, avatar, date });
	      	  	loaded++;
	      	}
	    }

	    return reviews;
	}
}

export async function parse2gis(url: string, profileId: string) {
	return await withDriver(profileId, async (driver) => {
		const parser = new GisParser(driver);
		return await parser.parse(url);
	});
}

