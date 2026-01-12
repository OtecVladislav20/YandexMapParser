import { By, until, WebElement } from "selenium-webdriver";
import { withDriver } from "../selenium.js";
import { AbstractParser } from "./abstarctParser.js";
import { logger } from "../logger.js";


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

	async getName() {
		return await this.tryText(By.css("h1"));
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

	async getReviews(): Promise<unknown[]> {
		const ok = await this.openReviewsPage();
		if (!ok) return [];

		const anchor = await this.waitLocated(By.css("._1k5soqfl"), 10000);

		const chain = await this.driver.executeScript(`
		  const el = arguments[0];
		  const out = [];
		  for (let n = el; n; n = n.parentElement) {
		    const s = getComputedStyle(n);
		    out.push({
		      tag: n.tagName,
		      cls: n.className,
		      oy: s.overflowY,
		      o: s.overflow,
		      top: n.scrollTop,
		      ch: n.clientHeight,
		      sh: n.scrollHeight
		    });
		    if (n === document.body) break;
		  }
		  return out;
		`, anchor);

		logger.warn({ chain }, "2gis scroll parents");

		const scrollEl = (await this.driver.executeScript(`
		  let n = arguments[0];
		  let best = null;
		  let bestDelta = 0;

		  while (n && n !== document.body) {
		    const delta = (n.scrollHeight || 0) - (n.clientHeight || 0);
		    if (delta > bestDelta) { bestDelta = delta; best = n; }
		    n = n.parentElement;
		  }

		  return best || document.scrollingElement || document.documentElement;
		`, anchor)) as WebElement;

		const getScrollInfo = async () =>
  		(await this.driver.executeScript(
  		  `const el=arguments[0]; const s=getComputedStyle(el);
  		   return {top: el.scrollTop, ch: el.clientHeight, sh: el.scrollHeight, oy: s.overflowY, o: s.overflow};`,
  		  scrollEl
  		)) as { top: number; ch: number; sh: number; oy: string; o: string };

		const wheelScroll = async (deltaY = 900) => {
		  await this.driver.executeScript(
		    `const el=arguments[0], dy=arguments[1];
		     el.dispatchEvent(new WheelEvent('wheel', {deltaY: dy, bubbles: true, cancelable: true}));
		     el.scrollTop = el.scrollTop + dy;`,
		    scrollEl,
		    deltaY
		  );
		};

		const before = await getScrollInfo();
		await wheelScroll(900);
		await this.driver.sleep(200);
		const after = await getScrollInfo();
		logger.error({ before, after }, "2gis scroll check");

		const seen = new Set<string>();
		const reviews: Array<{
          	name: string | null;
          	text: string | null;
          	raiting: number | null;
          	avatar: string | null;
          	date: string | null;
        }> = [];

  		let stalled = 0;
  		let lastUnique = 0;

		while (reviews.length < REVIEW_LIMIT && stalled < 20) {
			const cards = await this.driver.findElements(By.className("_1k5soqfl"));
	
			for (const card of cards) {
				let reviewerName: string | null = null;
                let text: string | null = null;
                let raiting: number | null = null;
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
      			} catch {
					logger.warn("Не удалось получить дату отзыва");
				}

				try {
      			  	const stars = await card.findElements(By.css("._1fkin5c > span"));
      			  	raiting = stars.length || null;
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

				reviews.push({ name: reviewerName, text, raiting, avatar, date });
			}

			if (reviews.length === lastUnique) stalled++;
			else {
			  	stalled = 0;
			  	lastUnique = reviews.length;
			}

			await this.driver.executeScript(`
			  const el = arguments[0];
			  const dy = 900;
			  el.dispatchEvent(new WheelEvent('wheel', { deltaY: dy, bubbles: true, cancelable: true }));
			  // на всякий случай “подтолкнём” scrollTop, если он поддерживается
			  try { el.scrollTop = el.scrollTop + dy; } catch {}
			`, scrollEl);

			await this.driver.sleep(350);
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

