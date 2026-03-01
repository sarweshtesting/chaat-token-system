import { Printer, Bluetooth, Info, Smartphone, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { printerService } from "@/lib/printer";
import { useState } from "react";

export default function Help() {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(printerService.device?.gatt?.connected || false);

  const testConnection = async () => {
    setIsConnecting(true);
    try {
      await printerService.connect();
      setIsConnected(true);
      toast({ title: "Printer connected successfully", description: "You can now print tokens directly." });
    } catch (err: any) {
      toast({ 
        title: "Connection failed", 
        description: err.message || "Ensure bluetooth is on and printer is in pairing mode.",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24 md:pb-8 h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight mb-2">Help & Setup</h1>
        <p className="text-muted-foreground">Learn how to connect your Bluetooth thermal printer.</p>
      </header>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2">
        
        {/* Connection Status Card */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isConnected ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
              {isConnected ? <CheckCircle2 className="w-6 h-6" /> : <Printer className="w-6 h-6" />}
            </div>
            <div>
              <h2 className="text-lg font-bold">Printer Status</h2>
              <p className="text-sm text-muted-foreground">
                {isConnected ? "Connected and ready to print" : "Not connected"}
              </p>
            </div>
          </div>
          <Button 
            onClick={testConnection} 
            disabled={isConnecting}
            className="w-full sm:w-auto h-11 rounded-xl flex gap-2"
          >
            <Bluetooth className="w-4 h-4" />
            {isConnecting ? "Connecting..." : isConnected ? "Reconnect" : "Pair Printer"}
          </Button>
        </div>

        {/* Instructions */}
        <section className="space-y-4">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            <Info className="text-primary w-5 h-5" /> How to Connect
          </h3>
          <div className="bg-muted/30 p-5 rounded-2xl border space-y-4 text-sm leading-relaxed">
            <p>
              This app uses <strong>Web Bluetooth</strong> to print directly to common 58mm/80mm ESC/POS thermal printers from your browser.
            </p>
            <ol className="list-decimal list-inside space-y-2 ml-1 text-muted-foreground font-medium">
              <li>Turn on your Bluetooth thermal printer.</li>
              <li>Ensure your device's Bluetooth is turned on.</li>
              <li>Click "Pair Printer" above or during checkout.</li>
              <li>A browser popup will appear. Select your printer (often named "MTP-II", "PT-210", or similar) and click Pair.</li>
            </ol>
          </div>
        </section>

        {/* Compatibility Warning */}
        <section className="space-y-4">
          <h3 className="text-xl font-display font-bold flex items-center gap-2">
            <Smartphone className="text-primary w-5 h-5" /> Device Compatibility
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bg-card border border-green-200 p-5 rounded-2xl">
              <h4 className="font-bold text-green-700 flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4" /> Supported
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Android (Chrome, Edge, Opera)</li>
                <li>• Windows (Chrome, Edge)</li>
                <li>• macOS (Chrome, Edge)</li>
                <li>• ChromeOS</li>
              </ul>
            </div>
            <div className="bg-card border border-red-200 p-5 rounded-2xl">
              <h4 className="font-bold text-red-600 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Not Supported / Limited
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>iOS (iPhone/iPad)</strong>: Safari does not support Web Bluetooth. You must use the "Print via System" option.</li>
                <li>• Firefox on some platforms requires enabling flags.</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
