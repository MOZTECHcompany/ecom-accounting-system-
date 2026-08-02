import { BadGatewayException, BadRequestException } from '@nestjs/common';

export type AdsCurrencySource = 'platform' | 'account_config';

export type AdsCurrencyResolution = {
  currency: string;
  currencySource: AdsCurrencySource;
};

export type AdsSpendSummary = {
  spendTotalsByCurrency: Record<string, number>;
  spendTotal: number | null;
  spendTotalCurrency: string | null;
};

const ISO_CURRENCY_PATTERN = /^[A-Z]{3}$/;
const SUPPORTED_ISO_CURRENCIES = new Set(Intl.supportedValuesOf('currency'));

function cleanCurrency(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

function isIsoCurrency(value: string) {
  return (
    ISO_CURRENCY_PATTERN.test(value) && SUPPORTED_ISO_CURRENCIES.has(value)
  );
}

export function normalizeConfiguredAdsCurrency(
  value: unknown,
  settingName: string,
) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const normalized = cleanCurrency(value);
  if (!isIsoCurrency(normalized)) {
    throw new BadRequestException(
      `${settingName} must be a valid ISO 4217 currency code`,
    );
  }
  return normalized;
}

export function requireCanonicalAdsCurrency(value: unknown, context: string) {
  const normalized = cleanCurrency(value);
  if (!isIsoCurrency(normalized)) {
    throw new BadGatewayException(
      `${context} is missing a valid source currency`,
    );
  }
  return normalized;
}

export function resolveAdsCurrency(params: {
  provider: 'Meta' | 'Google';
  accountRef: string;
  platformCurrency?: unknown;
  configuredCurrency?: unknown;
  configuredCurrencySource?: AdsCurrencySource;
}): AdsCurrencyResolution {
  const platformProvided =
    params.platformCurrency !== undefined &&
    params.platformCurrency !== null &&
    !(
      typeof params.platformCurrency === 'string' &&
      !params.platformCurrency.trim()
    );
  if (platformProvided) {
    const currency = requireCanonicalAdsCurrency(
      params.platformCurrency,
      `${params.provider} Ads account ${params.accountRef}`,
    );
    return {
      currency,
      currencySource: 'platform',
    };
  }

  const configuredProvided =
    params.configuredCurrency !== undefined &&
    params.configuredCurrency !== null &&
    !(
      typeof params.configuredCurrency === 'string' &&
      !params.configuredCurrency.trim()
    );
  if (configuredProvided) {
    const currency = requireCanonicalAdsCurrency(
      params.configuredCurrency,
      `${params.provider} Ads account ${params.accountRef}`,
    );
    return {
      currency,
      currencySource: params.configuredCurrencySource || 'account_config',
    };
  }

  throw new BadGatewayException(
    `${params.provider} Ads account ${params.accountRef} returned monetary metrics without a source currency and has no explicit per-account currency`,
  );
}

export function summarizeAdsSpend<T>(
  rows: T[],
  getCurrency: (row: T) => unknown,
  getSpend: (row: T) => number,
  context: string,
): AdsSpendSummary {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const currency = requireCanonicalAdsCurrency(getCurrency(row), context);
    const spend = getSpend(row);
    if (!Number.isFinite(spend)) {
      throw new BadGatewayException(
        `${context} contains a non-finite spend amount`,
      );
    }
    totals.set(currency, (totals.get(currency) || 0) + spend);
  }

  const entries = [...totals.entries()].sort(([left], [right]) =>
    left.localeCompare(right),
  );
  const spendTotalsByCurrency = Object.fromEntries(entries);
  const singleCurrency = entries.length === 1 ? entries[0] : null;

  return {
    spendTotalsByCurrency,
    spendTotal: singleCurrency ? singleCurrency[1] : null,
    spendTotalCurrency: singleCurrency ? singleCurrency[0] : null,
  };
}
