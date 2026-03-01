import { Token, Settings } from "./store";
import { format } from "date-fns";

// Web Bluetooth ESC/POS utility

export class EscPosPrinter {
  device: BluetoothDevice | null = null;
  server: BluetoothRemoteGATTServer | null = null;
  characteristic: BluetoothRemoteGATTCharacteristic | null = null;

  async connect() {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth is not supported in this browser.");
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] },
          { services: ['e7810a71-73ae-499d-8c15-faa9aef0c3f2'] }, // standard generic printer services
        ],
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
      });

      if (!this.device.gatt) throw new Error("No GATT server");
      
      this.server = await this.device.gatt.connect();
      
      // Need to find the correct service and characteristic. We will try common ones.
      const services = await this.server.getPrimaryServices();
      for (const service of services) {
        const characteristics = await service.getCharacteristics();
        for (const char of characteristics) {
          if (char.properties.write || char.properties.writeWithoutResponse) {
            this.characteristic = char;
            break;
          }
        }
        if (this.characteristic) break;
      }

      if (!this.characteristic) {
        throw new Error("Could not find a writable characteristic.");
      }

      return true;
    } catch (error) {
      console.error("Bluetooth connection failed", error);
      throw error;
    }
  }

  async printReceipt(token: Token, settings: Settings) {
    if (!this.characteristic) {
      throw new Error("Printer not connected");
    }

    const encoder = new TextEncoder();
    const commands: number[] = [];

    // Initialize printer
    commands.push(0x1B, 0x40);

    // Center alignment
    commands.push(0x1B, 0x61, 0x01);

    // Business Name (Double height/width)
    commands.push(0x1D, 0x21, 0x11);
    const businessNameStr = settings.businessName + "\n";
    for (let i = 0; i < businessNameStr.length; i++) {
      commands.push(businessNameStr.charCodeAt(i));
    }

    // Normal text
    commands.push(0x1D, 0x21, 0x00);

    // Token Number
    const tokenStr = `Token: ${token.tokenNumber}\n`;
    for (let i = 0; i < tokenStr.length; i++) {
      commands.push(tokenStr.charCodeAt(i));
    }

    const dateStr = `${format(new Date(token.timestamp), "PP pp")}\n`;
    for (let i = 0; i < dateStr.length; i++) {
      commands.push(dateStr.charCodeAt(i));
    }

    // Left alignment
    commands.push(0x1B, 0x61, 0x00);
    
    // Separator
    const separator = "--------------------------------\n";
    for (let i = 0; i < separator.length; i++) {
      commands.push(separator.charCodeAt(i));
    }

    // Items
    token.items.forEach(item => {
      const line = `${item.quantity}x ${item.menuItem.name.padEnd(16)} ${settings.currency}${item.menuItem.price * item.quantity}\n`;
      for (let i = 0; i < line.length; i++) {
        commands.push(line.charCodeAt(i));
      }
    });

    for (let i = 0; i < separator.length; i++) {
      commands.push(separator.charCodeAt(i));
    }

    // Totals (Right alignment)
    commands.push(0x1B, 0x61, 0x02);
    
    if (settings.enableTax || settings.enableDiscount) {
      const sub = `Subtotal: ${settings.currency}${token.subtotal}\n`;
      for (let i = 0; i < sub.length; i++) { commands.push(sub.charCodeAt(i)); }
    }

    const totalStr = `TOTAL: ${settings.currency}${token.total}\n`;
    // Bold total
    commands.push(0x1B, 0x45, 0x01);
    for (let i = 0; i < totalStr.length; i++) { commands.push(totalStr.charCodeAt(i)); }
    commands.push(0x1B, 0x45, 0x00);

    const paymentStr = `Paid via: ${token.paymentMethod}\n\n`;
    for (let i = 0; i < paymentStr.length; i++) { commands.push(paymentStr.charCodeAt(i)); }

    // Center alignment for footer
    commands.push(0x1B, 0x61, 0x01);
    const footer = settings.footerMessage + "\n\n\n\n";
    for (let i = 0; i < footer.length; i++) { commands.push(footer.charCodeAt(i)); }

    // Cut paper
    commands.push(0x1D, 0x56, 0x41, 0x00);

    // Send to printer in chunks (BLE limit is often 20-512 bytes)
    const MAX_CHUNK = 100;
    const data = new Uint8Array(commands);
    
    for (let i = 0; i < data.length; i += MAX_CHUNK) {
      const chunk = data.slice(i, i + MAX_CHUNK);
      try {
        if (this.characteristic.properties.writeWithoutResponse) {
           await this.characteristic.writeValueWithoutResponse(chunk);
        } else {
           await this.characteristic.writeValue(chunk);
        }
      } catch (err) {
        console.error("Error writing chunk", err);
        throw err;
      }
    }

    return true;
  }

  disconnect() {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
  }
}

// Singleton instance
export const printerService = new EscPosPrinter();
