import {
  resolveConfiguredAdsBrandMapping,
  summarizeAdsBrandMappingCoverage,
  UNMAPPED_ADS_BRAND,
} from './ads-brand-mapping';

describe('authoritative ads account brand mapping', () => {
  it('uses only an explicit account configuration for a single-brand account', () => {
    expect(
      resolveConfiguredAdsBrandMapping('meta', 'act_123', {
        brand: 'MOZTECH',
        reportBrand: 'MOZTECH_TW',
      }),
    ).toMatchObject({
      accountRef: 'act_123',
      resolvedBrand: 'MOZTECH_TW',
      mappingStatus: 'mapped',
      mappingSource: 'account_config.reportBrand',
      diagnostic: null,
    });
  });

  it('requires an exact campaign mapping for a portfolio account', () => {
    const account = {
      brandMode: 'portfolio' as const,
      allowedBrands: ['MOZTECH', 'BONSON', 'AIRITY'],
      campaignBrandMappings: [
        { campaignId: 'campaign-airity-1', brand: 'AIRITY' },
      ],
    };

    expect(
      resolveConfiguredAdsBrandMapping(
        'meta',
        'act_140675171327599',
        account,
        'campaign-airity-1',
      ),
    ).toMatchObject({
      resolvedBrand: 'AIRITY',
      mappingStatus: 'mapped',
      mappingSource: 'account_config.campaignBrandMapping',
    });
    expect(
      resolveConfiguredAdsBrandMapping(
        'meta',
        'act_140675171327599',
        account,
        'campaign-name-mentions-airity-but-id-is-not-configured',
      ),
    ).toMatchObject({
      resolvedBrand: UNMAPPED_ADS_BRAND,
      mappingStatus: 'unmapped',
      mappingSource: 'none',
    });
  });

  it('fails mapping coverage closed when any analyzed account is unmapped', () => {
    const coverage = summarizeAdsBrandMappingCoverage([
      resolveConfiguredAdsBrandMapping('meta', 'act_1', {
        reportBrand: 'MOZTECH',
      }),
      resolveConfiguredAdsBrandMapping('google', '1234567890', null),
    ]);

    expect(coverage).toMatchObject({
      complete: false,
      totalAccounts: 2,
      mappedAccounts: 1,
      unmappedAccounts: 1,
      coveragePercent: 50,
      unmappedAccountRefs: ['1234567890'],
    });
    expect(coverage.diagnostics[0]).toContain('GOOGLE_ADS_ACCOUNTS_JSON');
  });
});
