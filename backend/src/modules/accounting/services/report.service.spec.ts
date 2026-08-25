import { PrismaService } from '../../../common/prisma/prisma.service';
import { ReportService } from './report.service';

describe('ReportService', () => {
  const findMany = jest.fn();
  const service = new ReportService({
    journalLine: { findMany },
  } as unknown as PrismaService);

  beforeEach(() => {
    findMany.mockReset();
  });

  describe('getIncomeStatement', () => {
    it('only includes approved journal entries', async () => {
      findMany.mockResolvedValue([]);

      await service.getIncomeStatement(
        'entity-1',
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-08-25T23:59:59.999Z'),
      );

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            journalEntry: expect.objectContaining({
              approvedAt: { not: null },
            }),
          }),
        }),
      );
    });
  });

  describe('getBalanceSheet', () => {
    it('flags the observed asset gap instead of inventing retained earnings', async () => {
      findMany.mockResolvedValue([
        {
          debit: 39939454.94,
          credit: 0,
          account: { code: '1000', name: '資產', type: 'asset' },
        },
        {
          debit: 0,
          credit: 228.9,
          account: { code: '2000', name: '負債', type: 'liability' },
        },
      ]);

      const result = await service.getBalanceSheet(
        'entity-1',
        new Date('2026-08-25T23:59:59.999Z'),
      );

      expect(result.difference).toBe(39939226.04);
      expect(result.balanced).toBe(false);
      expect(result.calculatedRetainedEarnings).toBeNull();
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            journalEntry: expect.objectContaining({
              approvedAt: { not: null },
            }),
          }),
        }),
      );
    });

    it('marks a balanced asset and liability pair as balanced', async () => {
      findMany.mockResolvedValue([
        {
          debit: 100,
          credit: 0,
          account: { code: '1000', name: '現金', type: 'asset' },
        },
        {
          debit: 0,
          credit: 100,
          account: { code: '2000', name: '應付款', type: 'liability' },
        },
      ]);

      const result = await service.getBalanceSheet(
        'entity-1',
        new Date('2026-08-25T23:59:59.999Z'),
      );

      expect(result.difference).toBe(0);
      expect(result.balanced).toBe(true);
      expect(result.calculatedRetainedEarnings).toBeNull();
    });
  });
});
