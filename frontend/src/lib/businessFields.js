// Shared between BusinessProfile (editing an existing business) and AddBusinessModal
// (reviewing a scraped draft before creating one) — same shape, same labels.
export const BUSINESS_FIELDS = [
  { key: 'name', label: 'Business Name' },
  { key: 'specialisation', label: 'Specialisation' },
  { key: 'location', label: 'Location' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'website', label: 'Website' },
  { key: 'contactFirstName', label: 'Contact First Name' },
  { key: 'contactLastName', label: 'Contact Last Name' },
  { key: 'services', label: 'Services' },
  { key: 'awards', label: 'Awards' },
  { key: 'yearsExperience', label: 'Years Experience' },
];

// The backend forwards Prisma's own error message verbatim (e.g. "Unique constraint
// failed on the fields: (`email`)") — readable enough to debug, not to show a user.
// This is currently the only case that can realistically happen here (email is the
// only unique field on Business), so it's translated specifically rather than
// generically parsed.
export function friendlySaveError(message) {
  if (message?.includes('Unique constraint') && message?.includes('email')) {
    return 'That email is already used by another business — each business needs a unique email.';
  }
  return message || 'Failed to save. Please try again.';
}
