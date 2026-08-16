import prisma from './prisma.js';

// Starting point for a new profile's excludeSites — generic directory sites only, since
// these are noise regardless of industry. Deliberately no industry-specific entries
// (e.g. health-directory sites) here — those only make sense once you know what
// industry a given profile is actually in, so they belong on the Owner Profile page as
// something you add yourself, not something assumed for you.
const DEFAULT_EXCLUDE_SITES = [
  'yelp.com',
  'yellowpages.com',
  'facebook.com',
  'yellowpages.ca',
  'reddit.com',
  'instagram.com',
];

// This app has exactly one OwnerProfile row, created lazily on first touch rather than
// at install time — several call sites (the profile page itself, but also anything that
// writes onto it, like connecting Gmail) need "the row, creating it if this is the very
// first thing anyone's done" rather than assuming the profile page has already been
// visited once.
export async function getOrCreateOwnerProfile() {
  let profile = await prisma.ownerProfile.findFirst();
  if (!profile) {
    profile = await prisma.ownerProfile.create({
      data: {
        companyName: 'My Company',
        senderName: 'Your Name',
        senderEmail: 'you@example.com',
        excludeSites: DEFAULT_EXCLUDE_SITES,
      },
    });
  }
  return profile;
}
