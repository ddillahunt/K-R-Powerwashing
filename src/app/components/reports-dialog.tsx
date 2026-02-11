import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { FileText, DollarSign, Users, Download } from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

interface Invoice {
  id: string;
  customerName: string;
  service: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  dueDate: Date;
  paidDate?: Date;
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
}

interface Quote {
  id: string;
  customerName: string;
  services: string[];
  amount: number;
  status: string;
  createdDate: Date;
}

interface CustomerReportData {
  name: string;
  email: string;
  phone: string;
  address: string;
  totalQuotes: number;
  totalSpent: number;
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  lastServiceDate: string;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  invoiceCount: number;
}

interface CustomerRevenue {
  customerName: string;
  revenue: number;
  invoiceCount: number;
}

export function ReportsDialog() {
  const [open, setOpen] = useState(false);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    if (open) {
      loadInvoices();
      loadCustomers();
      loadQuotes();
    }
  }, [open]);

  const loadInvoices = () => {
    const savedInvoices = localStorage.getItem('kr-invoices');
    if (savedInvoices) {
      const parsedInvoices = JSON.parse(savedInvoices);
      const invoicesWithDates = parsedInvoices.map((inv: any) => ({
        ...inv,
        dueDate: new Date(inv.dueDate),
        paidDate: inv.paidDate ? new Date(inv.paidDate) : undefined
      }));
      setInvoices(invoicesWithDates);
    }
  };

  const loadCustomers = () => {
    const savedCustomers = localStorage.getItem('kr-customers');
    if (savedCustomers) {
      setCustomers(JSON.parse(savedCustomers));
    }
  };

  const loadQuotes = () => {
    const savedQuotes = localStorage.getItem('kr-quotes');
    if (savedQuotes) {
      const parsedQuotes = JSON.parse(savedQuotes);
      const quotesWithDates = parsedQuotes.map((quote: any) => ({
        ...quote,
        createdDate: quote.createdDate ? new Date(quote.createdDate) : new Date()
      }));
      setQuotes(quotesWithDates);
    }
  };

  // Calculate revenue by month (for paid invoices)
  const getMonthlyRevenue = (): MonthlyRevenue[] => {
    const monthlyData: { [key: string]: { revenue: number; count: number } } = {};

    invoices
      .filter(inv => inv.status === 'paid' && inv.paidDate)
      .forEach(inv => {
        const monthKey = format(inv.paidDate!, 'MMM yyyy');
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, count: 0 };
        }
        monthlyData[monthKey].revenue += inv.amount;
        monthlyData[monthKey].count += 1;
      });

    return Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        invoiceCount: data.count
      }))
      .sort((a, b) => {
        const dateA = new Date(a.month);
        const dateB = new Date(b.month);
        return dateB.getTime() - dateA.getTime();
      });
  };

  // Calculate revenue by customer (for paid invoices)
  const getCustomerRevenue = (): CustomerRevenue[] => {
    const customerData: { [key: string]: { revenue: number; count: number } } = {};

    invoices
      .filter(inv => inv.status === 'paid')
      .forEach(inv => {
        if (!customerData[inv.customerName]) {
          customerData[inv.customerName] = { revenue: 0, count: 0 };
        }
        customerData[inv.customerName].revenue += inv.amount;
        customerData[inv.customerName].count += 1;
      });

    return Object.entries(customerData)
      .map(([customerName, data]) => ({
        customerName,
        revenue: data.revenue,
        invoiceCount: data.count
      }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Get comprehensive customer report
  const getCustomerReport = (): CustomerReportData[] => {
    return customers.map(customer => {
      const customerQuotes = quotes.filter(q => q.customerName === customer.name);
      const customerInvoices = invoices.filter(inv => inv.customerName === customer.name);
      const paidInvoices = customerInvoices.filter(inv => inv.status === 'paid');
      const totalSpent = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const lastServiceDate = customerInvoices.length > 0 ? customerInvoices.reduce((latest, inv) => inv.paidDate && inv.paidDate > latest ? inv.paidDate : latest, new Date(0)) : null;

      return {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        totalQuotes: customerQuotes.length,
        totalSpent,
        totalInvoices: customerInvoices.length,
        paidInvoices: customerInvoices.filter(inv => inv.status === 'paid').length,
        pendingInvoices: customerInvoices.filter(inv => inv.status === 'pending').length,
        overdueInvoices: customerInvoices.filter(inv => inv.status === 'overdue').length,
        lastServiceDate: lastServiceDate ? format(lastServiceDate, 'MMM dd, yyyy') : 'Never'
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  };

  const monthlyRevenue = getMonthlyRevenue();
  const customerRevenue = getCustomerRevenue();
  const customerReport = getCustomerReport();
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0);

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customer Report');
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-white hover:bg-gray-50"
        >
          <FileText className="size-4 mr-2" />
          Reports
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[98vw] w-[98vw] h-[98vh] max-h-[98vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">Business Reports</DialogTitle>
          <DialogDescription>
            View comprehensive business analytics and performance metrics.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="revenue" className="mt-4 flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="revenue" className="flex items-center gap-2">
              <DollarSign className="size-4" />
              Revenue Reports
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="size-4" />
              Customer Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="revenue" className="space-y-6 mt-4 overflow-y-auto flex-1">
            {/* Total Revenue Summary */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="text-green-900">Total Paid Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-green-900">
                  ${totalRevenue.toLocaleString()}
                </div>
                <p className="text-sm text-green-700 mt-2">
                  From {invoices.filter(inv => inv.status === 'paid').length} paid invoices
                </p>
              </CardContent>
            </Card>

            {/* Revenue by Month */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Month</CardTitle>
              </CardHeader>
              <CardContent>
                {monthlyRevenue.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Revenue</TableHead>
                        <TableHead className="text-right">Invoices</TableHead>
                        <TableHead className="text-right">Avg per Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlyRevenue.map((data) => (
                        <TableRow key={data.month}>
                          <TableCell className="font-medium">{data.month}</TableCell>
                          <TableCell className="text-right font-semibold text-green-700">
                            ${data.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">{data.invoiceCount}</TableCell>
                          <TableCell className="text-right text-gray-600">
                            ${Math.round(data.revenue / data.invoiceCount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-8">No paid invoices to display</p>
                )}
              </CardContent>
            </Card>

            {/* Revenue by Customer */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Customer</CardTitle>
              </CardHeader>
              <CardContent>
                {customerRevenue.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead className="text-right">Total Revenue</TableHead>
                        <TableHead className="text-right">Invoices</TableHead>
                        <TableHead className="text-right">Avg per Invoice</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerRevenue.map((data) => (
                        <TableRow key={data.customerName}>
                          <TableCell className="font-medium">{data.customerName}</TableCell>
                          <TableCell className="text-right font-semibold text-green-700">
                            ${data.revenue.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">{data.invoiceCount}</TableCell>
                          <TableCell className="text-right text-gray-600">
                            ${Math.round(data.revenue / data.invoiceCount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-gray-500 text-center py-8">No paid invoices to display</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-6 mt-4 overflow-y-auto flex-1">
            {/* Customer Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-blue-900">Total Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-blue-900">
                    {customers.length}
                  </div>
                  <p className="text-sm text-blue-700 mt-2">Active customers</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="text-purple-900">Total Quotes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-purple-900">
                    {quotes.length}
                  </div>
                  <p className="text-sm text-purple-700 mt-2">All time quotes</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-900">Avg Customer Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-amber-900">
                    ${customers.length > 0 ? Math.round(totalRevenue / customers.length).toLocaleString() : 0}
                  </div>
                  <p className="text-sm text-amber-700 mt-2">Per customer</p>
                </CardContent>
              </Card>
            </div>

            {/* All Customers Report */}
            <Card>
              <CardHeader>
                <div className="flex flex-row items-center justify-between">
                  <CardTitle>Complete Customer Report</CardTitle>
                  <Button
                    onClick={() => {
                      const excelData = customerReport.map(c => ({
                        ...c,
                        lastServiceDate: c.lastServiceDate ? format(new Date(c.lastServiceDate), 'MMM dd, yyyy') : 'Never',
                        totalSpent: `$${c.totalSpent.toFixed(2)}`,
                      }));
                      exportToExcel(excelData, `K&R_Customer_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
                    }}
                    className="bg-gradient-to-r from-[#2563eb] to-[#0891b2] hover:from-[#1d4ed8] hover:to-[#0e7490]"
                    disabled={customerReport.length === 0}
                  >
                    <Download className="size-4 mr-2" />
                    Export to Excel
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customerReport.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Name</TableHead>
                          <TableHead className="min-w-[200px]">Email</TableHead>
                          <TableHead className="min-w-[130px]">Phone</TableHead>
                          <TableHead className="text-right min-w-[80px]">Quotes</TableHead>
                          <TableHead className="text-right min-w-[120px]">Total Spent</TableHead>
                          <TableHead className="text-right min-w-[90px]">Invoices</TableHead>
                          <TableHead className="text-right min-w-[80px]">Paid</TableHead>
                          <TableHead className="text-right min-w-[90px]">Pending</TableHead>
                          <TableHead className="text-right min-w-[90px]">Overdue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerReport.map((customer) => (
                          <TableRow key={customer.email}>
                            <TableCell className="font-medium whitespace-nowrap">{customer.name}</TableCell>
                            <TableCell className="text-sm text-gray-600">{customer.email}</TableCell>
                            <TableCell className="text-sm text-gray-600 whitespace-nowrap">{customer.phone}</TableCell>
                            <TableCell className="text-right">{customer.totalQuotes}</TableCell>
                            <TableCell className="text-right font-semibold text-green-700 whitespace-nowrap">
                              ${customer.totalSpent.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right">{customer.totalInvoices}</TableCell>
                            <TableCell className="text-right text-green-600">{customer.paidInvoices}</TableCell>
                            <TableCell className="text-right text-yellow-600">{customer.pendingInvoices}</TableCell>
                            <TableCell className="text-right text-red-600">{customer.overdueInvoices}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">No customers to display</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}