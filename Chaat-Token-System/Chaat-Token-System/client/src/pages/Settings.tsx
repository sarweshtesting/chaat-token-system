import { useState } from "react";
import { useStore, MenuItem, Settings as SettingsType } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, Check, X, Store, Menu as MenuIcon, ReceiptText, FileText } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import MenuPdfTab from "@/components/settings/MenuPdfTab";

export default function Settings() {
  const { settings, updateSettings, menuItems, addMenuItem, updateMenuItem, deleteMenuItem } = useStore();
  const { toast } = useToast();

  const [localSettings, setLocalSettings] = useState<SettingsType>(settings);
  const [activeTab, setActiveTab] = useState<"general" | "menu" | "pdf">("general");

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    toast({ title: "Settings saved successfully" });
  };

  const openAddItem = () => {
    setEditingItem(null);
    setNewItemName("");
    setNewItemPrice("");
    setIsItemDialogOpen(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setNewItemName(item.name);
    setNewItemPrice(item.price.toString());
    setIsItemDialogOpen(true);
  };

  const handleSaveItem = () => {
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    if (isNaN(price)) return;

    if (editingItem) {
      updateMenuItem(editingItem.id, { name: newItemName, price });
      toast({ title: "Item updated" });
    } else {
      addMenuItem({ name: newItemName, price, available: true });
      toast({ title: "Item added" });
    }
    setIsItemDialogOpen(false);
  };

  const toggleAvailability = (id: string, current: boolean) => {
    updateMenuItem(id, { available: !current });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMenuItem(id);
      toast({ title: "Item deleted" });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSettings({...localSettings, logoImage: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto pb-24 md:pb-8 h-full flex flex-col">
      <header className="mb-6">
        <h1 className="text-3xl font-display font-bold tracking-tight">Settings</h1>
      </header>

      <div className="flex gap-2 mb-6 border-b pb-2 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "general" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <Store className="h-4 w-4" /> Store & Print
        </button>
        <button
          onClick={() => setActiveTab("menu")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "menu" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <MenuIcon className="h-4 w-4" /> Menu Management
        </button>
        <button
          onClick={() => setActiveTab("pdf")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "pdf" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"
          }`}
        >
          <FileText className="h-4 w-4" /> Menu PDF
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        {activeTab === "general" ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                <Store className="h-5 w-5 text-primary" /> Business Details
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Business Logo (Image)</Label>
                  <div className="flex items-center gap-4">
                    {localSettings.logoImage && (
                      <img src={localSettings.logoImage} alt="Logo preview" className="w-16 h-16 object-contain border rounded-lg bg-white" />
                    )}
                    <div className="flex-1">
                      <Input 
                        type="file" 
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="h-11 cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Logo will appear on system-printed receipts.</p>
                    </div>
                    {localSettings.logoImage && (
                      <Button variant="ghost" className="text-destructive px-2" onClick={() => setLocalSettings({...localSettings, logoImage: ""})}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input 
                    value={localSettings.businessName} 
                    onChange={e => setLocalSettings({...localSettings, businessName: e.target.value})}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Logo Text (Short)</Label>
                  <Input 
                    value={localSettings.logoText} 
                    onChange={e => setLocalSettings({...localSettings, logoText: e.target.value})}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Receipt Footer Message</Label>
                  <Input 
                    value={localSettings.footerMessage} 
                    onChange={e => setLocalSettings({...localSettings, footerMessage: e.target.value})}
                    className="h-11"
                  />
                </div>
              </div>
            </section>

            <section className="bg-card p-6 rounded-2xl border shadow-sm space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-2">
                <ReceiptText className="h-5 w-5 text-primary" /> Orders & Pricing
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Currency Symbol</Label>
                  <Input 
                    value={localSettings.currency} 
                    onChange={e => setLocalSettings({...localSettings, currency: e.target.value})}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Token Prefix (e.g. COW)</Label>
                  <Input 
                    value={localSettings.tokenPrefix} 
                    onChange={e => setLocalSettings({...localSettings, tokenPrefix: e.target.value})}
                    className="h-11 uppercase"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                <div className="space-y-0.5">
                  <Label className="text-base font-semibold">Enable Tax</Label>
                  <p className="text-sm text-muted-foreground">Add a fixed tax percentage to orders.</p>
                </div>
                <Switch 
                  checked={localSettings.enableTax} 
                  onCheckedChange={c => setLocalSettings({...localSettings, enableTax: c})}
                />
              </div>
              {localSettings.enableTax && (
                <div className="space-y-2 animate-in fade-in zoom-in-95">
                  <Label>Tax Rate (%)</Label>
                  <Input 
                    type="number" 
                    value={localSettings.taxRate} 
                    onChange={e => setLocalSettings({...localSettings, taxRate: parseFloat(e.target.value) || 0})}
                    className="h-11"
                  />
                </div>
              )}
            </section>

            <Button size="lg" className="w-full h-14 rounded-xl text-lg font-bold" onClick={handleSaveSettings}>
              Save All Settings
            </Button>
          </div>
        ) : activeTab === "menu" ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex justify-between items-center mb-4">
              <p className="text-muted-foreground text-sm">Manage your offerings and prices.</p>
              <Button onClick={openAddItem} className="gap-2 rounded-xl">
                <Plus className="h-4 w-4" /> Add Item
              </Button>
            </div>

            <div className="grid gap-3">
              {menuItems.map(item => (
                <div key={item.id} className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${item.available ? "bg-card shadow-sm" : "bg-muted/50 opacity-60"}`}>
                  <div className="flex-1">
                    <div className="font-bold text-lg">{item.name}</div>
                    <div className="text-primary font-medium">{settings.currency}{item.price}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`h-9 w-24 ${item.available ? "text-green-600 border-green-200 bg-green-50" : "text-muted-foreground"}`}
                      onClick={() => toggleAvailability(item.id, item.available)}
                    >
                      {item.available ? <><Check className="h-4 w-4 mr-1" /> Available</> : <><X className="h-4 w-4 mr-1" /> Disabled</>}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEditItem(item)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {menuItems.length === 0 && (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-2xl">
                  No items in the menu. Click 'Add Item' to create one.
                </div>
              )}
            </div>
          </div>
        ) : activeTab === "pdf" ? (
          <MenuPdfTab />
        ) : null}
      </div>

      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input 
                value={newItemName} 
                onChange={e => setNewItemName(e.target.value)} 
                placeholder="e.g. Samosa Chaat"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label>Price ({settings.currency})</Label>
              <Input 
                type="number" 
                value={newItemPrice} 
                onChange={e => setNewItemPrice(e.target.value)} 
                placeholder="e.g. 50"
                className="h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSaveItem} className="w-full h-12 rounded-xl text-md font-bold">
              Save Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
