import type {
  OrderConfirmationMailPayload,
  OrderShippedMailPayload,
  PaymentReceivedMailPayload,
} from '../mail.types.js';

function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

function wrapHtml(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;color:#111827;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:24px;background:#111827;color:#ffffff;">
                <h1 style="margin:0;font-size:20px;">TokoElektronik</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                ${body}
              </td>
            </tr>
            <tr>
              <td style="padding:16px 24px;background:#f9fafb;color:#6b7280;font-size:12px;">
                Email ini dikirim otomatis. Mohon tidak membalas email ini.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderItemsTable(
  items: OrderConfirmationMailPayload['items'],
) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;">${item.productName}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right;">${formatRupiah(item.price * item.quantity)}</td>
        </tr>`,
    )
    .join('');

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:16px 0;font-size:14px;">
    <tr>
      <th align="left" style="padding-bottom:8px;border-bottom:1px solid #d1d5db;">Produk</th>
      <th align="center" style="padding-bottom:8px;border-bottom:1px solid #d1d5db;">Qty</th>
      <th align="right" style="padding-bottom:8px;border-bottom:1px solid #d1d5db;">Subtotal</th>
    </tr>
    ${rows}
  </table>`;
}

export function buildOrderConfirmationMail(payload: OrderConfirmationMailPayload) {
  const subject = `Konfirmasi Pesanan ${payload.orderNumber}`;
  const text = `Halo ${payload.customerName},

Pesanan Anda telah berhasil dibuat.

Nomor pesanan: ${payload.orderNumber}
Subtotal: ${formatRupiah(payload.subtotal)}
Ongkir: ${formatRupiah(payload.shippingCost)}
Diskon: ${formatRupiah(payload.discountAmount)}
Total: ${formatRupiah(payload.total)}

Lihat detail pesanan: ${payload.orderUrl}`;

  const itemsText = payload.items
    .map(
      (item) =>
        `- ${item.productName} x${item.quantity} = ${formatRupiah(item.price * item.quantity)}`,
    )
    .join('\n');

  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;font-size:16px;">Halo <strong>${payload.customerName}</strong>,</p>
     <p style="margin:0 0 16px;line-height:1.6;">Terima kasih telah berbelanja. Pesanan Anda telah berhasil dibuat dengan detail berikut:</p>
     <p style="margin:0 0 8px;"><strong>Nomor Pesanan:</strong> ${payload.orderNumber}</p>
     ${renderItemsTable(payload.items)}
     <p style="margin:8px 0;"><strong>Subtotal:</strong> ${formatRupiah(payload.subtotal)}</p>
     <p style="margin:8px 0;"><strong>Ongkir:</strong> ${formatRupiah(payload.shippingCost)}</p>
     <p style="margin:8px 0;"><strong>Diskon:</strong> ${formatRupiah(payload.discountAmount)}</p>
     <p style="margin:8px 0 16px;"><strong>Total:</strong> ${formatRupiah(payload.total)}</p>
     <a href="${payload.orderUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">Lihat Pesanan</a>`,
  );

  return {
    subject,
    text: `${text}\n\nItem:\n${itemsText}`,
    html,
  };
}

export function buildPaymentReceivedMail(payload: PaymentReceivedMailPayload) {
  const subject = `Pembayaran Diterima untuk ${payload.orderNumber}`;
  const text = `Halo ${payload.customerName},

Pembayaran untuk pesanan ${payload.orderNumber} telah kami terima.
Total pembayaran: ${formatRupiah(payload.total)}

Lihat detail pesanan: ${payload.orderUrl}`;

  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;font-size:16px;">Halo <strong>${payload.customerName}</strong>,</p>
     <p style="margin:0 0 16px;line-height:1.6;">Pembayaran untuk pesanan <strong>${payload.orderNumber}</strong> telah berhasil kami terima.</p>
     <p style="margin:0 0 16px;"><strong>Total Pembayaran:</strong> ${formatRupiah(payload.total)}</p>
     <a href="${payload.orderUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">Lihat Pesanan</a>`,
  );

  return { subject, text, html };
}

export function buildOrderShippedMail(payload: OrderShippedMailPayload) {
  const trackingInfo = payload.trackingNumber
    ? `Nomor resi: ${payload.trackingNumber}`
    : 'Nomor resi akan diinformasikan lebih lanjut.';
  const courierInfo = payload.courier
    ? `Kurir: ${payload.courier}`
    : 'Kurir: -';

  const subject = `Pesanan ${payload.orderNumber} Sedang Dikirim`;
  const text = `Halo ${payload.customerName},

Pesanan ${payload.orderNumber} telah dikirim.
${courierInfo}
${trackingInfo}

Lacak pesanan: ${payload.orderUrl}`;

  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 12px;font-size:16px;">Halo <strong>${payload.customerName}</strong>,</p>
     <p style="margin:0 0 16px;line-height:1.6;">Kabar baik! Pesanan <strong>${payload.orderNumber}</strong> sedang dalam perjalanan ke alamat Anda.</p>
     <p style="margin:0 0 8px;"><strong>${courierInfo}</strong></p>
     <p style="margin:0 0 16px;"><strong>${trackingInfo}</strong></p>
     <a href="${payload.orderUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">Lihat Pesanan</a>`,
  );

  return { subject, text, html };
}

export function buildPasswordResetMail(resetUrl: string) {
  const subject = 'Reset Password TokoElektronik';
  const text = `Anda menerima email ini karena ada permintaan reset password.

Buka tautan berikut untuk mengatur ulang password Anda:
${resetUrl}

Tautan berlaku 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.`;

  const html = wrapHtml(
    subject,
    `<p style="margin:0 0 16px;line-height:1.6;">Anda menerima email ini karena ada permintaan reset password.</p>
     <a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;">Reset Password</a>
     <p style="margin:16px 0 0;line-height:1.6;">Tautan berlaku 1 jam. Jika Anda tidak meminta reset password, abaikan email ini.</p>`,
  );

  return { subject, text, html };
}
