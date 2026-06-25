# Stripe As-Built Record — community/support/index.html

All Stripe objects were created via API on **2026-06-25** using live-mode credentials
from Azure Key Vault (`omlab-secrets`). The page is fully wired. No placeholder tokens
remain. **Do not merge to `gh-pages` until the CEO reviews and signs off.**

---

## Mode

**LIVE** (`sk_live_` / `pk_live_`). Objects are real and will accept real payment cards.

---

## Created Objects

### One-Time Donation Prices (one-time, USD)

| Object ID                          | Lookup key               | Amount   |
|------------------------------------|--------------------------|----------|
| `price_1TmM7vBjjHl3Ee7Qsur1x468`  | `instar_onetime_25`      | $25.00   |
| `price_1TmM7wBjjHl3Ee7Quf88SUxn`  | `instar_onetime_100`     | $100.00  |
| `price_1TmM7wBjjHl3Ee7QgW8jUh5T`  | `instar_onetime_500`     | $500.00  |
| `price_1TmM7wBjjHl3Ee7QFSX4AdFM`  | `instar_onetime_custom`  | Custom (min $5) |

### One-Time Donation Payment Links

| Payment Link ID                      | URL                                                    | Amount   |
|--------------------------------------|--------------------------------------------------------|----------|
| `plink_1TmM8aBjjHl3Ee7QeNjnfgpf`    | https://buy.stripe.com/00wdR8eyfgIx49v3iWbAs00        | $25      |
| `plink_1TmM8aBjjHl3Ee7Qs6hCcark`    | https://buy.stripe.com/eVq28q61Jdwl21ncTwbAs01        | $100     |
| `plink_1TmM8bBjjHl3Ee7QEtfEZhtG`    | https://buy.stripe.com/5kQ9ASbm31ND21n7zcbAs02        | $500     |
| `plink_1TmM8cBjjHl3Ee7QXRVfs66E`    | https://buy.stripe.com/aFabJ0fCjcsheO95r4bAs03        | Custom   |

### Friends of INSTAR — Products (recurring)

| Product ID           | Name                                  |
|----------------------|---------------------------------------|
| `prod_UltwJqGZDqHtE1` | Friends of INSTAR — Friend           |
| `prod_Ultwo9X4XNAgUO` | Friends of INSTAR — Supporter        |
| `prod_Ultw6mdtrSa1bf` | Friends of INSTAR — Patron           |
| `prod_UltwqhRyy1lZda` | Friends of INSTAR — Benefactor       |

### Friends of INSTAR — Annual Prices (recurring/year, USD)

| Price ID                           | Lookup key                        | Amount / yr |
|------------------------------------|-----------------------------------|-------------|
| `price_1TmM8oBjjHl3Ee7Qkouu2Buk`  | `instar_friends_friend_annual`    | $60         |
| `price_1TmM8pBjjHl3Ee7QMzjkbIEV`  | `instar_friends_supporter_annual` | $180        |
| `price_1TmM8pBjjHl3Ee7QYMYmXzue`  | `instar_friends_patron_annual`    | $600        |
| `price_1TmM8qBjjHl3Ee7QvUnw2Ymp`  | `instar_friends_benefactor_annual`| $1,200      |

### Friends of INSTAR — Subscription Payment Links

The Stripe Pricing Table API is not available on this account (it is a dashboard-only
feature). Subscription Payment Links were created as the fallback. The recurring section
on the page renders four tier cards, each linking to its own subscription Payment Link.

