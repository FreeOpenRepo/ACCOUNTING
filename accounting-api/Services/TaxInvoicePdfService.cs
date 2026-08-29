using accounting_api.Models;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace accounting_api.Services;

public interface ITaxInvoicePdfService
{
    byte[] GenerateTaxInvoicePdf(Invoice invoice);
}

public class TaxInvoicePdfService : ITaxInvoicePdfService
{
    public TaxInvoicePdfService()
    {
        // Set QuestPDF Community License
        QuestPDF.Settings.License = LicenseType.Community;
    }

    public byte[] GenerateTaxInvoicePdf(Invoice invoice)
    {
        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(30, Unit.Point);
                page.PageColor(Colors.White);
                page.DefaultTextStyle(x => x.FontSize(10).FontFamily("Arial"));

                page.Header().Element(c => ComposeHeader(c, invoice));
                page.Content().Element(c => ComposeContent(c, invoice));
                page.Footer().Element(ComposeFooter);
            });
        });

        return document.GeneratePdf();
    }

    private void ComposeHeader(IContainer container, Invoice invoice)
    {
        container.Column(col =>
        {
            col.Item().Row(row =>
            {
                // Company Details
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("ENTERPRISE ARTISAN CORP CO., LTD.").FontSize(14).Bold().FontColor("#0f172a");
                    c.Item().Text("บริษัท เอนเตอร์ไพรส์ อาร์ทิซาน คอร์ป จำกัด").FontSize(10).FontColor("#475569");
                    c.Item().Text("123 Sukhumvit 55 (Thonglor), Klongton-Nua, Wattana, Bangkok 10110").FontSize(9).FontColor("#64748b");
                    c.Item().Text("TAX ID (เลขประจำตัวผู้เสียภาษี): 0-1055-99887-65-4 (Head Office)").FontSize(9).FontColor("#64748b");
                    c.Item().Text("Tel: +66 2 999 8888 | Email: billing@artisan.co.th").FontSize(9).FontColor("#64748b");
                });

                // Document Title & Number
                row.ConstantItem(220).Column(c =>
                {
                    c.Item().Background("#0284c7").Padding(8).AlignCenter().Text(text =>
                    {
                        text.Span("TAX INVOICE / RECEIPT\n").FontSize(11).Bold().FontColor(Colors.White);
                        text.Span("ต้นฉบับ ใบกำกับภาษี / ใบเสร็จรับเงิน").FontSize(9).FontColor(Colors.White);
                    });

                    c.Item().PaddingTop(6).Row(r =>
                    {
                        r.RelativeItem().Text("Invoice No:").FontSize(9).Bold();
                        r.RelativeItem().AlignRight().Text(invoice.InvoiceNumber).FontSize(9).Bold().FontColor("#0284c7");
                    });
                    c.Item().Row(r =>
                    {
                        r.RelativeItem().Text("Date / วันที่:").FontSize(9);
                        r.RelativeItem().AlignRight().Text(invoice.IssueDate.ToString("dd/MM/yyyy")).FontSize(9);
                    });
                    c.Item().Row(r =>
                    {
                        r.RelativeItem().Text("Due Date:").FontSize(9);
                        r.RelativeItem().AlignRight().Text(invoice.DueDate.ToString("dd/MM/yyyy")).FontSize(9);
                    });
                });
            });

            col.Item().PaddingTop(12).LineHorizontal(1).LineColor("#e2e8f0");

            // Customer Info Box
            col.Item().PaddingTop(8).Background("#f8fafc").Border(1).BorderColor("#e2e8f0").Padding(10).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("CUSTOMER / ข้อมูลลูกค้า:").FontSize(9).Bold().FontColor("#475569");
                    c.Item().Text(invoice.CustomerName).FontSize(11).Bold().FontColor("#0f172a");
                    c.Item().Text($"Tax ID: {invoice.CustomerTaxId}").FontSize(9).FontColor("#334155");
                    c.Item().Text(invoice.CustomerAddress).FontSize(9).FontColor("#64748b");
                });
            });
        });
    }

    private void ComposeContent(IContainer container, Invoice invoice)
    {
        container.PaddingTop(14).Column(col =>
        {
            // Line Items Table
            col.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(30);  // #
                    columns.RelativeColumn(6);   // Description
                    columns.ConstantColumn(50);  // Qty
                    columns.ConstantColumn(80);  // Unit Price
                    columns.ConstantColumn(90);  // Total
                });

                // Header
                table.Header(header =>
                {
                    header.Cell().Background("#0f172a").Padding(6).AlignCenter().Text("#").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background("#0f172a").Padding(6).Text("Description / รายการ").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background("#0f172a").Padding(6).AlignRight().Text("Qty").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background("#0f172a").Padding(6).AlignRight().Text("Price (THB)").FontColor(Colors.White).FontSize(9).Bold();
                    header.Cell().Background("#0f172a").Padding(6).AlignRight().Text("Amount (THB)").FontColor(Colors.White).FontSize(9).Bold();
                });

                var idx = 1;
                foreach (var item in invoice.Items)
                {
                    var bg = idx % 2 == 0 ? "#f8fafc" : "#ffffff";
                    table.Cell().Background(bg).BorderBottom(1).BorderColor("#f1f5f9").Padding(6).AlignCenter().Text(idx.ToString()).FontSize(9);
                    table.Cell().Background(bg).BorderBottom(1).BorderColor("#f1f5f9").Padding(6).Text(item.Description).FontSize(9);
                    table.Cell().Background(bg).BorderBottom(1).BorderColor("#f1f5f9").Padding(6).AlignRight().Text(item.Quantity.ToString("N0")).FontSize(9);
                    table.Cell().Background(bg).BorderBottom(1).BorderColor("#f1f5f9").Padding(6).AlignRight().Text(item.UnitPrice.ToString("N2")).FontSize(9);
                    table.Cell().Background(bg).BorderBottom(1).BorderColor("#f1f5f9").Padding(6).AlignRight().Text(item.Amount.ToString("N2")).FontSize(9).Bold();
                    idx++;
                }
            });

            // Financial Summary Block
            col.Item().PaddingTop(12).Row(row =>
            {
                row.RelativeItem(3).Column(c =>
                {
                    c.Item().Text("Payment Terms: Bank Transfer (Kasikornbank A/C: 098-1-23456-7)").FontSize(8).FontColor("#64748b");
                    if (!string.IsNullOrEmpty(invoice.Notes))
                    {
                        c.Item().Text($"Notes: {invoice.Notes}").FontSize(8).FontColor("#64748b").Italic();
                    }
                });

                row.RelativeItem(2).Column(c =>
                {
                    c.Item().BorderBottom(1).BorderColor("#e2e8f0").Padding(4).Row(r =>
                    {
                        r.RelativeItem().Text("Subtotal / มูลค่าสินค้า:").FontSize(9);
                        r.RelativeItem().AlignRight().Text($"{invoice.Subtotal:N2} THB").FontSize(9);
                    });
                    c.Item().BorderBottom(1).BorderColor("#e2e8f0").Padding(4).Row(r =>
                    {
                        r.RelativeItem().Text("VAT 7% / ภาษีมูลค่าเพิ่ม:").FontSize(9);
                        r.RelativeItem().AlignRight().Text($"{invoice.VatAmount:N2} THB").FontSize(9);
                    });
                    c.Item().Background("#f1f5f9").Padding(6).Row(r =>
                    {
                        r.RelativeItem().Text("Grand Total / ยอดรวมสุทธิ:").FontSize(10).Bold().FontColor("#0f172a");
                        r.RelativeItem().AlignRight().Text($"{invoice.TotalAmount:N2} THB").FontSize(10).Bold().FontColor("#0284c7");
                    });
                });
            });

            // Signatures
            col.Item().PaddingTop(24).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().AlignCenter().Text("___________________________").FontColor("#94a3b8");
                    c.Item().PaddingTop(4).AlignCenter().Text("Customer Authorized Signature").FontSize(8).FontColor("#64748b");
                    c.Item().AlignCenter().Text("ผู้รับมอบอำนาจ / ผู้รับสินค้า").FontSize(8).FontColor("#94a3b8");
                });

                row.ConstantItem(40);

                row.RelativeItem().Column(c =>
                {
                    c.Item().AlignCenter().Text("___________________________").FontColor("#94a3b8");
                    c.Item().PaddingTop(4).AlignCenter().Text("Enterprise Artisan Corp Co., Ltd.").FontSize(8).Bold().FontColor("#0f172a");
                    c.Item().AlignCenter().Text("Authorized Signature / ผู้มีอำนาจลงนาม").FontSize(8).FontColor("#94a3b8");
                });
            });
        });
    }

    private void ComposeFooter(IContainer container)
    {
        container.AlignCenter().Text(text =>
        {
            text.DefaultTextStyle(x => x.FontSize(8).FontColor("#94a3b8"));
            text.Span("Generated by Enterprise Accounting Engine (02_ACCOUNTING_ENGINE) • Page ");
            text.CurrentPageNumber();
            text.Span(" of ");
            text.TotalPages();
        });
    }
}
