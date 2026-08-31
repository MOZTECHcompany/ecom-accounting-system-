export function buildSalesOrderSourceKey(
  channelId: string,
  externalOrderId: string,
) {
  const normalizedChannelId = channelId.trim();
  const normalizedExternalOrderId = externalOrderId.trim();

  if (!normalizedChannelId || !normalizedExternalOrderId) {
    throw new Error(
      'Sales order source key requires channel and external order IDs.',
    );
  }

  return `${normalizedChannelId}:${normalizedExternalOrderId}`;
}

export function canonicalSalesOrderWhere<T extends Record<string, unknown>>(
  where: T,
) {
  return {
    AND: [
      where,
      {
        OR: [
          { sourceOrderKey: { not: null } },
          { externalOrderId: null },
          { externalOrderId: '' },
        ],
      },
    ],
  };
}
