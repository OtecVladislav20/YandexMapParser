export class ProfilePool {
    constructor(size) {
        this.free = [];

        for (let i = 0; i < size; i++) {
            this.free.push(`profile-${i}`);
        }

        this.waiters = [];
    }

    async acquire() {
        if (this.free.length > 0) return this.free.pop();
        return await new Promise((resolve) => this.waiters.push(resolve));
    }

    release(profileId) {
        const waiter = this.waiters.shift();
        if (waiter) return waiter(profileId);
        this.free.push(profileId);
    }
}
