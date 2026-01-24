# Ákos Atelier - Wearable Art

A simple responsive website for Ákos Nemes' wearable art clothing.

## Features

- Full-screen hero section showcasing garments with navigation arrows
- Responsive 3-column product grid below
- Shopping cart with checkout
- User login for account management and shipment tracking
- Secure payment processing (placeholder)

## Getting Started

1. Install dependencies: `npm install`
2. Run the development server: `npm run dev`
3. Open your browser to `http://localhost:3000`

## Stripe Checkout

Stripe Checkout is served by the Express app in `server/index.js` so card data never touches the browser or server.

1. Install server dependencies: `cd server && npm install`
2. Add keys to `server/.env`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `STRIPE_PUBLISHABLE_KEY=pk_test_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...`
   - `BASE_URL=http://localhost:3000`
3. Start the server: `node server/index.js`
4. Visit `http://localhost:3000/checkout.html`

To test webhooks locally with the Stripe CLI:
1. `stripe listen --forward-to localhost:3000/api/stripe-webhook`
2. Copy the `whsec_...` value into `STRIPE_WEBHOOK_SECRET`.

## Products

- T-Shirts: £16 each
- Hoodies: £48 each
- Available in sizes S, M, L, XL

## Pages

- `index.html`: Main page with hero and product grid
- `login.html`: User login
- `checkout.html`: Payment and shipping details
