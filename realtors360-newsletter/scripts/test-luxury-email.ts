import { Resend } from 'resend';
import { config } from '../src/config.js';
import { assembleEmail } from '../src/lib/email-blocks.js';

const resend = new Resend(config.RESEND_API_KEY);

async function main() {
  const html = assembleEmail('luxury_listing', {
    contact: { name: 'Aman Dhindsa', firstName: 'Aman', type: 'buyer' },
    agent: {
      name: 'Kunal Dhindsa',
      brokerage: 'Realtors360',
      phone: '604-555-0123',
      initials: 'K',
      title: 'Licensed REALTOR',
      email: 'hello@realtors360.ai',
    },
    content: {
      subject: 'Modern Luxury Living at Mirabel',
      intro: 'Experience elevated sky home living at Mirabel. This spectacular 2-bedroom, 3-bathroom luxury residence showcases sweeping ocean views, fantastic natural light, and beautifully designed living spaces. The open interior blends sophistication and function with Sub-Zero, Wolf, and Bosch appliances and seamless indoor-outdoor flow to an oversized south-facing terrace perfect for entertaining above the city.',
      body: 'Both bedrooms feature private ensuites and generous closets, while the primary suite offers a serene spa-inspired bath with marble finishes and sleek design. Just steps from the beaches, dining, and shops of Vancouver\'s coveted West End.',
      ctaText: 'VIEW FULL LISTING',
      ctaUrl: 'https://realtors360.ai',
    },
    listing: {
      address: '1503-1365 Davie Street',
      area: 'Vancouver, BC',
      price: 2199000,
      beds: 2,
      baths: 3,
      sqft: '1,335',
      year: 2019,
      photos: [
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=800&fit=crop',
      ],
      openHouseDate: 'Saturday, April 12th',
      openHouseTime: '2:00 PM – 4:00 PM',
    },
    unsubscribeUrl: 'https://realtors360.ai/unsubscribe',
  });

  console.log('HTML length:', html.length, 'chars');

  const result = await resend.emails.send({
    from: 'Kunal Dhindsa <hello@realtors360.ai>',
    to: 'amandhindsa@outlook.com',
    subject: 'NEW TO MARKET: Modern Luxury Living at Mirabel',
    html,
  });

  console.log('Result:', result.data?.id ?? JSON.stringify(result.error));
}

main().catch(console.error);
