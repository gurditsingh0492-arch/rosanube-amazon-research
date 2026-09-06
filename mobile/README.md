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

## Installing it on a phone

### Option 1 — try it now with Expo Go (5 minutes, nothing to build)

On a computer with [Node.js](https://nodejs.org) 20+ and git installed:

```bash
git clone https://github.com/gurditsingh0492-arch/rosanube-amazon-research.git
cd rosanube-amazon-research/mobile
npm install
npx expo start
```

Install **Expo Go** from the Play Store or App Store, put the phone on the same Wi-Fi as the
computer, and scan the QR code that appears in the terminal. The app opens straight away and
reloads whenever the code changes.

The catch: the computer has to be running `npx expo start` for the app to open, and the data lives
inside Expo Go. It is the right way to try the app, not to run the business on it.

### Option 2 — a real installable app (recommended for daily use)

EAS Build compiles in Expo's cloud, so no Android Studio and no Mac are needed for Android. A free
Expo account covers the free build queue.

```bash
npm install -g eas-cli
eas login                 # create the account at expo.dev first
eas build:configure       # only the first time — links the project to your account
npm run build:apk         # Android .apk
```

The build runs in the cloud (usually 10–20 minutes) and finishes with a download link plus a QR
code. Open that link on the phone, allow "install from unknown sources", and the app installs like
any other — its own icon, works offline, data stays on the device.

For iPhone, `npm run build:ios` needs a paid Apple Developer account ($99/year). Without one,
Expo Go is the practical route on iOS.

`eas.json` in this folder already defines the build profiles — `preview` produces an installable
.apk, `production` produces the .aab that Google Play requires.

### Updating later

Pull the newest code and rebuild:

```bash
git pull
npm install
npm run build:apk
```

Installing the new .apk over the old one keeps the existing data.

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
