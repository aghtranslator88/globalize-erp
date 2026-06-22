import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export async function generateQuotationPDF(quote: any, brand: any, isRtl = false): Promise<Blob> {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.top = '-9999px';
  container.style.width = '800px';
  container.style.background = '#ffffff';
  container.style.color = '#1f2937';
  container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
  container.style.padding = '40px';
  container.style.boxSizing = 'border-box';
  container.style.borderTop = '8px solid #1B4F72';
  container.style.direction = isRtl ? 'rtl' : 'ltr';

  const itemsHtml = (quote.items && quote.items.length > 0 ? quote.items : [
    {
      description: quote.fileName || 'Certified Translation Services',
      unit: quote.serviceType || 'translation',
      quantity: quote.wordCount || 1,
      unitPrice: quote.grandTotal / (quote.wordCount || 1),
      total: quote.grandTotal
    }
  ]).map((item: any, idx: number) => `
    <tr style="border-bottom: 1px solid #e5e7eb; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
      <td style="padding: 12px; font-weight: bold; color: #111827; text-align: left;">
        <div style="margin: 0; line-height: 1.25;">${item.description || ''}</div>
        <span style="font-size: 10px; font-weight: normal; color: #9ca3af; font-family: sans-serif; display: block; margin-top: 4px;">
          Accredited Path: ${item.sourceLanguage || quote.sourceLanguage || 'Auto'} ➔ ${item.targetLanguage || quote.targetLanguage || 'Auto'}
        </span>
      </td>
      <td style="padding: 12px; text-align: center; font-weight: bold; text-transform: uppercase; font-size: 10px; color: #6b7280;">${item.unit || quote.serviceType || 'translation'}</td>
      <td style="padding: 12px; text-align: right; font-weight: 600; color: #374151;">
        ${item.unit === 'word' ? `${item.quantity || quote.wordCount || 0} words` : `${item.quantity || Math.ceil((quote.wordCount || 0) / 250)} pages`}
      </td>
      <td style="padding: 12px; text-align: right; font-weight: bold; color: #1f2937;">${Number(item.unitPrice || 0).toLocaleString()}</td>
      <td style="padding: 12px; text-align: right; font-weight: 900; color: #1B4F72;">${Number(item.total || 0).toLocaleString()}</td>
    </tr>
  `).join('');

  const shipmentHtml = quote.shipmentRequired && quote.recipientName ? `
    <div style="margin-top: 16px; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 11px; line-height: 1.4;">
      <div style="float: left; width: 50%; text-align: left;">
        <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #1B4F72; display: block; margin-bottom: 4px;">Accredited Shipping Dispatch:</span>
        <p style="margin: 0; font-weight: bold; color: #1f2937;">Recipient: ${quote.recipientName} (${quote.recipientPhone || ''})</p>
        <p style="margin: 0; color: #6b7280;">Method: ${quote.deliveryMethod === 'courier' ? 'Aramex Courier Package' : 'Cairo Representative'}</p>
      </div>
      <div style="float: right; width: 50%; text-align: right;">
        <span style="font-size: 10px; text-transform: uppercase; font-weight: bold; color: #9ca3af; display: block; margin-bottom: 4px;">Destination Address:</span>
        <p style="margin: 0; color: #1f2937;">${quote.deliveryAddress || ''}</p>
        <p style="margin: 0; color: #6b7280;">${quote.city || ''}, Egypt</p>
      </div>
      <div style="clear: both;"></div>
    </div>
  ` : '';

  const notesHtml = quote.notes ? `
    <div style="margin-top: 16px; padding: 12px; background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 10px; color: #6b7280; line-height: 1.5; white-space: pre-line; text-align: left;">
      <span style="font-weight: bold; text-transform: uppercase; color: #4b5563; display: block; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 4px;">Important Service notes & Terms:</span>
      ${quote.notes}
    </div>
  ` : '';

  const depositHtml = quote.depositAmount > 0 ? `
    <div style="padding: 8px; background-color: #ecfdf5; border-radius: 8px; font-size: 11px; font-weight: bold; color: #065f46; margin-top: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
        <span>- Paid Deposit Amount</span>
        <span>-${Number(quote.depositAmount).toLocaleString()} ${quote.currency || 'EGP'}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: 900; color: #b91c1c; border-top: 1px solid #a7f3d0; padding-top: 4px; margin-top: 4px;">
        <span>Outstanding Balance Due</span>
        <span>${Number(quote.depositBalance).toLocaleString()} ${quote.currency || 'EGP'}</span>
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 20px;">
      <div style="text-align: left;">
        <span style="font-weight: 850; text-transform: uppercase; font-size: 16px; color: #1B4F72;">${brand.companyName || 'Globalize'}</span>
        <p style="font-size: 11px; color: #9ca3af; font-weight: bold; text-transform: uppercase; margin: 4px 0 0 0;">${brand.slogan || 'Certified Translation Services'}</p>
        <p style="font-size: 10px; color: #6b7280; margin: 8px 0 0 0;">${brand.address || ''}${brand.taxNumber ? ` • Tax Ref: ${brand.taxNumber}` : ''}</p>
      </div>
      <div style="text-align: right;">
        <h2 style="font-size: 20px; font-weight: 900; color: #1B4F72; margin: 0; text-transform: uppercase;">Official Pricing Quote</h2>
        <p style="font-size: 10px; color: #9ca3af; font-family: monospace; margin: 4px 0 0 0; font-weight: bold;">DATE: ${new Date(quote.createdAt).toLocaleDateString()}</p>
        <p style="font-size: 10px; color: #9ca3af; font-family: monospace; margin: 4px 0 0 0; font-weight: bold;">VALID UNTIL: ${quote.validUntil || ''}</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; font-size: 11px; padding: 16px 0; border-bottom: 1px solid #f3f4f6; color: #4b5563;">
      <div style="text-align: left; width: 50%;">
        <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; display: block; margin-bottom: 4px;">Client Account:</span>
        <p style="color: #111827; font-weight: 900; font-size: 12px; margin: 0;">${quote.clientName}</p>
        ${quote.clientEmail || (quote as any).clientEmail ? `<p style="color: #6b7280; font-family: monospace; margin: 4px 0 0 0;">${quote.clientEmail || (quote as any).clientEmail}</p>` : ''}
      </div>
      <div style="text-align: right; width: 50%;">
        <span style="font-size: 9px; font-weight: 900; color: #9ca3af; text-transform: uppercase; display: block; margin-bottom: 4px;">Audit Reference:</span>
        <p style="color: #111827; font-weight: bold; margin: 0; font-size: 12px;">${quote.quoteNumber}</p>
        <p style="color: #9ca3af; margin: 4px 0 0 0; font-size: 9px;">Compiled by: ${quote.createdBy || 'system'}</p>
      </div>
    </div>

    <div style="padding: 12px 0; font-size: 11px; color: #4b5563; line-height: 1.6; text-align: left;">
      <p style="margin: 0;">
        We present the definitive financial pricing review for certified translation services. All translated documentation matches accredited translation patterns compliant with ISO and ministerial certifications.
      </p>
    </div>

    <div style="margin-top: 16px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6; border-bottom: 1px solid #e5e7eb; font-size: 9px; font-weight: 900; color: #4b5563; text-transform: uppercase;">
            <th style="padding: 10px 12px;">Service Description</th>
            <th style="padding: 10px 12px; text-align: center;">Unit</th>
            <th style="padding: 10px 12px; text-align: right;">Sizing</th>
            <th style="padding: 10px 12px; text-align: right;">Unit Price</th>
            <th style="padding: 10px 12px; text-align: right;">Net Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    ${shipmentHtml}
    ${notesHtml}

    <div style="margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="text-align: left; display: flex; align-items: center; gap: 12px;">
          <div style="width: 60px; height: 60px; border: 4px double rgba(49, 46, 129, 0.7); border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; opacity: 0.7; transform: rotate(6deg); border-style: dashed; padding: 4px; box-sizing: border-box;">
            <span style="font-size: 6px; text-transform: uppercase; font-weight: 900; color: #1e1b4b; line-height: 1;">APPROVED BUREAU</span>
            <span style="font-size: 5px; font-family: monospace; line-height: 1; margin-top: 2px;">Egypt HQ</span>
          </div>
          <div>
            <p style="font-weight: bold; color: #1B4F72; font-size: 11px; margin: 0; text-transform: uppercase;">Accredited Bureau Representative</p>
            <p style="font-size: 9px; color: #9ca3af; font-weight: 600; margin: 2px 0 0 0;">Corporate Legal QA Team Cairo</p>
          </div>
        </div>

        <div style="width: 250px; font-size: 11px; color: #4b5563;">
          <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-bottom: 4px;">
            <span>Subtotal</span>
            <span style="font-weight: bold; color: #111827;">${Number((quote as any).subtotal || quote.grandTotal).toLocaleString()} ${quote.currency || 'EGP'}</span>
          </div>
          ${(quote as any).discountTotal > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #059669; font-weight: bold; padding-bottom: 4px; margin-bottom: 4px;">
              <span>Discount</span>
              <span>-${Number((quote as any).discountTotal).toLocaleString()} ${quote.currency || 'EGP'}</span>
            </div>
          ` : ''}
          ${(quote as any).urgencySurcharge > 0 ? `
            <div style="display: flex; justify-content: space-between; color: #d97706; font-weight: bold; padding-bottom: 4px; margin-bottom: 4px;">
              <span>Urgency Surcharge</span>
              <span>+${Number((quote as any).urgencySurcharge).toLocaleString()} ${quote.currency || 'EGP'}</span>
            </div>
          ` : ''}
          ${quote.taxTotal > 0 ? `
            <div style="display: flex; justify-content: space-between; padding-bottom: 4px; margin-bottom: 4px;">
              <span>VAT Tax</span>
              <span>+${Number(quote.taxTotal).toLocaleString()} ${quote.currency || 'EGP'}</span>
            </div>
          ` : ''}
          ${(quote as any).deliveryFee > 0 ? `
            <div style="display: flex; justify-content: space-between; padding-bottom: 4px; margin-bottom: 4px;">
              <span>Courier Fee</span>
              <span>+${Number((quote as any).deliveryFee).toLocaleString()} ${quote.currency || 'EGP'}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: bold; color: #1B4F72; background-color: #f9fafb; padding: 6px; border-radius: 6px;">
            <span>Grand Total</span>
            <span>${Number(quote.grandTotal).toLocaleString()} ${quote.currency || 'EGP'}</span>
          </div>
          ${depositHtml}
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    const arrayBuffer = pdf.output('arraybuffer');
    document.body.removeChild(container);
    return new Blob([arrayBuffer], { type: 'application/pdf' });
  } catch (err) {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
    throw err;
  }
}

export async function downloadQuotation(quote: any, brand: any, isRtl = false) {
  const blob = await generateQuotationPDF(quote, brand, isRtl);
  const clientNameClean = (quote.clientName || 'Client').replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `Quotation-${quote.quoteNumber}-${clientNameClean}.pdf`;
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
