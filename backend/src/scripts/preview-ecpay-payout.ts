import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { EcpayShopifyPayoutService } from '../modules/reconciliation/ecpay-shopify-payout.service';
import { ProviderPayoutReconciliationService } from '../modules/reconciliation/provider-payout-reconciliation.service';

async function main() {
  const [merchantKey, beginDate, endDate] = process.argv.slice(2);

  if (!merchantKey || !beginDate || !endDate) {
    throw new Error(
      'Usage: preview-ecpay-payout <merchantKey> <beginDate> <endDate>',
    );
  }

  const service = new EcpayShopifyPayoutService(
    new ConfigService(process.env),
    {} as PrismaService,
    {} as ProviderPayoutReconciliationService,
  );
  const result = await service.previewPayouts({
    merchantKey,
    beginDate,
    endDate,
    dateType: '2',
  });

  process.stdout.write(
    `${JSON.stringify({
      success: result.success,
      dryRun: result.dryRun,
      imported: result.imported,
      source: result.source,
      apiKind: result.apiKind,
      merchantKey: result.merchantKey,
      merchantId: result.merchantId,
      query: result.query,
      recordCount: result.recordCount,
      totals: result.totals,
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
