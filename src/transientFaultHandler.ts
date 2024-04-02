import { ConsecutiveBreaker, ExponentialBackoff, retry, handleAll, circuitBreaker, wrap } from 'cockatiel';

export async function attempt(fn: () => boolean)
{
    const retryPolicy = retry(handleAll, { maxAttempts: 3, backoff: new ExponentialBackoff() });
  
    const circuitBreakerPolicy = circuitBreaker(handleAll, {
      halfOpenAfter: 10 * 1000,
      breaker: new ConsecutiveBreaker(5),
    });
  
    const retryWithBreaker = wrap(retryPolicy, circuitBreakerPolicy);

    await retryWithBreaker.execute(fn);
}