import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createCipheriv, createDecipheriv } from 'crypto';
import {
  InvoiceAdapter,
  IssueInvoicePayload,
  IssueInvoiceResult,
  QueryInvoiceStatusPayload,
  QueryInvoiceStatusResult,
} from '../interfaces/invoice-adapter.interface';
import {
  EcpayEinvoiceConfigService,
  EcpayEinvoiceProfile,
} from '../services/ecpay-einvoice-config.service';

@Injectable()
export class EcpayEinvoiceAdapter implements InvoiceAdapter {
  constructor(private readonly configService: EcpayEinvoiceConfigService) {}

  getReadiness() {
    return this.configService.getReadiness();
  }

  assertReadyForMerchant(merchantKey?: string | null) {
    if (!this.configService.isIssuingEnabled()) {
      throw new BadRequestException(
        '綠界電子發票 profile 已可檢查，但正式開票開關尚未啟用；請先完成 stage / 小額測試，再設定 ECPAY_EINVOICE_ISSUING_ENABLED=true。',
      );
    }

    const profile = this.configService.resolveProfile(merchantKey);
    if (!profile) {
      throw new BadRequestException(
        merchantKey
          ? `找不到綠界電子發票帳號設定：${merchantKey}。請檢查 ECPAY_EINVOICE_ACCOUNTS_JSON。`
          : '請先指定可用的綠界電子發票 merchantKey；目前未能唯一判斷要使用 3290494 或 3150241。',
      );
    }

    const missing = this.configService.getProfileMissingFields(profile);
    if (missing.length > 0) {
      throw new BadRequestException(
        `綠界電子發票帳號 ${profile.key || profile.merchantId} 尚未可正式開票，缺少：${missing.join(
          ', ',
        )}。請補 ECPAY_EINVOICE_ACCOUNTS_JSON。`,
      );
    }
  }

  async issueInvoice(
    payload: IssueInvoicePayload,
  ): Promise<IssueInvoiceResult> {
    const profile = this.configService.resolveProfile(
      payload.merchantKey,
      payload.merchantId,
    );
    if (!profile) {
      throw new BadRequestException(
        '找不到可用的綠界電子發票 merchant profile。',
      );
    }

    this.assertReadyForMerchant(profile.key);

    const ecpayPayload = this.toEcpayB2cIssuePayload(payload, profile);
    const json = await this.postEncrypted(
      profile.issueUrl,
      ecpayPayload,
      profile,
    );
    const result = this.decryptResponse(json, profile);

    if (Number(result?.RtnCode) !== 1) {
      throw new ServiceUnavailableException(
        String(result?.RtnMsg || json?.TransMsg || '綠界電子發票開立未成功。'),
      );
    }

    if (!result?.InvoiceNo) {
      throw new ServiceUnavailableException(
        '綠界電子發票開立回應缺少 InvoiceNo，已阻擋本地寫入避免產生錯誤發票狀態。',
      );
    }

    return {
      success: true,
      provider: 'ecpay',
      merchantKey: profile.key,
      merchantId: profile.merchantId,
      invoiceNumber: String(result?.InvoiceNo || ''),
      invoiceDate:
        typeof result?.InvoiceDate === 'string' ? result.InvoiceDate : null,
      randomNumber:
        typeof result?.RandomNumber === 'string' ? result.RandomNumber : null,
      externalInvoiceId:
        typeof result?.InvoiceNo === 'string' ? result.InvoiceNo : null,
      raw: result as Record<string, unknown>,
    };
  }

  async queryInvoiceStatus(
    payload: QueryInvoiceStatusPayload,
  ): Promise<QueryInvoiceStatusResult> {
    const profile = this.configService.resolveProfile(
      payload.merchantKey,
      payload.merchantId,
    );
    this.assertProfileConfigured(profile, payload.merchantKey);

    const json = await this.postEncrypted(
      profile.queryUrl,
      {
        MerchantID: profile.merchantId,
        InvoiceNo: payload.invoiceNumber.trim(),
        InvoiceDate: payload.invoiceDate.trim(),
      },
      profile,
    );
    const result = this.decryptResponse(json, profile);
    const rtnCode = Number(result?.RtnCode);

    return {
      success: rtnCode === 1,
      provider: 'ecpay',
      merchantKey: profile.key,
      merchantId: profile.merchantId,
      invoiceNumber: payload.invoiceNumber.trim(),
      invoiceDate: payload.invoiceDate.trim(),
      invoiceIssuedStatus:
        rtnCode === 1 ? 'issued' : this.detectVoidStatus(result),
      rawMessage:
        typeof result?.RtnMsg === 'string'
          ? result.RtnMsg
          : typeof json?.TransMsg === 'string'
            ? json.TransMsg
            : null,
      raw: result as Record<string, unknown>,
    };
  }

