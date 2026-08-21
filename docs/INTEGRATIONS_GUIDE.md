# Integrations Guide (Razorpay · Stripe · WhatsApp)

This guide explains how to set up the third-party integrations used by the
customer online booking flow. **Every integration is disabled by default.**
Until you add the required secret keys to your environment, the system
simply skips that integration (payments fall back to "pay at the counter",
WhatsApp messages are not sent). A missing key never breaks an integration.

---

## 1. Environment Variables Overview

All keys live in the environment, **never in the repository**. Local development
uses `.env`; production should use your hosting platform's env/secrets store
(Vercel Environment Variables, Railway Variables, AWS Secrets Manager, etc.).
A documented template is available in `.env.example`.

| Variable | Integration | Purpose | Required for |
| :--- | :--- | :--- | :--- |
| `RAZORPAY_KEY_ID` | Razorpay | Public API key id | Creating payment links |
| `RAZORPAY_KEY_SECRET` | Razorpay | Secret API key | Creating payment links |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay | Webhook signature secret | Webhook endpoint |
| `STRIPE_SECRET_KEY` | Stripe | Secret API key | Checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signature secret | Webhook endpoint |
| `WHATSAPP_API_URL` | WhatsApp | Gateway HTTP endpoint | Sending messages |
| `WHATSAPP_API_TOKEN` | WhatsApp | Gateway bearer token | Sending messages |
| `WHATSAPP_FROM` | WhatsApp | Sender id/number (optional) | Sending messages |
| `APP_BASE_URL` | All | Public host for payment redirects | Payment success/cancel URLs |

> **How the booking flow uses them:**
> 1. A customer books a slot at `/book/<store-slug>`.
> 2. If the store has selected a payment provider **and** an advance amount
>    > 0 **and** the provider keys are present in env → the system creates a
>    → hosted payment (Razorpay Payment Link / Stripe Checkout Session) and
>    shows the customer a "Pay" button.
> 3. If keys are missing or the provider is `NONE`, the booking is created
>    without payment — the customer pays at the counter.
> 4. When a payment succeeds, the provider's webhook marks the booking as paid.
> 5. WhatsApp messages are sent on booking creation and cancellation.

---

## 2. Razorpay (Indian Payments)

### 2.1 Account Setup
1. Create a business account at <https://dashboard.razorpay.com>.
2. Complete KYC under **Settings → Profile** (needed for live mode).
3. Use **Test Mode** for development — test cards are provided by Razorpay.

### 2.2 Get the keys
1. Dashboard → **Settings → API Keys → Generate Keys**.
2. Copy `Key ID` → `RAZORPAY_KEY_ID` and `Key Secret` → `RAZORPAY_KEY_SECRET`.
3. Dashboard → **Settings → Webhooks → Add Webhook**:
   - URL: `https://<your-domain>/api/integrations/razorpay/webhook`
   - Events enabled: `payment_link.paid` (minimal)
   - Copy the generated secret → `RAZORPAY_WEBHOOK_SECRET`.

### 2.3 Configure the app
In `.env`:
```bash
RAZORPAY_KEY_ID="rzp_test_xxxxxxxxxxxxxxxx"
RAZORPAY_KEY_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
RAZORPAY_WEBHOOK_SECRET="xxxxxxxxxxxxxxxxxxxxxxxx"
```
Then in Admin → **Food/Menu → Customer Online Booking**, set
**Payment provider = Razorpay** and an **Advance amount** (e.g. ₹200).
Restart the dev server after changing `.env`.

### 2.4 Test
1. Book a slot — the success screen shows **"Pay ₹200.00 via RAZORPAY"**.
2. Open the generated payment link and pay with a Razorpay test card.
3. The webhook flips the booking's payment status to `PAID`
   (visible on the staff **Bookings** page).

---

## 3. Stripe (International / Card Payments)

### 3.1 Account Setup
1. Create an account at <https://dashboard.stripe.com>.
2. Activate your account (add bank details) for live payments; development can
   run purely on test mode with **test cards** (`4242 4242 4242 4242`).

