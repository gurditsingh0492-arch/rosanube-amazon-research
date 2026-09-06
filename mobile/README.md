# Rosanube Admin

Internal mobile app for **MOCHO ATENTO – UNIPESSOAL LDA** (brand **Rosanube**) — an Amazon.es
FBA / private-label business operating from Portugal.

It replaces the spreadsheet that usually holds suppliers, SKUs, purchase orders, tasks and
expenses, and does the one calculation that matters most on every screen: what a unit actually
earns after Spanish VAT, the Amazon referral fee and FBA fulfilment.

Everything is stored **on the phone** in SQLite. Nothing is uploaded, and no Amazon, Helium 10 or
Keepa account is connected — every figure is one you typed in.

## What's in it

| Screen | What it does |
| --- | --- |
| **Overview** | Cash tied up in stock, profit still to earn, open PO value, month's spend, restock queue, incoming shipments, next tasks |
| **Products** | SKU / ASIN catalogue with live unit economics — profit per unit, margin %, ROI, stock vs. reorder point |
| **Orders** | Purchase orders with line items, freight and duties, landed cost per unit; marking one *received* books its units into stock |
| **Suppliers** | Contacts, MOQ, lead time, payment terms, rating |
| **More → Tasks** | Follow-ups with due dates, priorities and overdue flags |
| **More → Expenses** | Spend by category with a running monthly total |
| **More → Settings** | CSV export of every table, sample data, full reset |

### Unit economics

For each product the app computes, per unit:

```
net revenue   = sale price ÷ (1 + VAT%)
referral fee  = net revenue × referral%
landed cost   = unit cost + freight per unit
profit        = net revenue − referral fee − FBA fee − landed cost
margin %      = profit ÷ net revenue
ROI %         = profit ÷ landed cost
```

The referral fee is taken on the VAT-exclusive price, which is how Amazon charges VAT-registered
sellers. Defaults are Spain's 21% VAT and a 15% referral rate — both editable per product.

## Running it

```bash
cd mobile
npm install
npx expo start
```

Then scan the QR code with **Expo Go** (Android / iOS) on the same Wi-Fi. Every change reloads live.

### Installing it properly on a phone

Expo Go is fine for daily use, but for a real installable app use EAS Build (needs a free Expo
account, builds in the cloud — no Mac required for Android):

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # produces an .apk to sideload
eas build --platform ios                         # needs an Apple Developer account
```

## Layout

```
app/                     expo-router routes (file = screen)
  (tabs)/                bottom tab bar: overview, products, orders, suppliers, more
  product/[id].tsx       detail + edit, "new" creates
  order/[id].tsx         purchase order with line-item sheet
  supplier|task|expense/[id].tsx
  tasks.tsx expenses.tsx settings.tsx
src/db/                  SQLite: schema migrations, one repository per table
  index.ts               connection, migration runner, useQuery hook
  schema.ts              append-only migrations (never edit a shipped entry)
src/lib/                 economics, formatting, CSV, share sheet
src/ui/                  theme, shared components, form inputs, status labels
```

Writes go through `mutate()` in `src/db/index.ts`, which bumps a counter every live `useQuery`
subscribes to — so lists refresh themselves after an edit on a detail screen.

## Adding a field

1. Append a new SQL string to `migrations` in `src/db/schema.ts` (never edit an existing one).
2. Add the column to the type in `src/db/types.ts`.
3. Add it to the INSERT/UPDATE in that table's repository.
4. Add the input to the detail screen.

## Backups

There is no cloud sync. **Settings → Export** writes a CSV per table and opens the share sheet, so
a copy can go to Drive or email. Uninstalling the app deletes the database.
