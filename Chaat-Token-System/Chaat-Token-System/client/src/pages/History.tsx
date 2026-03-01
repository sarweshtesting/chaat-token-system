import { useState, useMemo } from "react";
import { useStore, Token } from "@/lib/store";
import { format } from "date-fns";
import { printerService } from "@/lib/printer";
import { SystemPrintReceipt } from "@/components/receipt/SystemPrint";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Printer, AlertCircle, CheckCircle2, Clock, Calendar as CalendarIcon, FileText, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

export default function History() {
  const { tokens, updateTokenStatus, settings, clearDayTokens } = useStore();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Pending" | "Paid" | "Cancelled">("All");
  const [selectedDate, setSelectedDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const [printToken, setPrintToken] = useState<Token | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);

  const selectedTokens = useMemo(() => {
    return tokens.filter(t => format(new Date(t.timestamp), "yyyy-MM-dd") === selectedDate);
  }, [tokens, selectedDate]);

  const filteredTokens = useMemo(() => {
    return selectedTokens.filter(t => {
      const matchesSearch = t.tokenNumber.toLowerCase().includes(search.toLowerCase()) || 
                            t.customerPhone?.includes(search);
      const matchesFilter = filter === "All" || t.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [selectedTokens, search, filter]);

  const stats = useMemo(() => {
    const paid = selectedTokens.filter(t => t.status === "Paid");
    const totalSales = paid.reduce((sum, t) => sum + t.total, 0);
    const cashSales = paid.filter(t => t.paymentMethod === "Cash").reduce((sum, t) => sum + t.total, 0);
    const upiSales = paid.filter(t => t.paymentMethod === "UPI").reduce((sum, t) => sum + t.total, 0);
    const cardSales = paid.filter(t => t.paymentMethod === "Card").reduce((sum, t) => sum + t.total, 0);
    
    return {
      count: selectedTokens.length,
      paidCount: paid.length,
      sales: totalSales,
      cashSales,
      upiSales,
      cardSales
    };
  }, [selectedTokens]);

  const handleStatusChange = (id: string, newStatus: Token["status"]) => {
    updateTokenStatus(id, newStatus);
    toast({ title: `Token marked as ${newStatus}` });
  };

  const openPrintDialog = (token: Token) => {
    setPrintToken(token);
    setIsPrintDialogOpen(true);
  };

  const handleBluetoothPrint = async () => {
    if (!printToken) return;
    try {
      if (!printerService.device?.gatt?.connected) {
        await printerService.connect();
      }
      await printerService.printReceipt(printToken, settings);
      toast({ title: "Printed successfully" });
    } catch (err) {
      toast({ title: "Print failed", description: "Could not connect to printer.", variant: "destructive" });
    }
  };

  const handleSystemPrint = () => {
    window.print();
  };

  const printDailyReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Daily Report - ${selectedDate}</title>
          <style>
            body { font-family: monospace; padding: 20px; max-width: 400px; margin: 0 auto; color: black; }
            h1 { text-align: center; }
            .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed black; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>${settings.businessName}</h1>
          <p style="text-align: center">Daily Report: ${selectedDate}</p>
          <div class="divider"></div>
          <div class="row"><span>Total Tokens</span><span>${stats.count}</span></div>
          <div class="row"><span>Paid Orders</span><span>${stats.paidCount}</span></div>
          <div class="divider"></div>
          <div class="row bold"><span>Total Sales</span><span>${settings.currency}${stats.sales.toFixed(2)}</span></div>
          <div class="divider"></div>
          <p class="bold">Breakdown by Payment</p>
          <div class="row"><span>Cash</span><span>${settings.currency}${stats.cashSales.toFixed(2)}</span></div>
          <div class="row"><span>UPI</span><span>${settings.currency}${stats.upiSales.toFixed(2)}</span></div>
          <div class="row"><span>Card</span><span>${settings.currency}${stats.cardSales.toFixed(2)}</span></div>
          <div class="divider"></div>
          <p style="text-align: center; margin-top: 30px;">End of Report</p>
          <script>
            window.onload = () => { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleEndOfDay = () => {
    if (confirm(`Are you sure you want to clear all tokens for ${selectedDate}? This cannot be undone.`)) {
      clearDayTokens(new Date(selectedDate));
      toast({ title: "Day tokens cleared." });
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto pb-24 md:pb-8 h-full flex flex-col">
      <header className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h1 className="text-3xl font-display font-bold tracking-tight">Daily Summary</h1>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-9 h-11 bg-card rounded-xl font-medium w-[160px]"
              />
            </div>
            <Button variant="outline" className="h-11 rounded-xl" onClick={printDailyReport}>
              <FileText className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Report</span>
            </Button>
            <Button variant="destructive" className="h-11 rounded-xl" onClick={handleEndOfDay}>
              <Trash2 className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">End Day</span>
            </Button>
          </div>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card p-4 rounded-2xl border shadow-sm col-span-2 md:col-span-1">
            <p className="text-sm text-muted-foreground font-medium mb-1">Total Sales</p>
            <p className="text-3xl font-bold text-primary">{settings.currency}{stats.sales.toFixed(2)}</p>
            <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
              <span>{stats.count} Tokens</span> • <span>{stats.paidCount} Paid</span>
            </div>
          </div>
          <div className="bg-card p-4 rounded-2xl border shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">Cash</p>
            <p className="text-xl font-bold">{settings.currency}{stats.cashSales.toFixed(2)}</p>
          </div>
          <div className="bg-card p-4 rounded-2xl border shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">UPI</p>
            <p className="text-xl font-bold text-blue-600">{settings.currency}{stats.upiSales.toFixed(2)}</p>
          </div>
          <div className="bg-card p-4 rounded-2xl border shadow-sm">
            <p className="text-sm text-muted-foreground font-medium mb-1">Card</p>
            <p className="text-xl font-bold text-purple-600">{settings.currency}{stats.cardSales.toFixed(2)}</p>
          </div>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by token or phone..." 
            className="pl-9 h-11 bg-card rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 hide-scrollbar">
          {["All", "Pending", "Paid", "Cancelled"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 h-11 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                filter === f ? "bg-primary text-primary-foreground" : "bg-card border hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        {filteredTokens.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl bg-muted/20">
            No tokens found for {selectedDate}.
          </div>
        ) : (
          filteredTokens.map(token => (
            <div key={token.id} className="bg-card border rounded-2xl p-4 flex flex-col sm:flex-row gap-4 justify-between shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono font-bold text-lg">{token.tokenNumber}</span>
                  {token.status === "Paid" && <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1"/> Paid</Badge>}
                  {token.status === "Pending" && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Clock className="w-3 h-3 mr-1"/> Pending</Badge>}
                  {token.status === "Cancelled" && <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1"/> Cancelled</Badge>}
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{token.paymentMethod}</span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {format(new Date(token.timestamp), "p")} • {token.items.reduce((s, i) => s + i.quantity, 0)} items
                </div>
                <div className="text-sm line-clamp-1">
                  {token.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(", ")}
                </div>
                {token.notes && <div className="text-xs mt-1 text-orange-600 font-medium">Note: {token.notes}</div>}
              </div>
              
              <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                <div className="text-xl font-bold">{settings.currency}{token.total.toFixed(2)}</div>
                <div className="flex gap-2">
                  {token.status === "Pending" && (
                    <Button size="sm" variant="outline" className="h-8 border-green-200 text-green-700 bg-green-50 hover:bg-green-100" onClick={() => handleStatusChange(token.id, "Paid")}>
                      Mark Paid
                    </Button>
                  )}
                  {token.status !== "Cancelled" && (
                    <Button size="sm" variant="ghost" className="h-8 text-destructive hover:bg-destructive/10" onClick={() => handleStatusChange(token.id, "Cancelled")}>
                      Cancel
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" className="h-8" onClick={() => openPrintDialog(token)}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reprint Token</DialogTitle>
            <DialogDescription>Token: {printToken?.tokenNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <Button className="w-full h-12 rounded-xl" onClick={handleBluetoothPrint}>
              Print to Thermal (Bluetooth)
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={handleSystemPrint}>
              Print via System
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden printable element for system print */}
      <SystemPrintReceipt token={printToken} settings={settings} />
    </div>
  );
}
