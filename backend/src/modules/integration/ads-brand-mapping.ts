export const UNMAPPED_ADS_BRAND = '待對應';

export type AdsProvider = 'meta' | 'google';
export type AdsBrandMappingStatus = 'mapped' | 'unmapped';
export type AdsBrandMappingSource =
  | 'account_config.reportBrand'
  | 'account_config.brand'
  | 'account_config.campaignBrandMapping'
  | 'none';

export type AdsBrandMappingResolution = {
  accountRef: string;
  accountName: string | null;
  campaignRef: string | null;
  resolvedBrand: string;
  mappingStatus: AdsBrandMappingStatus;
  mappingSource: AdsBrandMappingSource;
  diagnostic: string | null;
};

export type AdsBrandMappingCoverage = {
  complete: boolean;
  totalAccounts: number;
  mappedAccounts: number;
  unmappedAccounts: number;
  coveragePercent: number;
  mappedAccountRefs: string[];
  unmappedAccountRefs: string[];
  diagnostics: string[];
};

type ConfiguredBrandFields = {
  name?: string | null;
  brand?: string | null;
  reportBrand?: string | null;
  brandMode?: 'single' | 'portfolio' | string | null;
  allowedBrands?: string[] | null;
  campaignBrandMappings?: Array<{
    campaignId: string;
    brand: string;
  }> | null;
};

const providerLabel = (provider: AdsProvider) =>
  provider === 'meta' ? 'Meta' : 'Google Ads';

export function resolveConfiguredAdsBrandMapping(
  provider: AdsProvider,
  accountRef: string,
  configuredAccount?: ConfiguredBrandFields | null,
  campaignRef?: string | null,
): AdsBrandMappingResolution {
  const normalizedAccountRef = String(accountRef || '').trim();
  const accountName =
    typeof configuredAccount?.name === 'string' && configuredAccount.name.trim()
      ? configuredAccount.name.trim()
      : null;
  const normalizedCampaignRef = String(campaignRef || '').trim();
  const brandMode =
    configuredAccount?.brandMode === 'portfolio' ? 'portfolio' : 'single';
  const allowedBrands = Array.isArray(configuredAccount?.allowedBrands)
    ? configuredAccount.allowedBrands
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    : [];
  const campaignBrandMappings = Array.isArray(
    configuredAccount?.campaignBrandMappings,
  )
    ? configuredAccount.campaignBrandMappings
    : [];

  if (brandMode === 'portfolio') {
    if (!allowedBrands.length) {
      return {
        accountRef: normalizedAccountRef,
        accountName,
        campaignRef: normalizedCampaignRef || null,
        resolvedBrand: UNMAPPED_ADS_BRAND,
        mappingStatus: 'unmapped',
        mappingSource: 'none',
        diagnostic: `${providerLabel(provider)} portfolio 廣告帳號 ${normalizedAccountRef || '無法識別的帳號'} 尚未設定 allowedBrands 品牌白名單；所有花費只會列入「${UNMAPPED_ADS_BRAND}」。`,
      };
    }
    const campaignMapping = campaignBrandMappings.find(
      (mapping) =>
        String(mapping?.campaignId || '').trim() === normalizedCampaignRef,
    );
    const campaignBrand = String(campaignMapping?.brand || '').trim();
    const campaignBrandAllowed = allowedBrands.includes(campaignBrand);
    if (campaignBrand && campaignBrandAllowed) {
      return {
        accountRef: normalizedAccountRef,
        accountName,
        campaignRef: normalizedCampaignRef || null,
        resolvedBrand: campaignBrand,
        mappingStatus: 'mapped',
        mappingSource: 'account_config.campaignBrandMapping',
        diagnostic: null,
      };
    }

    const accountLabel = normalizedAccountRef || '無法識別的帳號';
    const campaignLabel = normalizedCampaignRef || '帳號彙總層級';
    const invalidBrandDiagnostic =
      campaignBrand && !campaignBrandAllowed
        ? `；設定品牌 ${campaignBrand} 不在 allowedBrands 主檔中`
        : '';
    return {
      accountRef: normalizedAccountRef,
      accountName,
      campaignRef: normalizedCampaignRef || null,
      resolvedBrand: UNMAPPED_ADS_BRAND,
      mappingStatus: 'unmapped',
      mappingSource: 'none',
      diagnostic: `${providerLabel(provider)} portfolio 廣告帳號 ${accountLabel} 的 ${campaignLabel} 尚未在 campaignBrandMappings 設定明確品牌${invalidBrandDiagnostic}；此花費只會列入「${UNMAPPED_ADS_BRAND}」，不得併入其他品牌。`,
    };
  }

  const reportBrand =
    typeof configuredAccount?.reportBrand === 'string'
      ? configuredAccount.reportBrand.trim()
      : '';
  const brand =
    typeof configuredAccount?.brand === 'string'
      ? configuredAccount.brand.trim()
      : '';
  const resolvedBrand = reportBrand || brand;

  if (resolvedBrand) {
    const resolvedBrandAllowed =
      !allowedBrands.length || allowedBrands.includes(resolvedBrand);
    if (!resolvedBrandAllowed) {
      return {
        accountRef: normalizedAccountRef,
        accountName,
        campaignRef: normalizedCampaignRef || null,
        resolvedBrand: UNMAPPED_ADS_BRAND,
        mappingStatus: 'unmapped',
        mappingSource: 'none',
        diagnostic: `${providerLabel(provider)} 廣告帳號 ${normalizedAccountRef || '無法識別的帳號'} 設定品牌 ${resolvedBrand} 不在 allowedBrands 主檔中；此帳號花費只會列入「${UNMAPPED_ADS_BRAND}」。`,
      };
    }
    return {
      accountRef: normalizedAccountRef,
      accountName,
      campaignRef: normalizedCampaignRef || null,
      resolvedBrand,
      mappingStatus: 'mapped',
      mappingSource: reportBrand
        ? 'account_config.reportBrand'
        : 'account_config.brand',
      diagnostic: null,
    };
  }

  const accountLabel = normalizedAccountRef || '無法識別的帳號';
  const envName =
    provider === 'meta' ? 'META_ADS_ACCOUNTS_JSON' : 'GOOGLE_ADS_ACCOUNTS_JSON';
  return {
    accountRef: normalizedAccountRef,
    accountName,
    campaignRef: normalizedCampaignRef || null,
    resolvedBrand: UNMAPPED_ADS_BRAND,
    mappingStatus: 'unmapped',
    mappingSource: 'none',
    diagnostic: `${providerLabel(provider)} 廣告帳號 ${accountLabel} 尚未在 ${envName} 設定明確的 reportBrand 或 brand；此帳號花費只會列入「${UNMAPPED_ADS_BRAND}」，不得併入其他品牌。`,
  };
}

