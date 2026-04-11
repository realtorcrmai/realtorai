/**
 * Email Preview Endpoint — renders templates with sample data for design review.
 *
 * GET /preview/:templateType
 *
 * No auth required — this is a dev/design tool.
 * Returns full HTML email for the given template type using hardcoded sample data.
 */

import { Router } from 'express';
import { assembleEmail, type EmailData } from '../lib/email-blocks.js';

export const previewRouter: Router = Router();

// ── Sample data for previews ──────────────────────────────

const SAMPLE_CONTACT = {
  name: 'Jane Smith',
  firstName: 'Jane',
  type: 'buyer',
};

const SAMPLE_AGENT = {
  name: 'Kunal Dhindsa',
  brokerage: '24K Realty',
  phone: '604-555-2400',
  email: 'kunal@24krealty.ca',
  title: 'Licensed Realtor',
  initials: 'KD',
  instagram: 'https://instagram.com/24krealty',
  linkedin: 'https://linkedin.com/in/kunaldhindsa',
  brokerageAddress: '1500 West Georgia St, Vancouver, BC V6G 2Z6',
};

const SAMPLE_LISTING = {
  address: '123 Main Street',
  area: 'Kitsilano, Vancouver',
  price: '$899,000',
  beds: 3,
  baths: 2,
  sqft: '1,850',
  year: 2018,
  photos: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=660&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=660&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=660&q=80',
  ],
  openHouseDate: 'Saturday, April 12, 2026',
  openHouseTime: '2:00 PM — 4:00 PM',
  previousPrice: '$949,000',
  features: [
    { icon: '🏔', title: 'Mountain Views', desc: 'Unobstructed North Shore mountain panorama' },
    { icon: '🌳', title: 'Steps to Beach', desc: '3 min walk to Kits Beach' },
    { icon: '🍽', title: 'Restaurant Row', desc: 'West 4th Ave dining at your doorstep' },
  ],
};

const SAMPLE_MARKET = {
  avgPrice: '$1,245,000',
  avgDom: 18,
  inventoryChange: '+12%',
  recentSales: [
    { address: '456 Oak St', price: '$1,150,000', dom: 14 },
    { address: '789 Elm Ave', price: '$985,000', dom: 22 },
    { address: '321 Birch Rd', price: '$1,320,000', dom: 9 },
  ],
  priceComparison: { listing: '$899,000', average: '$1,245,000', diff: '-28%' },
};

const SAMPLE_ANNIVERSARY = {
  purchasePrice: '$720,000',
  currentEstimate: '$899,000',
  appreciation: '24.9%',
  equityGained: '$179,000',
  areaHighlights: [
    { icon: '🏗', text: 'New SkyTrain station opening 2027' },
    { icon: '📈', text: 'Neighbourhood values up 8.2% this year' },
    { icon: '🌿', text: 'New waterfront park completed' },
  ],
};

const SAMPLE_PHOTOS = [
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=660&q=80',
  'https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=660&q=80',
];

const SAMPLE_TESTIMONIAL = {
  quote: 'Kunal made our first home purchase completely stress-free. His market knowledge is unmatched.',
  name: 'Michael & Sarah Chen',
  role: 'Buyers — Kitsilano',
};

// ── Per-template sample data overrides ────────────────────

