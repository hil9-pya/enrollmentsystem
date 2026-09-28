export function getApiRateLimitMax(environment) {
  return environment === 'production' ? 500 : 2000;
}
