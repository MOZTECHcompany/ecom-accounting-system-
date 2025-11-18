import { Controller, Post, Body, UseGuards, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { InvoicingService } from './invoicing.service';
import { PreviewInvoiceDto } from './dto/preview-invoice.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';

/**
 * InvoicingController
 * 
 * 電子發票控制器
 */
@ApiTags('Invoicing')
@ApiBearerAuth()
@Controller('invoicing')
@UseGuards(JwtAuthGuard)
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  /**
   * 預覽交易的發票內容
   */
  @Post('preview')
  @ApiOperation({
    summary: '預覽交易的電子發票內容',
    description:
      '在正式開立發票前，預覽該筆交易會產生的發票資料，包含金額、稅額、明細等',
  })
  async previewInvoice(@Body() dto: PreviewInvoiceDto) {
    return this.invoicingService.previewInvoiceForTransaction(dto);
  }

  /**
   * 開立正式發票
   */
  @Post('issue')
  @ApiOperation({
    summary: '對交易開立正式電子發票',
    description:
      '呼叫財政部電子發票API，為指定交易開立正式發票。支援B2B和B2C發票。',
  })
  async issueInvoice(
    @Body() dto: IssueInvoiceDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.issueInvoiceForTransaction(dto, userId);
  }

  /**
   * 作廢發票
   */
  @Post(':invoiceNumber/void')
  @ApiOperation({
    summary: '作廢電子發票',
    description: '對已開立的發票進行作廢處理。需符合財政部時限規定。',
  })
  async voidInvoice(
    @Param('invoiceNumber') invoiceNumber: string,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.voidInvoice(invoiceNumber, reason, userId);
  }

  /**
   * 開立折讓單
   */
  @Post(':invoiceNumber/allowance')
  @ApiOperation({
    summary: '開立發票折讓單',
    description: '對原發票開立折讓（部分退款），產生折讓證明單。',
  })
  async issueAllowance(
    @Param('invoiceNumber') invoiceNumber: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.issueAllowance(
      invoiceNumber,
      amount,
      reason,
      userId,
    );
  }
}
