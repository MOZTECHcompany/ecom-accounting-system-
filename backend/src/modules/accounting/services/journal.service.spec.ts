import { Test, TestingModule } from '@nestjs/testing';
import { JournalService } from './journal.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

/**
 * JournalService Unit Test
 * 測試會計分錄服務的核心功能
 */
describe('JournalService', () => {
  let service: JournalService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JournalService,
        {
          provide: PrismaService,
          useValue: {
            journalEntry: {
              create: jest.fn(),
              findMany: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            period: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<JournalService>(JournalService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createJournalEntry', () => {
    it('應該拋出錯誤當借貸不平衡時', async () => {
      const unbalancedEntry = {
        entityId: 'entity-1',
        date: new Date(),
        description: 'Test Entry',
        createdBy: 'user-1',
        lines: [
          {
            accountId: 'account-1',
            debit: 1000,
            credit: 0,
            amountBase: 1000,
          },
          {
            accountId: 'account-2',
            debit: 0,
            credit: 500, // 不平衡！
            amountBase: 500,
          },
        ],
      };

      await expect(service.createJournalEntry(unbalancedEntry)).rejects.toThrow(
        'Journal entry is not balanced',
      );
    });

    it('應該成功建立平衡的分錄', async () => {
      const balancedEntry = {
        entityId: 'entity-1',
        date: new Date(),
        description: 'Test Entry',
        createdBy: 'user-1',
        lines: [
          {
            accountId: 'account-1',
            debit: 1000,
            credit: 0,
            amountBase: 1000,
          },
          {
            accountId: 'account-2',
            debit: 0,
            credit: 1000,
            amountBase: 1000,
          },
        ],
      };

      const mockJournalEntry = {
        id: 'journal-1',
        ...balancedEntry,
        journalLines: [],
      };

      jest
        .spyOn(prismaService.journalEntry, 'create')
        .mockResolvedValue(mockJournalEntry as any);

      const result = await service.createJournalEntry(balancedEntry);

      expect(result).toBeDefined();
      expect(result.id).toBe('journal-1');
      expect(prismaService.journalEntry.create).toHaveBeenCalled();
    });

    it('應該拒絕在已關閉期間建立分錄', async () => {
      const entry = {
        entityId: 'entity-1',
        date: new Date(),
        description: 'Test Entry',
        periodId: 'period-1',
        createdBy: 'user-1',
        lines: [
          {
            accountId: 'account-1',
            debit: 1000,
            credit: 0,
            amountBase: 1000,
          },
          {
            accountId: 'account-2',
            debit: 0,
            credit: 1000,
            amountBase: 1000,
          },
        ],
      };

      jest.spyOn(prismaService.period, 'findUnique').mockResolvedValue({
        id: 'period-1',
        status: 'closed',
      } as any);

      await expect(service.createJournalEntry(entry)).rejects.toThrow(
        'Cannot create journal entry in closed period',
      );
    });
  });
});
