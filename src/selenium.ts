import { Builder, type WebDriver } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js";


export async function createDriver(profileId: string) {
    const remoteUrl = process.env.SELENIUM_REMOTE_URL;
    if (!remoteUrl) throw new Error("SELENIUM_REMOTE_URL не задан");

    const options = new chrome.Options();
    options.addArguments(
        "--disable-gpu",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--window-size=1920,1080"
    );

    const base = process.env.CHROME_PROFILE_BASE;

    if (base) {
        options.addArguments(`--user-data-dir=${base.replace(/\/$/, "")}/${profileId}`);
        options.addArguments("--profile-directory=Default");
    }

    const driver = await new Builder()
        .usingServer(remoteUrl)
        .forBrowser("chrome")
        .setChromeOptions(options)
        .build();

    return driver;
}

export async function withDriver<T>(
    profileId: string,
    fn: (driver: WebDriver) => Promise<T>
): Promise<T> {
    const driver = await createDriver(profileId);
    try {
        return await fn(driver);
    } finally {
        await driver.quit().catch(() => {});
    }
}
