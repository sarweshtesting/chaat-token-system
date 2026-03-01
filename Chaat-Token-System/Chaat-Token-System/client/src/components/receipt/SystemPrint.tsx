import { format } from "date-fns";
import { Token, Settings } from "@/lib/store";
import { forwardRef } from "react";

interface SystemPrintProps {
  token: Token | null;
  settings: Settings;
}

export const SystemPrintReceipt = forwardRef<HTMLDivElement, SystemPrintProps>(
  ({ token, settings }, ref) => {
    if (!token) return null;

    return (
      <div 
        ref={ref} 
        id="printable-receipt" 
        className="hidden print:block p-4 font-mono text-sm max-w-[300px] mx-auto bg-white text-black"
        style={{ width: "300px" }}
      >
        <div className="text-center mb-4">
          {settings.logoImage && (
            <img src={settings.logoImage} alt="Logo" className="max-w-[120px] max-h-[120px] mx-auto mb-2 mix-blend-multiply object-contain grayscale" />
          )}
          <h1 className="text-2xl font-bold font-sans uppercase mb-1">{settings.businessName}</h1>
          <p className="text-xs break-words">{settings.logoText}</p>
        </div>

        <div className="border-t border-b border-dashed border-black py-2 mb-4 space-y-1">
          <div className="flex justify-between font-bold text-base">
            <span>TOKEN:</span>
            <span>{token.tokenNumber}</span>
          </div>
          <div className="text-xs text-gray-600">
            {format(new Date(token.timestamp), "PP pp")}
          </div>
        </div>

        <table className="w-full mb-4 text-sm">
          <thead>
            <tr className="border-b border-dashed border-black">
              <th className="text-left font-normal py-1">Item</th>
              <th className="text-center font-normal py-1">Qty</th>
              <th className="text-right font-normal py-1">Amt</th>
            </tr>
          </thead>
          <tbody>
            {token.items.map((item, idx) => (
              <tr key={idx}>
                <td className="py-1 pr-2">{item.menuItem.name}</td>
                <td className="py-1 text-center">{item.quantity}</td>
                <td className="py-1 text-right">
                  {settings.currency}{(item.menuItem.price * item.quantity).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-t border-dashed border-black pt-2 space-y-1">
          {(settings.enableTax || settings.enableDiscount) && (
            <div className="flex justify-between text-xs">
              <span>Subtotal:</span>
              <span>{settings.currency}{token.subtotal.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-lg pt-1">
            <span>TOTAL:</span>
            <span>{settings.currency}{token.total.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-xs pt-1">
            <span>Paid via:</span>
            <span>{token.paymentMethod}</span>
          </div>
        </div>

        <div className="mt-8 text-center text-xs">
          <p>{settings.footerMessage}</p>
        </div>
      </div>
    );
  }
);
SystemPrintReceipt.displayName = "SystemPrintReceipt";
