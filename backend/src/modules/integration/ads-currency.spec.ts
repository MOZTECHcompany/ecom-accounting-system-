import {
  normalizeConfiguredAdsCurrency,
  resolveAdsCurrency,
  summarizeAdsSpend,
} from './ads-currency';

describe('advertising currency contract', () => {
  it('normalizes explicit per-account currency and rejects malformed codes', () => {
    expect(
      normalizeConfiguredAdsCurrency(' usd ', 'test account currency'),
    ).toBe('USD');
    expect(() =>
      normalizeConfiguredAdsCurrency('US', 'test account currency'),
    ).toThrow('must be a valid ISO 4217 currency code');
    expect(() =>
      normalizeConfiguredAdsCurrency('ZZZ', 'test account currency'),
    ).toThrow('must be a valid ISO 4217 currency code');
  });

  it('always prefers a platform currency over explicit account configuration', () => {
    expect(
      resolveAdsCurrency({
        provider: 'Meta',
        accountRef: 'act_123',
        platformCurrency: 'usd',
        configuredCurrency: 'TWD',
        configuredCurrencySource: 'account_config',
      }),
    ).toEqual({
      currency: 'USD',
      currencySource: 'platform',
    });
  });

  it('does not hide a malformed platform currency behind configuration', () => {
    expect(() =>
      resolveAdsCurrency({
        provider: 'Google',
        accountRef: '1234567890',
        platformCurrency: 'ZZZ',
        configuredCurrency: 'TWD',
        configuredCurrencySource: 'account_config',
      }),
    ).toThrow(
      'Google Ads account 1234567890 is missing a valid source currency',
    );
  });

  it('never creates a cross-currency scalar total', () => {
    expect(
      summarizeAdsSpend(
        [
          { currency: 'TWD', spend: 100 },
          { currency: 'USD', spend: 20 },
        ],
        (row) => row.currency,
        (row) => row.spend,
        'test preview',
      ),
    ).toEqual({
      spendTotalsByCurrency: { TWD: 100, USD: 20 },
      spendTotal: null,
      spendTotalCurrency: null,
    });
  });

  it('keeps the compatibility scalar only for one attested currency', () => {
    expect(
      summarizeAdsSpend(
        [
          { currency: 'TWD', spend: 100 },
          { currency: 'TWD', spend: 50 },
        ],
        (row) => row.currency,
        (row) => row.spend,
        'test preview',
      ),
    ).toEqual({
      spendTotalsByCurrency: { TWD: 150 },
      spendTotal: 150,
      spendTotalCurrency: 'TWD',
    });
  });
});
