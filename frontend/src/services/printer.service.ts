import { Sale, Cashier } from '../types'
import { formatCurrency, formatDateTime } from '../utils/formatters'
import { COMPANY_INFO, PAYMENT_METHOD_LABELS } from '../utils/constants'

class PrinterService {
    /**
     * Print sale receipt
     */
    printReceipt(sale: Sale, cashier: Cashier): void {
        const html = this.generateReceiptHTML(sale, cashier)
        this.openPrintWindow(html)
    }

    /**
     * Print cashier closing report
     */
    printClosingReport(summary: {
        openingBalance: number
        salesCash: number
        salesDebit: number
        salesCredit: number
        salesPix: number
        salesInstallment: number
        withdrawals: number
        supplies: number
        expectedBalance: number
        actualBalance: number
        difference: number
    }, cashier: Cashier): void {
        const html = this.generateClosingReportHTML(summary, cashier)
        this.openPrintWindow(html)
    }

    /**
     * Print withdrawal/supply receipt
     */
    printTransactionReceipt(type: 'withdrawal' | 'supply', amount: number, description: string, cashier: Cashier): void {
        const html = this.generateTransactionReceiptHTML(type, amount, description, cashier)
        this.openPrintWindow(html)
    }

    /**
     * Open print window
     */
    private openPrintWindow(html: string): void {
        const printWindow = window.open('', '_blank', 'width=300,height=600')
        if (!printWindow) {
            console.error('Could not open print window')
            return
        }

        printWindow.document.write(html)
        printWindow.document.close()
        printWindow.focus()

        // Wait for content to load before printing
        setTimeout(() => {
            printWindow.print()
            printWindow.close()
        }, 250)
    }