| Payment Link ID                      | URL                                                    | Tier        |
|--------------------------------------|--------------------------------------------------------|-------------|
| `plink_1TmM9GBjjHl3Ee7QEmnNLYp0`    | https://buy.stripe.com/bJedR82Px63TaxT5r4bAs04        | Friend      |
| `plink_1TmM9GBjjHl3Ee7QgXhkWDIJ`    | https://buy.stripe.com/00wcN4ahZ2RHeO97zcbAs05        | Supporter   |
| `plink_1TmM9GBjjHl3Ee7Qh2REM52K`    | https://buy.stripe.com/3cI4gy9dV4ZP0Xjf1EbAs06        | Patron      |
| `plink_1TmM9HBjjHl3Ee7QhnEmB7KN`    | https://buy.stripe.com/8x214m4XFfEt9tP06KbAs07        | Benefactor  |

If you later want a unified Pricing Table UI, create it manually in the Stripe Dashboard
(Products > Pricing tables), then re-embed the `<stripe-pricing-table>` component in place
of the tier card grid.

### Billing Portal Configuration

| Config ID                        | Default? | Features enabled                              |
|----------------------------------|----------|-----------------------------------------------|
| `bpc_1TmM9TBjjHl3Ee7QEFVnHURy`  | Yes      | invoice history, payment method update, cancel |

**Shareable portal login URL:** The `billing.stripe.com/p/login/...` URL is only
accessible from the Stripe Dashboard (Settings > Customer portal > "Link to portal").
The page currently uses a `mailto:info@instarlab.org` fallback for the "manage membership"
link. Once you have the shareable URL from the Dashboard, replace:

```html
<a href="mailto:info@instarlab.org?subject=Membership%20Management">contact INSTAR Lab</a>
```
with:
```html
<a href="https://billing.stripe.com/p/login/YOUR_PORTAL_PATH" target="_blank" rel="noopener noreferrer">Stripe customer portal</a>
```

in `community/support/index.html` (search for `mailto:info@instarlab.org`).

---

## Placeholder → Real Value Mapping (as wired)

| Former placeholder            | Wired value                                                   |
|-------------------------------|---------------------------------------------------------------|
| `PLACEHOLDER_ONETIME_25`      | `https://buy.stripe.com/00wdR8eyfgIx49v3iWbAs00`             |
| `PLACEHOLDER_ONETIME_100`     | `https://buy.stripe.com/eVq28q61Jdwl21ncTwbAs01`             |
| `PLACEHOLDER_ONETIME_500`     | `https://buy.stripe.com/5kQ9ASbm31ND21n7zcbAs02`             |
| `PLACEHOLDER_ONETIME_CUSTOM`  | `https://buy.stripe.com/aFabJ0fCjcsheO95r4bAs03`             |
| `PLACEHOLDER_PRICING_TABLE_ID`| N/A — pricing table replaced with Payment Link tier cards     |
| `pk_live_PLACEHOLDER`         | N/A — publishable key not needed (Payment Links are plain URLs)|
| `PLACEHOLDER_PORTAL`          | `mailto:info@instarlab.org` fallback (see portal note above)  |

---

## Remaining manual steps before go-live

1. **CEO sign-off** on tier amounts and page content.
2. **Shareable portal URL** — get from Stripe Dashboard > Settings > Customer portal,
   then replace the `mailto:` fallback in the page (see above).
3. **EIN disclosure** — find the comment `<!-- TODO: Insert real EIN ...` in index.html
   and replace with the actual EIN from the IRS determination letter.
4. **Test a transaction end-to-end** in a Stripe test environment if possible before
   merging to gh-pages.
5. **Merge the branch** (`worktree-agent-a57734bc46d8f15df`) to `gh-pages` only after
   all the above are done and the CEO has reviewed.

---

## Security Notes

- The **publishable key** (`pk_live_...`) is safe in public HTML — it is designed for
  client-side use. Do NOT put the **secret key** (`sk_live_...`) anywhere in this repo.
- Payment amounts are enforced server-side by Stripe (set when creating Payment Links/Prices),
  so there is no client-side amount trust issue.
- No backend server, no Azure Function, no secret key on this site. Stripe handles all PCI scope.
- Secret key is stored in Azure Key Vault (`omlab-secrets`, secret name `stripe-secret-key-live`).
