// Starter full-email layouts — a fixed design (like signatureTemplate.js) containing
// {{PLACEHOLDER}} tokens instead of baked-in values. Unlike the signature (which bakes
// in the current profile values directly, since a signature doesn't need to react to
// per-email context), these tokens are meant to stay literal even after saving: the
// email-generation workflow substitutes them with AI-written content and live profile/
// business values at actual generate time, so editing your logo or services later
// doesn't require regenerating the template.

export const INTRO_PLACEHOLDERS = [
  { token: '{{COMPANY_NAME}}', description: 'Your company name' },
  { token: '{{LOGO_URL}}', description: 'Your logo image' },
  { token: '{{HERO_IMAGE_URL}}', description: 'Intro email header image' },
  { token: '{{PREHEADER}}', description: 'Hidden inbox preview text' },
  { token: '{{BODY}}', description: 'AI-written opening paragraph(s)' },
  { token: '{{SERVICES_INTRO}}', description: 'AI-written transition sentence into your services' },
  { token: '{{SERVICES}}', description: 'Your services, as cards' },
  { token: '{{SIGNATURE}}', description: 'Your email signature' },
  { token: '{{UNSUBSCRIBE_URL}}', description: "This recipient's unsubscribe link" },
];

export const OFFER_PLACEHOLDERS = [
  { token: '{{COMPANY_NAME}}', description: 'Your company name' },
  { token: '{{DISCOUNT_PERCENTAGE}}', description: "The offer's discount percentage" },
  { token: '{{OFFER_PERIOD}}', description: "The offer's duration" },
  { token: '{{OFFER_IMAGE_URL}}', description: "The offer's header image" },
  { token: '{{BODY}}', description: 'AI-written offer paragraph(s)' },
  { token: '{{SERVICES}}', description: 'Your services, as cards' },
  { token: '{{SIGNATURE}}', description: 'Your email signature' },
  { token: '{{UNSUBSCRIBE_URL}}', description: "This recipient's unsubscribe link" },
];

export function buildIntroTemplateHtml() {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif;">
        <tr>
          <td align="center" style="padding: 20px;">
            <img src="{{LOGO_URL}}" alt="{{COMPANY_NAME}}" width="150" style="display: block; max-width: 150px;" />
          </td>
        </tr>
        <tr>
          <td style="padding: 0 20px;"><hr style="border: 0; height: 1px; background-color: #e0e0e0;" /></td>
        </tr>
        <tr>
          <td align="center" style="padding: 10px 20px;">
            <img src="{{HERO_IMAGE_URL}}" alt="" width="560" style="display: block; max-width: 100%; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td style="padding: 20px 40px 10px; font-size: 15px; line-height: 24px; color: #333333;">
            {{BODY}}
            <p style="margin: 20px 0 10px;">{{SERVICES_INTRO}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 0 20px 20px;">{{SERVICES}}</td>
        </tr>
        <tr>
          <td style="padding: 0 40px 20px; font-size: 15px; line-height: 24px; color: #333333;">
            {{SIGNATURE}}
          </td>
        </tr>
        <tr>
          <td align="center" style="background-color: #3f51b5; padding: 16px; font-family: Arial, sans-serif;">
            <a href="{{UNSUBSCRIBE_URL}}" style="color: #bbdefb; font-size: 12px; text-decoration: underline;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

export function buildOfferTemplateHtml() {
  return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f0f4f8;">
  <tr>
    <td align="center" style="padding: 20px 0;">
      <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; font-family: Arial, sans-serif;">
        <tr>
          <td align="center" style="padding: 30px 0; background-color: #1e3a8a;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0;">{{COMPANY_NAME}}</h1>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 30px 40px 20px; background-color: #f9fafb;">
            <p style="color: #3730a3; font-size: 18px; font-weight: 600; margin: 0 0 10px;">Exclusive Offer</p>
            <h2 style="color: #1e3a8a; font-size: 40px; font-weight: 900; margin: 0;">{{DISCOUNT_PERCENTAGE}}% OFF FIRST {{OFFER_PERIOD}}</h2>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 10px 40px;">
            <img src="{{OFFER_IMAGE_URL}}" alt="" width="520" style="display: block; max-width: 100%; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td style="padding: 30px 40px 10px; font-size: 15px; line-height: 24px; color: #374151;">
            {{BODY}}
          </td>
        </tr>
        <tr>
          <td style="padding: 0 20px 30px;">{{SERVICES}}</td>
        </tr>
        <tr>
          <td style="padding: 0 40px 20px; font-size: 15px; line-height: 24px; color: #374151;">
            {{SIGNATURE}}
          </td>
        </tr>
        <tr>
          <td align="center" style="background-color: #1e3a8a; padding: 20px; font-family: Arial, sans-serif;">
            <a href="{{UNSUBSCRIBE_URL}}" style="color: #93c5fd; font-size: 11px;">Unsubscribe</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