    /**
     * Generate receipt HTML
     */
    private generateReceiptHTML(sale: Sale, cashier: Cashier): string {
        const itemsHtml = sale.items.map(item => `
      <div class="item-name">${item.description}</div>
      <div class="item-detail">
        <span>${item.quantity} ${item.productId ? 'UN' : 'UN'} x ${formatCurrency(item.unitPrice)}</span>
        <span>${formatCurrency(item.subtotal)}</span>
      </div>
    `).join('')

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          .item-name { margin-top: 5px; }
          .item-detail { display: flex; justify-content: space-between; }
          .total { font-size: 14px; margin-top: 10px; font-weight: bold; }
          .total-line { display: flex; justify-content: space-between; margin: 3px 0; }
        </style>
      </head>
      <body>
        <div class="center bold">${COMPANY_INFO.name}</div>
        <div class="center">
          ${COMPANY_INFO.address}<br>
          ${COMPANY_INFO.city}<br>
          CNPJ: ${COMPANY_INFO.cnpj}<br>
          Fone: ${COMPANY_INFO.phone}
        </div>
        
        <div class="line"></div>
        
        <div class="center">
          Documento Auxiliar de Nota Fiscal<br>
          de Consumidor Eletrônica
        </div>
        
        <div class="line"></div>
        
        ${itemsHtml}
        
        <div class="line"></div>
        
        <div class="total-line">
          <span>Qtde. Total de Itens</span>
          <span>${sale.items.length}</span>
        </div>
        <div class="total-line">
          <span>Subtotal R$</span>
          <span>${sale.subtotal.toFixed(2)}</span>
        </div>
        ${sale.discount > 0 ? `
        <div class="total-line">
          <span>Descontos R$</span>
          <span>-${sale.discount.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="total-line total">
          <span>Valor a Pagar R$</span>
          <span>${sale.total.toFixed(2)}</span>
        </div>
        
        <div class="line"></div>
        
        <div class="center">
          FORMA DE PAGAMENTO: ${PAYMENT_METHOD_LABELS[sale.paymentMethod]}
        </div>
        
        ${sale.cpf ? `
        <div class="center">CPF: ${sale.cpf}</div>
        ` : `
        <div class="center">CONSUMIDOR NÃO IDENTIFICADO</div>
        `}
        
        <div class="line"></div>
        
        <div class="center">
          ${formatDateTime(sale.createdAt)}<br>
          Caixa ${cashier.number} - Operador: ${cashier.operatorName}
        </div>
        
        <div class="line"></div>
        
        <div class="center">
          Comercial Matheus - Sistema PDV<br>
          © 2026
        </div>
      </body>
      </html>
    `
    }

    /**
     * Generate closing report HTML
     */
    private generateClosingReportHTML(summary: {
        openingBalance: number
        salesCash: number
        salesDebit: number
        salesCredit: number
        salesPix: number
        salesInstallment: number
        withdrawals: number
        supplies: number
        expectedBalance: number
        actualBalance: number
        difference: number
    }, cashier: Cashier): string {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total { font-size: 14px; font-weight: bold; }
          .positive { color: green; }
          .negative { color: red; }
        </style>
      </head>
      <body>
        <div class="center bold">${COMPANY_INFO.name}</div>
        <div class="center bold">FECHAMENTO DE CAIXA</div>
        
        <div class="line"></div>
        
        <div class="center">
          Caixa ${cashier.number}<br>
          Operador: ${cashier.operatorName}<br>
          ${formatDateTime(new Date())}
        </div>
        
        <div class="line"></div>
        
        <div class="row">
          <span>Saldo Inicial:</span>
          <span>${formatCurrency(summary.openingBalance)}</span>
        </div>
        
        <div class="row">
          <span>Vendas (Dinheiro):</span>
          <span>${formatCurrency(summary.salesCash)}</span>
        </div>
        <div class="row">
          <span>Vendas (Débito):</span>
          <span>${formatCurrency(summary.salesDebit)}</span>
        </div>
        <div class="row">
          <span>Vendas (Crédito):</span>
          <span>${formatCurrency(summary.salesCredit)}</span>
        </div>
        <div class="row">
          <span>Vendas (PIX):</span>
          <span>${formatCurrency(summary.salesPix)}</span>
        </div>
        <div class="row">
          <span>Vendas (A Prazo):</span>
          <span>${formatCurrency(summary.salesInstallment)}</span>
        </div>
        
        <div class="row">
          <span>Sangrias (-):</span>
          <span>${formatCurrency(summary.withdrawals)}</span>
        </div>
        <div class="row">
          <span>Suprimentos (+):</span>
          <span>${formatCurrency(summary.supplies)}</span>
        </div>
        
        <div class="line"></div>
        
        <div class="row total">
          <span>Saldo Esperado:</span>
          <span>${formatCurrency(summary.expectedBalance)}</span>
        </div>
        <div class="row total">
          <span>Saldo Contado:</span>
          <span>${formatCurrency(summary.actualBalance)}</span>
        </div>
        <div class="row total">
          <span>Diferença:</span>
          <span class="${summary.difference >= 0 ? 'positive' : 'negative'}">${formatCurrency(summary.difference)}</span>
        </div>
        
        <div class="line"></div>
        
        <div class="center">
          Comercial Matheus - Sistema PDV<br>
          © 2026
        </div>
      </body>
      </html>
    `
    }

    /**
     * Generate transaction receipt HTML
     */
    private generateTransactionReceiptHTML(
        type: 'withdrawal' | 'supply',
        amount: number,
        description: string,
        cashier: Cashier
    ): string {
        const typeLabel = type === 'withdrawal' ? 'SANGRIA' : 'SUPRIMENTO'

        return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 0; }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            margin: 0 auto;
            padding: 5mm;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          .amount { font-size: 18px; font-weight: bold; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="center bold">${COMPANY_INFO.name}</div>
        <div class="center bold">${typeLabel}</div>
        
        <div class="line"></div>
        
        <div class="center">
          Caixa ${cashier.number}<br>
          Operador: ${cashier.operatorName}<br>
          ${formatDateTime(new Date())}
        </div>
        
        <div class="line"></div>
        
        <div class="center amount">${formatCurrency(amount)}</div>
        
        <div class="center">
          ${description}
        </div>
        
        <div class="line"></div>
        
        <div class="center">
          Comercial Matheus - Sistema PDV<br>
          © 2026
        </div>
      </body>
      </html>
    `
    }
}

export const printerService = new PrinterService()
