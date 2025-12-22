export class ProfilePool {
    constructor(size) {
        this.profiles = [];

        for (let i = 0; i < size; i++) {
            this.profiles.push(`profile-${i}`);
        }

        this.waiters = [];
    }

    async acquire() {
        if (this.profiles.length > 0) return this.profiles.pop();
        return await new Promise((resolve) => this.waiters.push(resolve));
    }

    release(profileId) {
        const waiter = this.waiters.shift();
        if (waiter) return waiter(profileId);
        this.profiles.push(profileId);
    }
}
