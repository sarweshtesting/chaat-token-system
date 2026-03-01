import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { format } from "date-fns";
import { get, set } from "idb-keyval";

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  available: boolean;
};

export type OrderItem = {
  menuItem: MenuItem;
  quantity: number;
};

export type PaymentMethod = "Cash" | "UPI" | "Card";

export type Token = {
  id: string;
  tokenNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: "Pending" | "Paid" | "Cancelled";
  paymentMethod: PaymentMethod;
  timestamp: string;
  notes?: string;
  customerPhone?: string;
};

export type Settings = {
  businessName: string;
  logoText: string;
  logoImage?: string;
  footerMessage: string;
  currency: string;
  enableTax: boolean;
  taxRate: number;
  enableDiscount: boolean;
  tokenPrefix: string;
};

const defaultSettings: Settings = {
  businessName: "Chaat on Wheels",
  logoText: "COW",
  logoImage: "",
  footerMessage: "Thank you for visiting! Come again.",
  currency: "₹",
  enableTax: false,
  taxRate: 5,
  enableDiscount: false,
  tokenPrefix: "COW",
};

const defaultMenu: MenuItem[] = [
  { id: "1", name: "Pani Puri", price: 30, available: true },
  { id: "2", name: "Bhel Puri", price: 40, available: true },
  { id: "3", name: "Sev Puri", price: 40, available: true },
  { id: "4", name: "Dahi Puri", price: 50, available: true },
  { id: "5", name: "Masala Puri", price: 40, available: true },
];

type StoreContextType = {
  settings: Settings;
  updateSettings: (newSettings: Settings) => void;
  menuItems: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  updateMenuItem: (id: string, item: Partial<MenuItem>) => void;
  deleteMenuItem: (id: string) => void;
  tokens: Token[];
  addToken: (tokenData: Omit<Token, "id" | "tokenNumber" | "timestamp">) => Token;
  updateTokenStatus: (id: string, status: Token["status"]) => void;
  updateTokenPayment: (id: string, method: PaymentMethod) => void;
  getNextTokenNumber: () => string;
  clearDayTokens: (date: Date) => void;
  menuPdf: string | null;
  setMenuPdf: (pdfData: string | null) => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem("cow_settings");
      return saved ? JSON.parse(saved) : defaultSettings;
    } catch { return defaultSettings; }
  });
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    try {
      const saved = localStorage.getItem("cow_menu");
      return saved ? JSON.parse(saved) : defaultMenu;
    } catch { return defaultMenu; }
  });
  
  const [tokens, setTokens] = useState<Token[]>(() => {
    try {
      const saved = localStorage.getItem("cow_tokens");
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [menuPdf, setMenuPdfState] = useState<string | null>(null);

  useEffect(() => {
    get("cow_menu_pdf").then(val => {
      if (val) setMenuPdfState(val);
    });
  }, []);

  const setMenuPdf = async (pdfData: string | null) => {
    setMenuPdfState(pdfData);
    if (pdfData) {
      await set("cow_menu_pdf", pdfData);
    } else {
      await set("cow_menu_pdf", null);
    }
  };

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem("cow_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem("cow_menu", JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem("cow_tokens", JSON.stringify(tokens));
  }, [tokens]);

  const updateSettings = (newSettings: Settings) => setSettings(newSettings);

  const addMenuItem = (item: Omit<MenuItem, "id">) => {
    const newItem = { ...item, id: crypto.randomUUID() };
    setMenuItems((prev) => [...prev, newItem]);
  };

  const updateMenuItem = (id: string, item: Partial<MenuItem>) => {
    setMenuItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...item } : m)));
  };

  const deleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((m) => m.id !== id));
  };

  const getNextTokenNumber = () => {
    const today = new Date();
    const dateStr = format(today, "yyyyMMdd");
    
    const todayTokens = tokens.filter(t => {
      const tokenDate = new Date(t.timestamp);
      return format(tokenDate, "yyyyMMdd") === dateStr;
    });

    const nextNumber = todayTokens.length + 1;
    return `${settings.tokenPrefix}-${dateStr}-${nextNumber.toString().padStart(3, "0")}`;
  };

  const addToken = (tokenData: Omit<Token, "id" | "tokenNumber" | "timestamp">) => {
    const newToken: Token = {
      ...tokenData,
      id: crypto.randomUUID(),
      tokenNumber: getNextTokenNumber(),
      timestamp: new Date().toISOString(),
    };
    setTokens((prev) => [newToken, ...prev]);
    return newToken;
  };

  const updateTokenStatus = (id: string, status: Token["status"]) => {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
  };

  const updateTokenPayment = (id: string, paymentMethod: PaymentMethod) => {
    setTokens((prev) => prev.map((t) => (t.id === id ? { ...t, paymentMethod } : t)));
  };

  const clearDayTokens = (date: Date) => {
    const dateStr = format(date, "yyyyMMdd");
    setTokens((prev) => prev.filter((t) => format(new Date(t.timestamp), "yyyyMMdd") !== dateStr));
  };

  return (
    <StoreContext.Provider
      value={{
        settings,
        updateSettings,
        menuItems,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        tokens,
        addToken,
        updateTokenStatus,
        updateTokenPayment,
        getNextTokenNumber,
        clearDayTokens,
        menuPdf,
        setMenuPdf,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
