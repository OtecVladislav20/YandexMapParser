import { By, until, WebElement } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";
import { logger } from "../logger.js";
import { TReview } from "../types/type-review.js";
import { normalize2gisDate } from "../utils/normalize-date-review.js";


const CAPTCHA_RE = /not a robot|не робот|подтверд/i;
const REVIEW_LIMIT = 150;

class GisParser extends AbstractParser {
	async openReviewsPage() {
    	try {
    	    const tab = await this.driver.wait(until.elementLocated(By.xpath("//a[contains(@href,'tab/reviews')]")), 10000);
    	    await this.driver.executeScript("arguments[0].scrollIntoView(true);", tab);
    	    await this.driver.executeScript("arguments[0].click();", tab);
    	    await this.driver.wait(until.elementLocated(By.className("_1k5soqfl")), 10000);
    	    return true;
    	} catch (e) {
			logger.warn("Не получилось открыть страницу с отзывами '2ГИС'!");
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

	async getRating() {
		try {
			let rating = await this.tryText(By.className("_y10azs"));
			return rating;
		} catch {
			logger.warn("Ошибка получения рейтинга");
			return null;
		}
	}

	async getCountReviews() {
		try {
			let countReviews = await this.tryText(By.className("_jspzdm"));
			return countReviews;

		} catch {
			logger.warn("Ошибка получения кол-ва отзывов");
			return null;
		}
	}

	async getReviews() {
		const ok = await this.openReviewsPage();
		if (!ok) return [];

		const scrollEl = await this.waitLocated(By.css('._jdkjbol'), 10000);

		const getLastKeyFast = async () =>
  			(await this.driver.executeScript(`
  			  const root = arguments[0];
  			  const cards = root.querySelectorAll('._1k5soqfl');
  			  const last = cards[cards.length - 1];
  			  if (!last) return null;
  			  const name = last.querySelector('._16s5yj36')?.textContent?.trim() ?? '';
  			  const date = (last.querySelector('._a5f6uz')?.textContent ?? '').split(',')[0].trim();
  			  const text = last.querySelector('._49x36f')?.textContent?.trim() ?? '';
  			  const stars = last.querySelectorAll('._1fkin5c > span').length;
  			  return name + '||' + date + '||' + stars + '||' + text;
  			`, scrollEl)) as string | null;


		const wheelStep = async (screens = 2) => {
		  await this.driver.executeScript(`
		    const el = arguments[0];
		    const screens = arguments[1];
		    const dy = Math.floor(el.clientHeight * screens);
		    el.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true }));
		    try { el.scrollTop = el.scrollTop + dy; } catch {}
		  `, scrollEl, screens);
		};

		const bounceUp = async (px = 250) => {
		  await this.driver.executeScript(
		    "const el = arguments[0]; const px = arguments[1]; el.scrollTop = Math.max(0, el.scrollTop - px);",
		    scrollEl,
		    px
		  );
		};

		const seen = new Set<string>();
		const reviews: TReview[] = [];

  		let stalled = 0;

		while (reviews.length < REVIEW_LIMIT && stalled < 8) {
			const cards = await scrollEl.findElements(By.css("._1k5soqfl"));
	
			let added = 0;
			for (const card of cards) {
				let reviewerName: string | null = null;
                let text: string | null = null;
                let rating: number | null = null;
                let avatar: string | null = null;
                let date: string | null = null;

				if (reviews.length >= REVIEW_LIMIT) break;

				try {
      			  	const more = await card.findElement(By.css("._156jib9"));
      			  	await this.driver.executeScript("arguments[0].click();", more);
      			} catch {}

				try {
      			  	const nameEl = await card.findElement(By.css("._16s5yj36"));
      			  	reviewerName = this.normalizeText(await nameEl.getAttribute("textContent"));
      			} catch {
					logger.warn("Не удалось получить имя ревьювера");
				}

      			try {
      			  	const textEl = await card.findElement(By.css("._49x36f"));
      			  	text = this.normalizeText(await textEl.getAttribute("textContent"));
      			} catch {
					logger.warn("Не удалось получить текст отзыва");
				}

				try {
      			  	const dateEl = await card.findElement(By.css("._a5f6uz"));
      			  	date = this.normalizeText(await dateEl.getAttribute("textContent"))?.split(",")[0].trim() ?? null;
					date = normalize2gisDate(date);
				} catch {
					logger.warn("Не удалось получить дату отзыва");
				}

				try {
      			  	const stars = await card.findElements(By.css("._1fkin5c > span"));
      			  	rating = stars.length || null;
      			} catch {
					logger.warn("Не удалось получить рейтинг отзыва");
				}

				try {
      			  	const avatarEl = await card.findElement(By.css("._10bkgj3 ._1dk5lq4"));
      			  	const style = await avatarEl.getAttribute("style");
      			  	if (style?.includes("url(")) {
      			  	  	avatar = style.split("url(")[1].split(")")[0].replace(/['\"]/g, "");
      			  	}
      			} catch {
					avatar = 'У пользователя нет фотографии';
				}

				const key = `${reviewerName ?? ""}||${date ?? ""}||${text ?? ""}`;
				if (seen.has(key)) continue;
				seen.add(key);

				reviews.push({ name: reviewerName, text, rating, avatar, date });
				added++;
			}

			const beforeKey = await getLastKeyFast();

			for (let i = 0; i < 6; i++) {
			  await wheelStep(3);
			  await bounceUp(200);
			  await this.driver.sleep(60);
			}

			const progressed = await this.driver
  				.wait(async () => {
  				  const afterKey = await getLastKeyFast();
  				  return !!afterKey && afterKey !== beforeKey;
  				}, 1500)
  				.catch(() => false);

			if (added > 0 || progressed) stalled = 0;
			else stalled++;
		}

		logger.warn(reviews.length, "Найдено отзывов");
		return reviews;
	}
}

export async function parse2gis(url: string, profileId: string) {
	return await withDriver(profileId, async (driver) => {
		const parser = new GisParser(driver);
		return await parser.parse(url);
	});
}

