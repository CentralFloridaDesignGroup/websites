export type PaymentRecordedEmailTemplateData = {
  invoiceNumber: string
  clientName: string
  projectReference: string
  method: string
  referenceNumber: string
  grossAmount: string
  feeAmount: string
  netAmount: string
  paidDate: string
  stripeCheckoutSessionId: string
  stripePaymentIntentId: string
  note: string
}

export type RenderedEmailTemplate = {
  subject: string
  htmlContent: string
}

/**
 * Code-managed template for the internal payment-recorded notification.
 * Keep values escaped before they are passed into this template.
 */
export function renderPaymentRecordedEmail(data: PaymentRecordedEmailTemplateData): RenderedEmailTemplate {
  return {
    subject: `A payment was received for invoice ${data.invoiceNumber}`,
    htmlContent: `
<body bgcolor="#ffffff" text="#3b3f44" style="background-color: #ffffff; margin: 0; padding: 0;">
  <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%" style="background-color: #ffffff; width: 100%;">
    <tbody>
      <tr>
        <td>
          <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="600" align="center" style="table-layout: fixed; width: 600px; max-width: 100%;">
            <tbody>
              <tr>
                <td valign="top" style="background-color: #ffffff; padding: 0 15px;">
                  <table cellspacing="0" cellpadding="0" border="0" role="presentation" width="100%">
                    <tbody>
                      <tr>
                        <td align="center" style="padding: 20px 0 10px; font-size: 0; line-height: 0;">
                          <img src="https://img.mailinblue.com/9859232/images/content_library/original/68bf657117415c70a23afadc.png" width="200" border="0" alt="White Point Survey" style="display: block; width: 200px; max-width: 100%; height: auto;" />
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="color: #1f2d3d; font-family: Arial, Helvetica, sans-serif; font-size: 32px; line-height: 1.2; padding: 20px 0;">
                          <strong>A PAYMENT WAS RECEIVED</strong>
                        </td>
                      </tr>
                      <tr>
                        <td style="color: #3b3f44; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; padding: 15px 0;">
                          <p style="margin: 0;">A payment was received for the following invoice. Please allow up to 2 business days for this payment to be reflected in your account. If you have any questions, please contact Nathan White.</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 3px solid #4a4a4a; font-size: 3px; line-height: 3px; padding: 0 0 25px;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td style="color: #3b3f44; font-family: Arial, Helvetica, sans-serif; font-size: 16px; line-height: 1.5; padding: 0 0 15px;">
                          <p style="margin: 0;">Invoice number: <strong>${data.invoiceNumber}</strong></p>
                          <p style="margin: 0;">Client: <strong>${data.clientName}</strong></p>
                          <p style="margin: 0;">Project: <strong>${data.projectReference}</strong></p>
                          <p style="margin: 0;">Payment method: <strong>${data.method}</strong></p>
                          <p style="margin: 0;">Reference number: <strong>${data.referenceNumber}</strong></p>
                          <p style="margin: 12px 0 0;"><span style="font-size: 20px;">Payment amount: </span><strong><span style="font-size: 20px;">${data.grossAmount}</span></strong></p>
                          <p style="margin: 0;">Processing fee: <strong>${data.feeAmount}</strong></p>
                          <p style="margin: 0;">Net payment: <strong>${data.netAmount}</strong></p>
                          <p style="margin: 0;">Paid date: <strong>${data.paidDate}</strong></p>
                          <p style="margin: 12px 0 0; font-size: 13px;">Stripe checkout session: <strong>${data.stripeCheckoutSessionId}</strong></p>
                          <p style="margin: 0; font-size: 13px;">Stripe payment intent: <strong>${data.stripePaymentIntentId}</strong></p>
                          <p style="margin: 12px 0 0;">Note: <strong>${data.note}</strong></p>
                        </td>
                      </tr>
                      <tr>
                        <td style="border-top: 3px solid #4a4a4a; font-size: 3px; line-height: 3px; padding: 5px 0;">&nbsp;</td>
                      </tr>
                      <tr>
                        <td style="color: #858588; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 1.5; padding: 0 0 10px;">
                          <p style="margin: 0;">This is a transactional email from White Point Surveying &amp; Mapping LLC. Please add this email address to your safe senders list to ensure timely delivery.</p>
                          <p style="margin: 0;">&copy; 2026 White Point Surveying &amp; Mapping LLC - All Rights Reserved</p>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        </td>
      </tr>
    </tbody>
  </table>
</body>
`.trim(),
  }
}
