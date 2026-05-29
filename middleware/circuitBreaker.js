class CircuitBreaker {
    constructor({ failureThreshold = 5, cooldownMs = 15000, halfOpenSuccessThreshold = 2 } = {}) {
        this.failureThreshold = failureThreshold;
        this.cooldownMs = cooldownMs;
        this.halfOpenSuccessThreshold = halfOpenSuccessThreshold;
        this.failureCount = 0;
        this.successCount = 0;
        this.state = 'CLOSED';
        this.openedAt = 0;
    }

    canPass() {
        if (this.state === 'OPEN') {
            return (Date.now() - this.openedAt) >= this.cooldownMs;
        }
        return true;
    }

    async fire(fn) {
        if (this.state === 'OPEN') {
            if (!this.canPass()) {
                throw new Error('Circuit breaker is open');
            }
            this.state = 'HALF_OPEN';
            this.successCount = 0;
        }

        try {
            const result = await fn();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    onSuccess() {
        if (this.state === 'HALF_OPEN') {
            this.successCount += 1;
            if (this.successCount >= this.halfOpenSuccessThreshold) {
                this.state = 'CLOSED';
                this.failureCount = 0;
                this.successCount = 0;
            }
            return;
        }

        this.failureCount = 0;
    }

    onFailure() {
        this.failureCount += 1;
        if (this.failureCount >= this.failureThreshold) {
            this.state = 'OPEN';
            this.openedAt = Date.now();
        }
    }
}

const circuitBreaker = (breaker) => async (req, res, next) => {
    try {
        await breaker.fire(() => Promise.resolve(next()));
    } catch (error) {
        return res.status(503).json({ success: false, message: 'Service temporarily unavailable' });
    }
};

module.exports = { CircuitBreaker, circuitBreaker };