function getSampleData(templateType: string): EmailData {
  const base: EmailData = {
    contact: SAMPLE_CONTACT,
    agent: SAMPLE_AGENT,
    content: {
      subject: 'Sample Email Preview',
      intro: 'This is a preview of the email template with sample data.',
      body: '',
      ctaText: 'View Details',
      ctaUrl: 'https://24krealty.ca',
    },
    unsubscribeUrl: '#unsubscribe-preview',
    privacyUrl: '#privacy-preview',
    webViewUrl: '#web-view-preview',
  };

  switch (templateType) {
    case 'luxury_listing':
    case 'listing_alert':
      return {
        ...base,
        listing: SAMPLE_LISTING,
        content: {
          subject: 'New Listing — 123 Main Street',
          intro: 'A stunning 3-bedroom home has just hit the market in Kitsilano.',
          body: 'Beautifully renovated with an open-concept layout, chef\'s kitchen with quartz countertops, and a private south-facing patio. Walking distance to Kits Beach, restaurants, and transit.',
          ctaText: 'View Listing',
          ctaUrl: 'https://24krealty.ca/listings/123-main',
        },
      };

    case 'market_update':
      return {
        ...base,
        market: SAMPLE_MARKET,
        heroImageUrl: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=660&q=80',
        photos: SAMPLE_PHOTOS,
        content: {
          subject: 'Vancouver Market Update — April 2026',
          intro: 'Here\'s what happened in the Vancouver real estate market this month.',
          body: 'Inventory levels are rising while demand remains steady. Well-priced homes in desirable neighbourhoods continue to see multiple offers within the first week.',
          ctaText: 'Get Your Home Valuation',
          ctaUrl: 'https://24krealty.ca/valuation',
        },
      };

    case 'just_sold':
      return {
        ...base,
        listing: { ...SAMPLE_LISTING, price: '$925,000' },
        testimonial: SAMPLE_TESTIMONIAL,
        content: {
          subject: 'Just Sold — 123 Main Street',
          intro: 'Another home sold in Kitsilano! Congratulations to the new owners.',
          body: 'This beautiful 3-bedroom home received 6 offers and sold $26,000 over asking price in just 8 days on market.',
          ctaText: 'Thinking of Selling?',
          ctaUrl: 'https://24krealty.ca/sell',
        },
      };

    case 'open_house':
      return {
        ...base,
        listing: SAMPLE_LISTING,
        content: {
          subject: 'Open House — 123 Main Street',
          intro: 'You\'re invited to tour this stunning Kitsilano home this weekend.',
          body: 'Drop by for a private viewing. No appointment needed. Refreshments provided.',
          ctaText: 'Get Directions',
          ctaUrl: 'https://24krealty.ca/listings/123-main/directions',
        },
      };

    case 'home_anniversary':
      return {
        ...base,
        anniversary: SAMPLE_ANNIVERSARY,
        heroImageUrl: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=660&q=80',
        photos: SAMPLE_PHOTOS,
        content: {
          subject: 'Happy Home Anniversary, Jane!',
          intro: 'It\'s been one year since you moved into your beautiful home.',
          body: 'Your home has appreciated significantly since purchase. Here\'s a look at your investment and what\'s happening in your neighbourhood.',
          ctaText: 'Get Updated Valuation',
          ctaUrl: 'https://24krealty.ca/valuation',
        },
      };

    case 'neighbourhood_guide':
      return {
        ...base,
        heroImageUrl: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=660&q=80',
        photos: SAMPLE_PHOTOS,
        listing: { ...SAMPLE_LISTING, photos: undefined },
        content: {
          subject: 'Discover Kitsilano — Your Neighbourhood Guide',
          intro: 'Everything you need to know about living in one of Vancouver\'s most desirable neighbourhoods.',
          body: 'From Kits Beach to the boutiques on West 4th, this vibrant neighbourhood offers the perfect blend of urban convenience and coastal lifestyle.',
          ctaText: 'Explore Listings in Kitsilano',
          ctaUrl: 'https://24krealty.ca/areas/kitsilano',
        },
      };

    case 'price_drop':
      return {
        ...base,
        listing: SAMPLE_LISTING,
        content: {
          subject: 'Price Reduced — 123 Main Street',
          intro: 'The price has just been reduced on this Kitsilano gem.',
          body: 'Now $50,000 below the original asking price. This is an exceptional opportunity to own in one of Vancouver\'s most sought-after neighbourhoods.',
          ctaText: 'View Updated Price',
          ctaUrl: 'https://24krealty.ca/listings/123-main',
        },
      };

    case 'birthday':
      return {
        ...base,
        heroImageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=660&q=80',
        content: {
          subject: 'Happy Birthday, Jane!',
          intro: 'Wishing you a wonderful day filled with joy and celebration.',
          body: 'From all of us at 24K Realty, we hope your birthday is as special as you are. Thank you for being a valued client and friend.',
          ctaText: 'Send a Thank You',
          ctaUrl: 'https://24krealty.ca',
        },
      };

    case 'welcome':
      return {
        ...base,
        heroImageUrl: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=660&q=80',
        photos: SAMPLE_PHOTOS,
        market: SAMPLE_MARKET,
        content: {
          subject: 'Welcome to 24K Realty, Jane!',
          intro: 'Thank you for connecting with us. We\'re excited to help you on your real estate journey.',
          body: 'Whether you\'re buying, selling, or just exploring the market, I\'m here to provide expert guidance tailored to your goals.',
          ctaText: 'Browse Listings',
          ctaUrl: 'https://24krealty.ca/listings',
        },
      };

    case 'seller_report':
      return {
        ...base,
        heroImageUrl: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=660&q=80',
        photos: SAMPLE_PHOTOS,
        market: SAMPLE_MARKET,
        content: {
          subject: 'Your Monthly Seller Report — April 2026',
          intro: 'Here\'s what\'s happening in your local market this month.',
          body: 'Active listings in your area are up 12% from last month, but well-priced homes continue to sell quickly. Now could be an excellent time to list.',
          ctaText: 'Get Your Free CMA',
          ctaUrl: 'https://24krealty.ca/cma',
        },
      };

    default:
      return {
        ...base,
        heroImageUrl: 'https://images.unsplash.com/photo-1449034446853-66c86144b0ad?w=660&q=80',
        content: {
          subject: `Preview — ${templateType}`,
          intro: `This is a preview of the "${templateType}" template.`,
          body: 'Sample body text for this email template. Replace with real content when sending.',
          ctaText: 'Learn More',
          ctaUrl: 'https://24krealty.ca',
        },
      };
  }
}

// ── Route ─────────────────────────────────────────────────

const AVAILABLE_TEMPLATES = [
  'luxury_listing', 'listing_alert', 'market_update', 'just_sold',
  'birthday', 'home_anniversary', 'open_house', 'price_drop',
  'neighbourhood_guide', 'showing_confirmed', 'welcome', 're_engagement',
  'seller_report', 'cma_preview',
];

previewRouter.get('/preview', (_req, res) => {
  res.json({
    message: 'Email preview endpoint. Use /preview/:templateType to render a template.',
    available_templates: AVAILABLE_TEMPLATES,
  });
});

previewRouter.get('/preview/:templateType', (req, res) => {
  const { templateType } = req.params;

  if (!AVAILABLE_TEMPLATES.includes(templateType)) {
    res.status(400).json({
      error: `Unknown template type: "${templateType}"`,
      available_templates: AVAILABLE_TEMPLATES,
    });
    return;
  }

  const data = getSampleData(templateType);
  const html = assembleEmail(templateType, data);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});
