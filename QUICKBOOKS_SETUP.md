# QuickBooks Integration Setup Guide

## Overview

Your K&R POWERWASHING admin app now includes QuickBooks integration to sync invoice information directly to your QuickBooks account.

## ⭐ Demo Mode

**NEW:** The integration now includes a DEMO mode that allows you to test the sync functionality without QuickBooks credentials. When credentials are not configured, invoices will be marked as synced with a demo QuickBooks ID. This is perfect for testing the workflow!

## Features

✅ **One-Click Invoice Sync** - Send invoice data to QuickBooks with a single click
✅ **Sync Status Indicators** - Visual indicators show which invoices have been synced
✅ **Preserved Invoice Amounts** - All existing invoice amounts are kept intact
✅ **Real-time Feedback** - Loading states and success/error messages
✅ **Duplicate Prevention** - Already synced invoices are disabled from re-syncing

## How to Use

1. **Navigate to Invoices Tab** - Go to the Invoices section in your admin dashboard

2. **View Invoice Data** - All invoices display with their original amounts preserved:
   - Invoice ID
   - Customer Name
   - Service Description
   - Amount
   - Due Date
   - Status
   - QuickBooks Sync Status

3. **Sync to QuickBooks** - Click the upload button (↑) next to any invoice to sync it to QuickBooks

4. **Monitor Sync Status** - Each invoice shows:
   - ✓ **Synced** (Green checkmark) - Invoice successfully sent to QuickBooks
   - ⚠ **Not synced** (Gray icon) - Invoice not yet synced

## Required Setup

You need to configure three environment variables with your QuickBooks credentials:

### 1. QUICKBOOKS_CLIENT_ID
- Your QuickBooks application's Client ID
- Get this from the QuickBooks Developer Portal

### 2. QUICKBOOKS_ACCESS_TOKEN
- Your QuickBooks OAuth Access Token
- Generated through the QuickBooks OAuth flow

### 3. QUICKBOOKS_REALM_ID
- Your QuickBooks Company ID (also called Realm ID)
- Found in your QuickBooks company settings

### How to Get QuickBooks Credentials

1. **Create a QuickBooks Developer Account**
   - Go to https://developer.intuit.com/
   - Sign up for a developer account

2. **Create an App**
   - Navigate to "My Apps" in the developer dashboard
   - Click "Create an app"
   - Select "QuickBooks Online and Payments"

3. **Get Your Credentials**
   - **Client ID**: Found in your app's Keys & credentials section
   - **Realm ID**: Your QuickBooks Company ID (found in settings)
   - **Access Token**: Generate via OAuth 2.0 flow (see QuickBooks OAuth documentation)

4. **Environment**
   - The integration uses QuickBooks Sandbox for testing
   - To use production, update the API URL in `/supabase/functions/server/index.tsx`
   - Change `sandbox.api.intuit.com` to `api.intuit.com`

## API Endpoints

The backend includes two QuickBooks endpoints:

### POST `/make-server-4e82aa29/quickbooks/sync-invoice`
Syncs an invoice to QuickBooks
- **Body**: `{ invoice: InvoiceObject }`
- **Response**: `{ success: true, quickbooksInvoiceId: string }`

### GET `/make-server-4e82aa29/quickbooks/invoice/:invoiceId`
Gets sync status for an invoice
- **Response**: `{ synced: boolean, quickbooksId?: string, syncedAt?: string }`

## Invoice Data Format

When syncing to QuickBooks, the following invoice data is sent:
- **Amount** - Preserved from original invoice (no modifications)
- **Service Description** - Service name
- **Customer Name** - Customer information
- **Due Date** - Payment due date
- **Invoice Number** - Your internal invoice ID

## Troubleshooting

### "QuickBooks credentials not configured"
- The app will run in DEMO mode automatically
- Invoices will be marked as synced with mock IDs
- To use real QuickBooks, configure the environment variables

### "QuickBooks API error: 502"
- This usually means:
  1. Access token is invalid or expired
  2. Realm ID is incorrect
  3. QuickBooks sandbox is temporarily unavailable
- **Solution**: Verify your credentials are correct and try again

### "QuickBooks authentication failed (401)"
- Your access token has expired (tokens expire after 1 hour)
- **Solution**: Generate a new access token using OAuth flow

### "QuickBooks authorization failed (403)"
- Your app doesn't have the required permissions
- **Solution**: Check your QuickBooks app permissions in the developer portal

### "Bad Request (400)"
- The QuickBooks company might not have required setup
- Ensure you have:
  - At least one customer created
  - A service item created (for invoice line items)
- **Solution**: Set up your QuickBooks sandbox company properly

### Token Expiration
- QuickBooks access tokens expire after 1 hour
- Refresh tokens are valid for 100 days
- You'll need to implement a token refresh mechanism for production use

## Important Notes

- ✅ **All invoice amounts are preserved** - No modifications to existing amounts
- ⚠️ Access tokens need to be refreshed regularly in production
- 📝 Currently uses QuickBooks Sandbox environment
- 🔒 All credentials are stored securely as environment variables
- 🚀 Syncing is performed server-side for security

## Next Steps

1. Obtain your QuickBooks credentials from the developer portal
2. Add the credentials as environment variables
3. Test the integration with a sample invoice
4. Monitor the browser console for detailed sync logs
5. For production use, implement OAuth token refresh

## Support

For QuickBooks API documentation, visit:
https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice