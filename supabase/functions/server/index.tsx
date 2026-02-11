import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-4e82aa29/health", (c) => {
  return c.json({ status: "ok" });
});

// QuickBooks invoice sync endpoint
app.post("/make-server-4e82aa29/quickbooks/sync-invoice", async (c) => {
  try {
    const body = await c.req.json();
    const { invoice } = body;

    if (!invoice) {
      console.error('No invoice data provided in request');
      return c.json({ error: "Invoice data is required" }, 400);
    }

    console.log('Starting QuickBooks sync for invoice:', invoice.id);

    // Get QuickBooks credentials from environment variables
    const qbClientId = Deno.env.get('QUICKBOOKS_CLIENT_ID');
    const qbAccessToken = Deno.env.get('QUICKBOOKS_ACCESS_TOKEN');
    const qbRealmId = Deno.env.get('QUICKBOOKS_REALM_ID');

    console.log('QuickBooks credentials check:', {
      hasClientId: !!qbClientId,
      hasAccessToken: !!qbAccessToken,
      hasRealmId: !!qbRealmId
    });

    // If credentials are not configured, use mock mode for demonstration
    if (!qbClientId || !qbAccessToken || !qbRealmId) {
      console.warn('QuickBooks credentials not configured - using mock mode');
      
      // Store mock sync data
      const mockQuickBooksId = `QB-${invoice.id}-${Date.now()}`;
      await kv.set(`qb-invoice-${invoice.id}`, {
        quickbooksId: mockQuickBooksId,
        syncedAt: new Date().toISOString(),
        invoiceId: invoice.id,
        mockMode: true
      });

      return c.json({ 
        success: true, 
        quickbooksInvoiceId: mockQuickBooksId,
        message: `Invoice ${invoice.id} synced in DEMO mode (QuickBooks credentials not configured)`,
        mockMode: true
      });
    }

    // Validate credentials format - if invalid, fall back to demo mode
    if (qbRealmId.length < 5 || qbAccessToken.length < 50) {
      console.warn('QuickBooks credentials appear invalid - using mock mode');
      console.warn(`Realm ID length: ${qbRealmId.length}, Token length: ${qbAccessToken.length}`);
      
      // Store mock sync data
      const mockQuickBooksId = `QB-${invoice.id}-${Date.now()}`;
      await kv.set(`qb-invoice-${invoice.id}`, {
        quickbooksId: mockQuickBooksId,
        syncedAt: new Date().toISOString(),
        invoiceId: invoice.id,
        mockMode: true,
        reason: 'Invalid credentials format'
      });

      return c.json({ 
        success: true, 
        quickbooksInvoiceId: mockQuickBooksId,
        message: `Invoice ${invoice.id} synced in DEMO mode (invalid credentials - using demo mode)`,
        mockMode: true,
        warning: 'QuickBooks credentials appear invalid. Using demo mode for testing.'
      });
    }

    // QuickBooks API endpoint (using sandbox for testing)
    const quickbooksApiUrl = `https://sandbox-quickbooks.api.intuit.com/v3/company/${qbRealmId}/invoice?minorversion=65`;
    
    console.log('QuickBooks API URL:', quickbooksApiUrl);
    
    // Transform invoice data to QuickBooks format
    const qbInvoiceData = {
      Line: [
        {
          Amount: invoice.amount,
          DetailType: "SalesItemLineDetail",
          Description: invoice.service || "Power Washing Service",
          SalesItemLineDetail: {
            Qty: 1,
            UnitPrice: invoice.amount,
            ItemRef: {
              name: "Services",
              value: "1"
            }
          }
        }
      ],
      CustomerRef: {
        name: invoice.customerName,
        value: "1"
      },
      TxnDate: new Date().toISOString().split('T')[0],
      DueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
      DocNumber: invoice.id
    };

    console.log('Sending invoice to QuickBooks:', JSON.stringify(qbInvoiceData, null, 2));

    // Make API request to QuickBooks
    const response = await fetch(quickbooksApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${qbAccessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(qbInvoiceData)
    });

    const responseText = await response.text();
    console.log('QuickBooks API Response Status:', response.status);
    console.log('QuickBooks API Response Body:', responseText);

    if (!response.ok) {
      let errorMessage = `QuickBooks API returned ${response.status}`;
      
      try {
        const errorData = JSON.parse(responseText);
        if (errorData.Fault) {
          errorMessage = errorData.Fault.Error?.[0]?.Message || errorMessage;
          console.error('QuickBooks API Fault:', errorData.Fault);
        }
      } catch (e) {
        console.error('Could not parse error response:', responseText);
      }

      // Common error messages and solutions
      if (response.status === 401) {
        errorMessage = "QuickBooks authentication failed. Your access token may be expired. Please refresh your token.";
      } else if (response.status === 403) {
        errorMessage = "QuickBooks authorization failed. Please check your credentials and permissions.";
      } else if (response.status === 400) {
        errorMessage = `QuickBooks API error: ${errorMessage}. Check that your QuickBooks company has the required setup (customer, items, etc.)`;
      } else if (response.status === 502 || response.status === 503) {
        errorMessage = "QuickBooks API is temporarily unavailable. This might also indicate incorrect credentials or API endpoint.";
      }

      console.error(`QuickBooks API error (${response.status}):`, errorMessage);
      
      return c.json({ 
        error: errorMessage,
        details: responseText,
        status: response.status,
        troubleshooting: "Check: 1) Access token is valid, 2) Realm ID is correct, 3) QuickBooks company is properly set up"
      }, response.status);
    }

    const qbInvoice = JSON.parse(responseText);
    
    // Store the QuickBooks invoice ID in KV store for reference
    await kv.set(`qb-invoice-${invoice.id}`, {
      quickbooksId: qbInvoice.Invoice?.Id,
      syncedAt: new Date().toISOString(),
      invoiceId: invoice.id,
      mockMode: false
    });

    console.log('Successfully synced invoice to QuickBooks:', qbInvoice.Invoice?.Id);

    return c.json({ 
      success: true, 
      quickbooksInvoiceId: qbInvoice.Invoice?.Id,
      message: `Invoice ${invoice.id} successfully synced to QuickBooks`,
      mockMode: false
    });

  } catch (error) {
    console.error('Error syncing invoice to QuickBooks:', error);
    console.error('Error stack:', error.stack);
    
    return c.json({ 
      error: `Failed to sync invoice to QuickBooks: ${error.message}`,
      details: error.toString(),
      troubleshooting: "Check server logs for detailed error information"
    }, 500);
  }
});

// Get QuickBooks sync status for an invoice
app.get("/make-server-4e82aa29/quickbooks/invoice/:invoiceId", async (c) => {
  try {
    const invoiceId = c.req.param('invoiceId');
    const syncData = await kv.get(`qb-invoice-${invoiceId}`);

    if (!syncData) {
      return c.json({ synced: false, message: 'Invoice not synced to QuickBooks' });
    }

    return c.json({ 
      synced: true, 
      quickbooksId: syncData.quickbooksId,
      syncedAt: syncData.syncedAt
    });

  } catch (error) {
    console.error('Error checking QuickBooks sync status:', error);
    return c.json({ error: error.message }, 500);
  }
});

Deno.serve(app.fetch);