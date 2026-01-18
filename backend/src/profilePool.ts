export class ProfilePool {
    private profiles: string[];
    private waiters: Array<(profileId: string) => void>;

    constructor(size: number) {
        this.profiles = [];

        for (let i = 0; i < size; i++) {
            this.profiles.push(`profile-${i}`);
        }

        this.waiters = [];
    }

    async acquire(): Promise<string> {
        const id = this.profiles.pop();
        if (id) return id;

        return await new Promise<string>((resolve) => {
            this.waiters.push(resolve);
        });
    }

    release(profileId: string) {
        const waiter = this.waiters.shift();
        if (waiter) return waiter(profileId);
        this.profiles.push(profileId);
    }
}
