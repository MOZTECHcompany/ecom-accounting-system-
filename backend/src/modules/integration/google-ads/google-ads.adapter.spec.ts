import { ConfigService } from '@nestjs/config';
import {
  GoogleAdsAccountConfig,
  GoogleAdsAdapter,
} from './google-ads.adapter';

describe('GoogleAdsAdapter account credentials', () => {
  const adapter = new GoogleAdsAdapter(
    new ConfigService({
      GOOGLE_ADS_CLIENT_ID: 'default-client',
      GOOGLE_ADS_CLIENT_SECRET: 'default-secret',
      GOOGLE_ADS_REFRESH_TOKEN: 'default-refresh',
      GOOGLE_ADS_MOZTECH_REFRESH_TOKEN: 'moztech-refresh',
      GOOGLE_ADS_ACCOUNTS_JSON: JSON.stringify([
        {
          customerId: '805-257-9705',
          loginCustomerId: '621-562-1647',
          refreshTokenEnv: 'GOOGLE_ADS_MOZTECH_REFRESH_TOKEN',
        },
      ]),
    }),
  ) as unknown as {
    getConfiguredAccounts: () => GoogleAdsAccountConfig[];
    getRefreshToken: (account?: GoogleAdsAccountConfig) => string;
  };

  it('preserves per-account credential environment names', () => {
    expect(adapter.getConfiguredAccounts()[0]).toMatchObject({
      customerId: '8052579705',
      loginCustomerId: '621-562-1647',
      refreshTokenEnv: 'GOOGLE_ADS_MOZTECH_REFRESH_TOKEN',
    });
  });

  it('uses the account refresh token before the default refresh token', () => {
    expect(adapter.getRefreshToken(adapter.getConfiguredAccounts()[0])).toBe(
      'moztech-refresh',
    );
    expect(adapter.getRefreshToken()).toBe('default-refresh');
  });
});
