// Builds a starting-point signature from the owner profile fields — the user can hand-edit
// it afterward (visually or as raw HTML), this just saves typing it from scratch.
// {{UNSUBSCRIBE_URL}} is a placeholder: this app has no per-recipient context to fill it
// in itself (that only exists at send time, inside the email-generation workflow), so it's
// left as a literal token for the n8n workflow to substitute with the real per-business
// unsubscribe link when it merges the signature into an outgoing email.
export function buildSignatureHtml({ companyName, slogan, senderEmail, website, phone, logoUrl }) {
  const rows = [
    senderEmail && { icon: '✉️', label: 'Email', value: senderEmail, href: `mailto:${senderEmail}` },
    website && {
      icon: '🌐',
      label: 'Website',
      value: website,
      href: /^https?:\/\//.test(website) ? website : `https://${website}`,
    },
    phone && { icon: '📞', label: 'Phone', value: phone, href: `tel:${phone.replace(/[^\d+]/g, '')}` },
  ].filter(Boolean);

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; color: #334155;">
  <tr>
    ${
      logoUrl
        ? `<td style="padding-right: 16px; vertical-align: top;"><img src="${logoUrl}" alt="${companyName} logo" width="64" style="display: block; border-radius: 8px;" /></td>`
        : ''
    }
    <td style="vertical-align: top;">
      <div style="font-weight: bold; font-size: 15px; color: #7c3aed;">${companyName} Team</div>
      ${slogan ? `<div style="font-style: italic; font-size: 13px; color: #64748b; margin: 2px 0 8px;">"${slogan}"</div>` : ''}
      ${rows
        .map(
          (r) =>
            `<div style="font-size: 13px; margin: 2px 0;">${r.icon} <strong>${r.label}:</strong> <a href="${r.href}" style="color: #334155; text-decoration: none;">${r.value}</a></div>`
        )
        .join('\n      ')}
      <div style="margin-top: 8px;"><a href="{{UNSUBSCRIBE_URL}}" style="font-size: 11px; color: #94a3b8;">Unsubscribe</a></div>
    </td>
  </tr>
</table>`;
}
