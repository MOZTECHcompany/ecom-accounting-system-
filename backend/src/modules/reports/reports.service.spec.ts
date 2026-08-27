import { ConfigService } from '@nestjs/config';
import { ReportsService } from './reports.service';

describe('ReportsService ad brand mapping', () => {
  const config = new ConfigService({
    META_ADS_ACCOUNTS_JSON: JSON.stringify([
      {
        accountId: 'act_938172323581797',
        brand: 'MOZTECH',
        reportBrand: 'MOZTECH_TW',
      },
    ]),
    GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
      {
        customerId: '8052579705',
        brand: 'MOZTECH',
        reportBrand: 'MOZTECH_TW',
      },
    ]),
  });
  const service = new ReportsService({} as never, config) as unknown as {
    getMetaAdsConfiguredBrand: (accountId: string) => string;
    getGoogleAdsConfiguredBrand: (customerId: string) => string;
  };

  it('uses the brand family for Meta instead of splitting by report market', () => {
    expect(service.getMetaAdsConfiguredBrand('act_938172323581797')).toBe(
      'MOZTECH',
    );
  });

  it('uses the brand family for Google Ads instead of splitting by report market', () => {
    expect(service.getGoogleAdsConfiguredBrand('8052579705')).toBe('MOZTECH');
  });
});