export function summarizeAdsBrandMappingCoverage(
  resolutions: AdsBrandMappingResolution[],
): AdsBrandMappingCoverage {
  const accounts = new Map<string, AdsBrandMappingResolution>();
  let unknownIndex = 0;

  for (const resolution of resolutions) {
    const accountRef = resolution.accountRef.trim();
    const key = accountRef || `__unknown_${unknownIndex++}`;
    const existing = accounts.get(key);
    if (
      !existing ||
      existing.mappingStatus === 'mapped' ||
      resolution.mappingStatus === 'unmapped'
    ) {
      accounts.set(key, resolution);
    }
  }

  const entries = [...accounts.values()];
  const mappedAccountRefs = entries
    .filter((entry) => entry.mappingStatus === 'mapped')
    .map((entry) => entry.accountRef)
    .filter(Boolean)
    .sort();
  const unmappedAccountRefs = entries
    .filter((entry) => entry.mappingStatus === 'unmapped')
    .map((entry) => entry.accountRef || '無法識別的帳號')
    .sort();
  const diagnostics = [
    ...new Set(
      entries
        .map((entry) => entry.diagnostic)
        .filter((diagnostic): diagnostic is string => Boolean(diagnostic)),
    ),
  ];
  const totalAccounts = entries.length;
  const mappedAccounts = entries.filter(
    (entry) => entry.mappingStatus === 'mapped',
  ).length;
  const unmappedAccounts = totalAccounts - mappedAccounts;

  return {
    complete: totalAccounts > 0 && unmappedAccounts === 0,
    totalAccounts,
    mappedAccounts,
    unmappedAccounts,
    coveragePercent: totalAccounts
      ? Number(((mappedAccounts / totalAccounts) * 100).toFixed(2))
      : 0,
    mappedAccountRefs,
    unmappedAccountRefs,
    diagnostics,
  };
}