### 3.2 Get the keys
1. Dashboard → **Developers → API Keys**.
2. Publishable key is not required by this app (hosted Checkout is used), copy:
   - `sk_test_...` or `sk_live_...` → `STRIPE_SECRET_KEY`
3. Dashboard → **Developers → Webhooks → Add endpoint**:
   - URL: `https://<your-domain>/api/integrations/stripe/webhook`
   - Event: `checkout.session.completed`
   - Copy the `whsec_...` secret → `STRIPE_WEBHOOK_SECRET`.

### 3.3 Configure the app
In `.env`:
```bash
STRIPE_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxxxxxxxxxxxxxxxxx"
```
Then in Admin → **Food/Menu → Customer Online Booking**, set
**Payment provider = Stripe** and an **Advance amount**.

### 3.4 Test
1. Stripe provides a CLI for local webhook forwarding:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/integrations/stripe/webhook
   ```
2. Book + pay with a test card and confirm the status flips to `PAID`.

---

## 4. WhatsApp (Booking Notifications)

### 4.1 What the app sends
- Booking created → confirmation message to the customer's phone.
- Booking cancelled → cancellation message to the customer's phone.

### 4.2 Choose a gateway
The app calls a **generic HTTP gateway** configured via env. The payload is:
```json
{
  "messaging_product": "whatsapp",
  "to": "91xxxxxxxxxx",
  "type": "text",
  "text": { "body": "message text" }
}
```
Compatible options (pick one):

| Provider | Setup notes | Example `WHATSAPP_API_URL` |
| :--- | :--- | :--- |
| **WhatsApp Business Cloud API (Meta)** | Create WABA at business.whatsapp.com, get a permanent token | `https://graph.facebook.com/v20.0/<phone-number-id>/messages` |
| **Twilio WhatsApp** | Messaging Service → WhatsApp sender | `https://api.twilio.com/2010-04-01/Accounts/<sid>/Messages.json` (needs Basic Auth — adapter required) |
| **WATI / AiSensy / Interakt** | Shared inbox SaaS with API tokens | Provider dashboard gives the URL + token |

### 4.3 Configure the app
```bash
WHATSAPP_API_URL="https://graph.facebook.com/v20.0/1234567890/messages"
WHATSAPP_API_TOKEN="EAAG...long-lived-token"
WHATSAPP_FROM=""        # optional, provider-specific sender id
```
No keys present → the settings page shows **"WhatsApp is NOT configured"** and
messages are silently skipped.

### 4.4 Test
Book a slot with your own phone number as the customer phone; expect a booking
confirmation WhatsApp within seconds. Cancel it from the staff Bookings page and
expect the cancellation message.

**Manual POS bookings (walk-in):** when staff starts a session with a customer
phone, WhatsApp sends the store's booking link + QR image. The QR image is
served by the app itself (`/qr/book/<slug>`), so `APP_BASE_URL` must point to a
publicly reachable URL for the image to load inside WhatsApp.

**Live floor share:** staff open **Live Floor → "Booking QR"** to display the QR,
download it as PNG, print it, or copy the link — no integration required,
works for every store.

---

## 5. Disabling & Behavior Matrix

| Provider | Keys present? | Store setting | Behavior |
| :--- | :--- | :--- | :--- |
| Payments | No | Razorpay/Stripe | Option greyed out in settings; bookings go unpaid (pay at counter) |
| Payments | Yes | Razorpay/Stripe | Advance payment link shown to customer |
| Payments | Yes/No | NONE | No payment step; pay at counter |
| WhatsApp | No | — | Messages skipped silently |
| WhatsApp | Yes | — | Booking + cancellation messages sent |

## 6. Production Checklist
1. Never commit `.env`; keep `.env.example` updated (it is).
2. Use live keys only after KYC/activation.
3. Configure the same webhook URLs with your production domain.
4. Set `APP_BASE_URL` to the public production URL.
5. Restart the server after any `.env` change.