  async queryInvoiceList(payload: {
    merchantKey?: string | null;
    merchantId?: string | null;
    beginDate: string;
    endDate: string;
    page?: number | null;
    pageSize?: number | null;
    dataType?: 1 | 2;
    queryInvalid?: string | null;
    queryUpload?: string | null;
    queryIdentifier?: string | null;
    queryCategory?: string | null;
  }) {
    const profile = this.configService.resolveProfile(
      payload.merchantKey,
      payload.merchantId,
    );
    this.assertProfileConfigured(profile, payload.merchantKey);

    const page = Math.max(Math.floor(Number(payload.page || 1)), 1);
    const pageSize = Math.min(
      Math.max(Math.floor(Number(payload.pageSize || 30)), 1),
      200,
    );

    const json = await this.postEncrypted(
      profile.issueListUrl,
      {
        MerchantID: profile.merchantId,
        BeginDate: payload.beginDate,
        EndDate: payload.endDate,
        NumPerPage: pageSize,
        ShowingPage: page,
        DataType: payload.dataType || 1,
        Query_Invalid: payload.queryInvalid || '0',
        Query_Upload: payload.queryUpload || '0',
        Query_Identifier: payload.queryIdentifier || '0',
        Query_Category: payload.queryCategory || '0',
      },
      profile,
    );
    const result = this.decryptResponse(json, profile);

    return {
      success: Number(result?.RtnCode) === 1,
      provider: 'ecpay',
      merchantKey: profile.key,
      merchantId: profile.merchantId,
      beginDate: payload.beginDate,
      endDate: payload.endDate,
      page,
      pageSize,
      totalCount: Number(result?.TotalCount || 0),
      rawMessage:
        typeof result?.RtnMsg === 'string'
          ? result.RtnMsg
          : typeof json?.TransMsg === 'string'
            ? json.TransMsg
            : null,
      invoiceData: Array.isArray(result?.InvoiceData)
        ? result.InvoiceData
        : [],
      raw: result as Record<string, unknown>,
    };
  }

  async queryGovInvoiceWordSettings(payload: {
    merchantKey?: string | null;
    merchantId?: string | null;
    invoiceYear: string;
  }) {
    const profile = this.configService.resolveProfile(
      payload.merchantKey,
      payload.merchantId,
    );
    this.assertProfileConfigured(profile, payload.merchantKey);

    const json = await this.postEncrypted(
      profile.wordSettingUrl,
      {
        MerchantID: profile.merchantId,
        InvoiceYear: payload.invoiceYear,
      },
      profile,
    );
    const result = this.decryptResponse(json, profile);

    return {
      success: Number(result?.RtnCode) === 1,
      provider: 'ecpay',
      merchantKey: profile.key,
      merchantId: profile.merchantId,
      invoiceYear: payload.invoiceYear,
      rawMessage:
        typeof result?.RtnMsg === 'string'
          ? result.RtnMsg
          : typeof json?.TransMsg === 'string'
            ? json.TransMsg
            : null,
      invoiceInfo: Array.isArray(result?.InvoiceInfo)
        ? result.InvoiceInfo
        : [],
      raw: result as Record<string, unknown>,
    };
  }

