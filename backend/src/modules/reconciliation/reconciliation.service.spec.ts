import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationService } from '../reconciliation.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('ReconciliationService - autoMatchTransactions', () => {
  let service: ReconciliationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    bankTransaction: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
    },
    salesOrder: {
      findFirst: jest.fn(),
    },
    reconciliationResult: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReconciliationService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReconciliationService>(ReconciliationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Test 3: 自動對帳功能
   */
  describe('autoMatchTransactions', () => {
    it('測試精準匹配 - 金額相同且日期接近', async () => {
      // Arrange
      const mockBankTransactions = [
        {
          id: 'bank-tx-1',
          amountOriginal: '1000.00',
          txnDate: new Date('2025-11-18'),
          descriptionRaw: '客戶付款',
        },
      ];

      const mockPayment = {
        id: 'payment-1',
        amountOriginal: '1000.00',
        paymentDate: new Date('2025-11-18'),
      };

      mockPrismaService.bankTransaction.findMany.mockResolvedValue(
        mockBankTransactions,
      );
      mockPrismaService.payment.findFirst.mockResolvedValue(mockPayment);

      // Act
      const result = await service.autoMatchTransactions('batch-1');

      // Assert
      expect(result.exactMatched).toBe(1);
      expect(result.unmatched).toBe(0);
      expect(
        mockPrismaService.reconciliationResult.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bankTransactionId: 'bank-tx-1',
          matchedType: 'payment',
          matchedId: 'payment-1',
          confidence: 100,
          ruleUsed: 'exact_amount',
        }),
      });
    });

    it('測試模糊匹配 - 描述包含訂單編號', async () => {
      // Arrange
      const mockBankTransactions = [
        {
          id: 'bank-tx-2',
          amountOriginal: '2000.00',
          txnDate: new Date('2025-11-18'),
          descriptionRaw: '訂單付款 order-abc-123',
        },
      ];

      const mockOrder = {
        id: 'order-abc-123',
        totalGrossOriginal: '2000.00',
      };

      mockPrismaService.bankTransaction.findMany.mockResolvedValue(
        mockBankTransactions,
      );
      mockPrismaService.payment.findFirst.mockResolvedValue(null); // 精準匹配失敗
      mockPrismaService.salesOrder.findFirst.mockResolvedValue(mockOrder);

      // Act
      const result = await service.autoMatchTransactions('batch-1', {
        useFuzzyMatch: true,
      });

      // Assert
      expect(result.fuzzyMatched).toBe(1);
      expect(
        mockPrismaService.reconciliationResult.create,
      ).toHaveBeenCalledWith({
        data: expect.objectContaining({
          matchedType: 'sales_order',
          matchedId: 'order-abc-123',
          confidence: 70,
          ruleUsed: 'keyword',
        }),
      });
    });

    it('測試不匹配情況 - 無法找到對應單據', async () => {
      // Arrange
      const mockBankTransactions = [
        {
          id: 'bank-tx-3',
          amountOriginal: '999.00',
          txnDate: new Date('2025-11-18'),
          descriptionRaw: '未知來源',
        },
      ];

      mockPrismaService.bankTransaction.findMany.mockResolvedValue(
        mockBankTransactions,
      );
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.salesOrder.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.autoMatchTransactions('batch-1', {
        useFuzzyMatch: false,
      });

      // Assert
      expect(result.exactMatched).toBe(0);
      expect(result.fuzzyMatched).toBe(0);
      expect(result.unmatched).toBe(1);
      expect(
        mockPrismaService.reconciliationResult.create,
      ).not.toHaveBeenCalled();
    });
  });
});
