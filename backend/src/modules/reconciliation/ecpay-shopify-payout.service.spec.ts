import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EcpayShopifyPayoutService } from './ecpay-shopify-payout.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ProviderPayoutReconciliationService } from './provider-payout-reconciliation.service';

describe('EcpayShopifyPayoutService - payout protocol and parsing', () => {
  const generalApiUrl =
    'https://ecpayment.ecpay.com.tw/1.0.0/Cashier/QueryTradeMedia';
  const tradeMediaApiUrl =
    'https://vendor.ecpay.com.tw/PaymentMedia/TradeNoAio';
  const creditFundingApiUrl =
    'https://payment.ecpay.com.tw/CreditDetail/FundingReconDetail';
  const shopifyApiUrl =
    'https://ecpayment.ecpay.com.tw/Cashier/ShopifyQueryTradeMedia';

  const createService = (profile: Record<string, unknown>) => {
    const values: Record<string, string> = {
      ECPAY_MERCHANTS_JSON: JSON.stringify([profile]),
      ECPAY_SHOPIFY_MERCHANT_ID: '',
      ECPAY_SHOPIFY_HASH_KEY: '',
      ECPAY_SHOPIFY_HASH_IV: '',
    };
    const configService = {
      get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
    } as unknown as ConfigService;

    return new EcpayShopifyPayoutService(
      configService,
      {} as PrismaService,
      {
        importProviderPayouts: jest.fn(),
      } as unknown as ProviderPayoutReconciliationService,
    );
  };

  const mockCsvResponse = (csv: string) => {
    jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => csv,
    } as Response);
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the general payout API and keeps negative refund fees', async () => {
    const service = createService({
      key: 'groupbuy-main',
      merchantId: '3150241',
      hashKey: '1234567890123456',
      hashIv: 'abcdefghijklmnop',
      apiKind: 'general',
      apiUrl: generalApiUrl,
      entityId: 'tw-entity-001',
      syncEnabled: false,
      lookbackDays: 14,
      dateType: '2',
    });
    mockCsvResponse(
      [
        '特店交易編號,綠界交易編號,交易日期,付款方式,手續費率,結算日期,撥款日期,交易金額,金流手續費,平台手續費,退款金額,應收款項(淨額),金流處理費',
        'ORDER-1,EC-1,2026/08/11 13:27:00,ATM,1%,2026/08/12 00:00:00,2026/08/12 00:00:00,1290,15,0,0,1275,0',
        'ORDER-2,EC-2,2026/07/03 19:47:00,信用卡,2%,2026/07/21 00:00:00,2026/07/28 00:00:00,-2180,-43.6,0,0,-2136.4,0',
      ].join('\n'),
    );

    const result = await service.previewPayouts({
      merchantKey: 'groupbuy-main',
      entityId: 'tw-entity-001',
      beginDate: '2026-07-28',
      endDate: '2026-08-28',
      dateType: '2',
    });

    expect(fetch).toHaveBeenCalledWith(
      generalApiUrl,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result).toMatchObject({
      dryRun: true,
      imported: false,
      apiKind: 'general',
      merchantId: '3150241',
      recordCount: 2,
      totals: {
        grossAmount: -890,
        feeAmount: -28.6,
        netAmount: -861.4,
        negativeRowCount: 1,
      },
    });
    expect(result.sampleRows[0]).toMatchObject({
      externalOrderId: 'ORDER-1',
      providerTradeNo: 'EC-1',
      payoutDate: '2026/08/12 00:00:00',
      feeAmount: 15,
      netAmount: 1275,
    });
  });

  it('uses the enabled trade-media protocol and derives the total fee from net payout', async () => {
    const service = createService({
      key: 'groupbuy-secondary',
      merchantId: '3290494',
      hashKey: '1234567890123456',
      hashIv: 'abcdefghijklmnop',
      apiKind: 'trade-media',
      apiUrl: tradeMediaApiUrl,
      entityId: 'tw-entity-001',
      syncEnabled: false,
      lookbackDays: 14,
      dateType: '2',
    });
    const tradeMediaCsv = [
      '訂單日期,廠商訂單編號,綠界訂單編號,付款方式,交易金額,手續費率(每筆),手續費,處理費,交易手續費,平台手續費,應收款項(淨額),撥款狀態',
      '=2026-08-20 10:00:00,=ORDER-T1,=EC-T1,ATM櫃員機,=1000,=1%,=10,=5,=2,=3,=980,已撥款',
    ].join('\n');
    const creditFundingCsv = [
      '授權單號,授權碼,關帳單號,訂單編號,交易日期,請款日期,交易金額,手續費,%數,撥款金額,交易處理費',
      '=AUTH-R1,=CODE-R1,=CLOSE-R1,=ORDER-R1,=20260820,=20260821,=-200,=-4,=2%,=-196,=0',
      ',,,,,每日小計:,-970,-20,,-950,0',
    ].join('\n');
    jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => tradeMediaCsv,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => creditFundingCsv,
      } as Response);

    const result = await service.previewPayouts({
      merchantKey: 'groupbuy-secondary',
      beginDate: '2026-08-01',
      endDate: '2026-08-28',
      dateType: '2',
    });

    const tradeMediaRequest = (fetch as jest.Mock).mock
      .calls[0][1] as RequestInit;
    const tradeMediaBody = new URLSearchParams(String(tradeMediaRequest.body));
    const creditRequest = (fetch as jest.Mock).mock.calls[1][1] as RequestInit;
    const creditBody = new URLSearchParams(String(creditRequest.body));
    expect(fetch).toHaveBeenCalledWith(
      tradeMediaApiUrl,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }),
    );
    expect(tradeMediaBody.get('DateType')).toBe('4');
    expect(tradeMediaBody.get('MediaFormated')).toBe('2');
    expect(tradeMediaBody.get('CharSet')).toBe('2');
    expect(tradeMediaBody.get('CheckMacValue')).toMatch(/^[A-F0-9]{64}$/);
    expect(fetch).toHaveBeenCalledWith(
      creditFundingApiUrl,
      expect.objectContaining({ method: 'POST' }),
    );
    expect(creditBody.get('PayDateType')).toBe('enter');
    expect(creditBody.get('StartDate')).toBe('2026-08-01');
    expect(creditBody.get('EndDate')).toBe('2026-08-28');
    expect(creditBody.get('CheckMacValue')).toMatch(/^[A-F0-9]{64}$/);
    expect(result).toMatchObject({
      apiKind: 'trade-media',
      source: 'ecpay.trade-media-api',
      recordCount: 2,
      totals: {
        grossAmount: 800,
        feeAmount: 16,
        gatewayFeeAmount: 6,
        processingFeeAmount: 5,
        platformFeeAmount: 3,
        netAmount: 784,
        negativeRowCount: 1,
      },
    });
    expect(result.sampleRows[0]).toMatchObject({
      externalOrderId: 'ORDER-T1',
      providerTradeNo: 'EC-T1',
      transactionDate: '2026-08-20 10:00:00',
      feeAmount: 20,
      netAmount: 980,
    });
  });

  it('matches the official ECPay SHA-256 CheckMacValue example', () => {
    const service = createService({
      key: 'official-example',
      merchantId: '3002607',
      hashKey: 'pwFHCqoQZGmho4w6',
      hashIv: 'EkRm7iFT261dpevs',
      apiKind: 'trade-media',
      apiUrl: tradeMediaApiUrl,
      syncEnabled: false,
      lookbackDays: 14,
      dateType: '2',
    });

    const checkMacValue = (
      service as unknown as {
        createCheckMacValue: (
          fields: Record<string, string>,
          profile: Record<string, string>,
        ) => string;
      }
    ).createCheckMacValue(
      {
        TradeDesc: '促銷方案',
        PaymentType: 'aio',
        MerchantTradeDate: '2023/03/12 15:30:23',
        MerchantTradeNo: 'ecpay20230312153023',
        MerchantID: '3002607',
        ReturnURL: 'https://www.ecpay.com.tw/receive.php',
        ItemName: 'Apple iphone 15',
        TotalAmount: '30000',
        ChoosePayment: 'ALL',
        EncryptType: '1',
      },
      {
        hashKey: 'pwFHCqoQZGmho4w6',
        hashIv: 'EkRm7iFT261dpevs',
      },
    );

    expect(checkMacValue).toBe(
      '6C51C9E6888DE861FD62FB1DD17029FC742634498FD813DC43D4243B5685B840',
    );
  });

  it('does not double count Shopify processing fees', async () => {
    const service = createService({
      key: 'shopify-main',
      merchantId: '3290494',
      hashKey: '1234567890123456',
      hashIv: 'abcdefghijklmnop',
      apiKind: 'shopify',
      apiUrl: shopifyApiUrl,
      entityId: 'tw-entity-001',
      syncEnabled: false,
      lookbackDays: 14,
      dateType: '2',
    });
    mockCsvResponse(
      [
        '廠商訂單編號,綠界交易編號,PaymentID,交易日期,付款方式,結算日期,撥款日期,交易金額,手續費,手續費率,退款金額,金流處理費',
        'SHOP-1,EC-S1,PAY-1,2026/08/20 10:00:00,信用卡,2026/08/21 00:00:00,2026/08/28 00:00:00,1000,30,3%,0,5',
      ].join('\n'),
    );

    const result = await service.previewPayouts({
      merchantKey: 'shopify-main',
      beginDate: '2026-08-01',
      endDate: '2026-08-28',
      dateType: '2',
    });

    expect(result.totals).toMatchObject({
      grossAmount: 1000,
      feeAmount: 30,
      gatewayFeeAmount: 25,
      processingFeeAmount: 5,
      netAmount: 970,
    });
  });

  it('rejects Shopify PaymentID queries on a general merchant profile', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    const service = createService({
      key: 'groupbuy-main',
      merchantId: '3150241',
      hashKey: '1234567890123456',
      hashIv: 'abcdefghijklmnop',
      apiKind: 'general',
      apiUrl: generalApiUrl,
      entityId: 'tw-entity-001',
      syncEnabled: false,
      lookbackDays: 14,
      dateType: '2',
    });

    await expect(
      service.previewPayouts({
        merchantKey: 'groupbuy-main',
        paymentId: 'SHOPIFY-PAYMENT-ID',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