  private toEcpayB2cIssuePayload(
    payload: IssueInvoicePayload,
    profile: EcpayEinvoiceProfile,
  ) {
    if (!payload.buyerEmail && !payload.buyerPhone) {
      throw new BadRequestException(
        '綠界電子發票開立至少需要買方 email 或手機號碼。',
      );
    }

    if (payload.invoiceType === 'B2B' && !payload.buyerTaxId) {
      throw new BadRequestException('B2B 發票需提供買方統一編號。');
    }

    const items = payload.items.map((item, index) => ({
      ItemSeq: index + 1,
      ItemName: item.name || '商品',
      ItemCount: Math.max(Number(item.quantity || 1), 1),
      ItemWord: '件',
      ItemPrice: Math.round(Number(item.unitPrice || item.amount || 0)),
      ItemTaxType: '1',
      ItemAmount: Math.round(Number(item.amount || 0)),
      ItemRemark: '',
    }));

    return {
      MerchantID: profile.merchantId,
      RelateNumber: payload.relateNumber,
      CustomerName: payload.buyerName || '',
      CustomerAddr: payload.buyerAddress || '',
      CustomerPhone: payload.buyerPhone || '',
      CustomerEmail: payload.buyerEmail || '',
      CustomerIdentifier:
        payload.invoiceType === 'B2B' ? payload.buyerTaxId || '' : '',
      Print: payload.invoiceType === 'B2B' ? '1' : '0',
      Donation: '0',
      LoveCode: '',
      CarrierType: '',
      CarrierNum: '',
      TaxType: '1',
      SalesAmount: Math.round(payload.totalAmount),
      InvoiceRemark: '',
      InvType: '07',
      vat: '1',
      Items: items,
    };
  }

  private async postEncrypted(
    url: string,
    payload: Record<string, unknown>,
    profile: EcpayEinvoiceProfile,
  ) {
    const body = {
      MerchantID: profile.merchantId,
      RqHeader: {
        Timestamp: Math.floor(Date.now() / 1000),
      },
      Data: this.encryptPayload(payload, profile),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `綠界電子發票 API 呼叫失敗 (${response.status})`,
      );
    }

    if (Number(json?.TransCode) !== 1 || !json?.Data) {
      throw new ServiceUnavailableException(
        json?.TransMsg || '綠界電子發票 API 未成功受理。',
      );
    }

    return json;
  }

  private encryptPayload(
    payload: Record<string, unknown>,
    profile: EcpayEinvoiceProfile,
  ) {
    const encoded = encodeURIComponent(JSON.stringify(payload));
    const cipher = createCipheriv(
      'aes-128-cbc',
      Buffer.from(profile.hashKey, 'utf8'),
      Buffer.from(profile.hashIv, 'utf8'),
    );
    let encrypted = cipher.update(encoded, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    return encrypted;
  }

  private decryptResponse(json: any, profile: EcpayEinvoiceProfile) {
    if (json?.Data && typeof json.Data === 'object') {
      return json.Data;
    }

    if (typeof json?.Data === 'string') {
      const rawData = json.Data.trim();
      if (rawData.startsWith('{') || rawData.startsWith('[')) {
        return JSON.parse(rawData);
      }
    }

    const decipher = createDecipheriv(
      'aes-128-cbc',
      Buffer.from(profile.hashKey, 'utf8'),
      Buffer.from(profile.hashIv, 'utf8'),
    );
    let decrypted = decipher.update(json.Data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    const decoded = decodeURIComponent(decrypted);
    return decoded.trim() ? JSON.parse(decoded) : {};
  }

  private assertProfileConfigured(
    profile: EcpayEinvoiceProfile | undefined,
    merchantKey?: string | null,
  ): asserts profile is EcpayEinvoiceProfile {
    if (!profile) {
      throw new BadRequestException(
        merchantKey
          ? `找不到綠界電子發票帳號設定：${merchantKey}。請檢查 ECPAY_EINVOICE_ACCOUNTS_JSON。`
          : '請先指定可用的綠界電子發票 merchantKey；目前未能唯一判斷要使用 3290494 或 3150241。',
      );
    }

    const missing = this.configService.getProfileMissingFields(profile);
    if (missing.length > 0) {
      throw new BadRequestException(
        `綠界電子發票帳號 ${profile.key || profile.merchantId} 尚未可查詢，缺少：${missing.join(
          ', ',
        )}。請補 ECPAY_EINVOICE_ACCOUNTS_JSON。`,
      );
    }
  }

  private detectVoidStatus(result: any): 'void' | 'unknown' {
    const text = JSON.stringify(result || {}).toLowerCase();
    return text.includes('void') ||
      text.includes('invalid') ||
      text.includes('作廢')
      ? 'void'
      : 'unknown';
  }
}
