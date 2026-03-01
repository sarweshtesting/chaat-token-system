import { useState, useRef } from "react";
import { useStore, MenuItem, OrderItem, PaymentMethod, Token } from "@/lib/store";
import { printerService } from "@/lib/printer";
import { SystemPrintReceipt } from "@/components/receipt/SystemPrint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Trash2, Printer, Smartphone, ShoppingCart, Info, Bluetooth } from "lucide-react";

export default function Home() {
  const { settings, menuItems, addToken, getNextTokenNumber } = useStore();
  const { toast } = useToast();
  
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash");
  const [notes, setNotes] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  
  const [generatedToken, setGeneratedToken] = useState<Token | null>(null);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const availableItems = menuItems.filter(m => m.available);

  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItem.id === item.id);
      if (existing) {
        return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.menuItem.id === id) {
        const newQty = i.quantity + delta;
        return newQty > 0 ? { ...i, quantity: newQty } : i;
      }
      return i;
    }).filter(i => i.quantity > 0));
  };

  const clearCart = () => {
    if (confirm("Clear the entire order?")) setCart([]);
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);
  const tax = settings.enableTax ? subtotal * (settings.taxRate / 100) : 0;
  const total = subtotal + tax; // ignoring discount for simplicity in checkout for now

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast({ title: "Cart is empty", variant: "destructive" });
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleGenerateToken = async () => {
    const token = addToken({
      items: cart,
      subtotal,
      tax,
      discount: 0,
      total,
      status: paymentMethod === "Cash" || paymentMethod === "UPI" || paymentMethod === "Card" ? "Paid" : "Pending",
      paymentMethod,
      notes,
      customerPhone,
    });
    
    setGeneratedToken(token);
    setCart([]);
    setNotes("");
    setCustomerPhone("");
    setPaymentMethod("Cash");
    setIsCheckoutOpen(false);
    setIsSuccessOpen(true);

    // Attempt auto-print if Bluetooth is connected
    if (printerService.device?.gatt?.connected) {
      handleBluetoothPrint(token);
    }
  };

  const handleBluetoothPrint = async (tokenToPrint: Token) => {
    setIsPrinting(true);
    try {
      if (!printerService.device?.gatt?.connected) {
        await printerService.connect();
      }
      await printerService.printReceipt(tokenToPrint, settings);
      toast({ title: "Printed successfully" });
    } catch (err) {
      toast({ title: "Print failed", description: "Printer not found or disconnected. Use System Print.", variant: "destructive" });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSystemPrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full md:flex-row relative">
      {/* Menu Grid */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto pb-48 md:pb-6">
        <header className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">New Order</h1>
            <p className="text-muted-foreground text-sm">Next Token: <span className="font-mono text-primary font-bold">{getNextTokenNumber()}</span></p>
          </div>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {availableItems.map(item => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="relative flex flex-col items-center justify-center p-6 bg-card border rounded-2xl shadow-sm hover:shadow-md hover:border-primary/50 transition-all active:scale-95 group overflow-hidden"
              data-testid={`menu-item-${item.id}`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="font-bold text-lg mb-2 text-center relative z-10 leading-tight">{item.name}</span>
              <span className="text-primary font-medium relative z-10 bg-primary/10 px-3 py-1 rounded-full text-sm">
                {settings.currency}{item.price}
              </span>
            </button>
          ))}
          {availableItems.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 rounded-2xl border border-dashed">
              No items available. Add items in Settings.
            </div>
          )}
        </div>
      </div>

      {/* Cart Sidebar (Desktop) / Bottom Sheet (Mobile) */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:relative md:w-96 bg-card border-t md:border-t-0 md:border-l flex flex-col h-[50vh] md:h-full shadow-2xl md:shadow-none z-40 transition-transform duration-300">
        <div className="p-4 border-b flex justify-between items-center bg-card z-10">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            Current Order
          </h2>
          {cart.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive h-8 px-2 hover:bg-destructive/10">
              Clear
            </Button>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/10">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
              <ShoppingCart className="h-12 w-12 mb-4 stroke-1" />
              <p>Order is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.menuItem.id} className="flex items-center justify-between bg-card p-3 rounded-xl border shadow-sm">
                <div className="flex-1">
                  <div className="font-semibold text-sm line-clamp-1">{item.menuItem.name}</div>
                  <div className="text-muted-foreground text-xs">{settings.currency}{item.menuItem.price}</div>
                </div>
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-1">
                  <button 
                    onClick={() => updateQuantity(item.menuItem.id, -1)}
                    className="p-1 hover:bg-background rounded-md text-foreground transition-colors"
                  >
                    {item.quantity === 1 ? <Trash2 className="h-4 w-4 text-destructive" /> : <Minus className="h-4 w-4" />}
                  </button>
                  <span className="w-4 text-center font-bold text-sm">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.menuItem.id, 1)}
                    className="p-1 hover:bg-background rounded-md text-foreground transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="w-16 text-right font-bold text-sm ml-2">
                  {settings.currency}{item.menuItem.price * item.quantity}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-card border-t shadow-[0_-4px_15px_rgba(0,0,0,0.03)] z-10">
          <div className="space-y-2 mb-4 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{settings.currency}{subtotal.toFixed(2)}</span>
            </div>
            {settings.enableTax && (
              <div className="flex justify-between text-muted-foreground">
                <span>Tax ({settings.taxRate}%)</span>
                <span>{settings.currency}{tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-xl pt-2 border-t mt-2">
              <span>Total</span>
              <span className="text-primary">{settings.currency}{total.toFixed(2)}</span>
            </div>
          </div>
          <Button 
            className="w-full h-14 text-lg font-bold rounded-xl" 
            size="lg"
            onClick={handleCheckout}
            disabled={cart.length === 0}
            data-testid="button-checkout"
          >
            Checkout — {settings.currency}{total.toFixed(2)}
          </Button>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display">Complete Order</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-3">
              <label className="text-sm font-medium">Payment Method</label>
              <div className="grid grid-cols-3 gap-3">
                {["Cash", "UPI", "Card"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method as PaymentMethod)}
                    className={`py-3 rounded-xl border-2 font-semibold transition-all ${
                      paymentMethod === method 
                        ? "border-primary bg-primary/10 text-primary" 
                        : "border-border hover:border-primary/30"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-sm font-medium">Optional Details</label>
              <Input 
                placeholder="Customer Phone" 
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="h-12 bg-muted/30"
              />
              <Input 
                placeholder="Notes (e.g. no onions)" 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="h-12 bg-muted/30"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              className="w-full h-14 text-lg font-bold rounded-xl" 
              onClick={handleGenerateToken}
              data-testid="button-generate-token"
            >
              Generate Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success / Print Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl text-center flex flex-col items-center">
          <DialogHeader className="w-full items-center">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Printer className="h-8 w-8" />
            </div>
            <DialogTitle className="text-2xl">Token Generated!</DialogTitle>
            <DialogDescription>
              Token <strong className="text-foreground font-mono bg-muted px-2 py-1 rounded">{generatedToken?.tokenNumber}</strong> saved successfully.
            </DialogDescription>
          </DialogHeader>
          
          <div className="w-full space-y-3 mt-6">
            <Button 
              variant="default" 
              size="lg" 
              className="w-full h-14 rounded-xl text-lg font-semibold flex gap-2"
              onClick={() => generatedToken && handleBluetoothPrint(generatedToken)}
              disabled={isPrinting}
            >
              <Bluetooth className="h-5 w-5" />
              {isPrinting ? "Printing..." : "Print to Thermal (Bluetooth)"}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full h-14 rounded-xl font-semibold flex gap-2"
              onClick={handleSystemPrint}
            >
              <Smartphone className="h-5 w-5" />
              Print via System (A4/PDF)
            </Button>
            <Button 
              variant="ghost" 
              className="w-full mt-2"
              onClick={() => setIsSuccessOpen(false)}
            >
              Done, Next Order
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden printable element */}
      <SystemPrintReceipt token={generatedToken} settings={settings} ref={printRef} />
    </div>
  );
}
