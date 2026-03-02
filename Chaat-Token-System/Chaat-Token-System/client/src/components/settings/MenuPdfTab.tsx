import { useState, useRef, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { FileText, Upload, Printer, Crop as CropIcon, Plus, Trash2, ListChecks } from "lucide-react";
import ReactCrop, { Crop } from 'react-image-crop';
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";

// Setup PDF.js worker (works on Vercel)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
interface ParsedItem {
  id: string;
  name: string;
  price: number;
  selected: boolean;
}

export default function MenuPdfTab() {
  const { menuPdf, setMenuPdf, settings, updateSettings, addMenuItem } = useStore();
  const { toast } = useToast();
  
  const [isUploading, setIsUploading] = useState(false);
  const [pdfImage, setPdfImage] = useState<string | null>(null);
  
  // Crop Logo State
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Parse Items State
  const [isParseModalOpen, setIsParseModalOpen] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isParsing, setIsParsing] = useState(false);

  // Initialize PDF image if pdf exists
  useEffect(() => {
    if (menuPdf) {
     renderPdfToImage(menuPdf)
  .then(setPdfImage)
  .catch((e) => {
    console.error("Failed to render PDF preview", e);
    toast({
      title: "PDF rendering failed",
      description: String(e),
      variant: "destructive",
    });
  });
    } else {
      setPdfImage(null);
    }
  }, [menuPdf]);

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== "application/pdf") {
      toast({ title: "Please upload a valid PDF file", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      await setMenuPdf(result);
      toast({ title: "PDF uploaded successfully" });
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const renderPdfToImage = async (pdfBase64: string): Promise<string> => {
    const base64Data = pdfBase64.split(",")[1];
    const binaryStr = window.atob(base64Data);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }

    const loadingTask = pdfjsLib.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    const viewport = page.getViewport({ scale: 2.0 }); // Higher scale for better crop resolution
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    if (context) {
      await page.render({ canvasContext: context, viewport }).promise;
      return canvas.toDataURL("image/png");
    }
    throw new Error("Could not create canvas context");
  };

  const printPdf = () => {
    if (!pdfImage) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: "Pop-up blocked", description: "Please allow pop-ups to print", variant: "destructive" });
      return;
    }
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Menu PDF</title>
          <style>
            body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; }
            img { max-width: 100%; height: auto; }
            @page { margin: 0; size: auto; }
          </style>
        </head>
        <body>
          <img src="${pdfImage}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // CROP LOGO LOGIC
  const openCropModal = () => {
    if (!pdfImage) return;
    setIsCropModalOpen(true);
  };

  const saveCroppedLogo = () => {
    if (!completedCrop || !imageRef.current || completedCrop.width === 0 || completedCrop.height === 0) {
      toast({ title: "Please select an area to crop", variant: "destructive" });
      return;
    }

    const image = imageRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    const base64Image = canvas.toDataURL('image/png');
    updateSettings({ ...settings, logoImage: base64Image });
    toast({ title: "Logo saved successfully" });
    setIsCropModalOpen(false);
  };

  // PARSE ITEMS LOGIC
  const openParseModal = async () => {
    if (!menuPdf) return;
    setIsParseModalOpen(true);
    setIsParsing(true);
    setParsedItems([]);

    try {
      const base64Data = menuPdf.split(",")[1];
      const binaryStr = window.atob(base64Data);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
      }

      const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
      const page = await pdf.getPage(1);
      const textContent = await page.getTextContent();
      
      const lines: string[] = [];
      let currentLine = "";
      let lastY = -1;

      // Group text items by roughly same Y coordinate to form lines
      const items = textContent.items.sort((a: any, b: any) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4]);
      
      items.forEach((item: any) => {
        const y = Math.round(item.transform[5]);
        if (lastY !== -1 && Math.abs(lastY - y) > 5) { // New line
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = item.str;
        } else {
          currentLine += " " + item.str;
        }
        lastY = y;
      });
      if (currentLine.trim()) lines.push(currentLine.trim());

      // Attempt to extract Name and Price
      // Very basic heuristic: look for numbers at the end of the line
      const extracted: ParsedItem[] = [];
      
      lines.forEach((line) => {
        // remove extra spaces and common filler characters like dots
        const cleanLine = line.replace(/\.+/g, ' ').replace(/\s+/g, ' ').trim();
        const parts = cleanLine.split(' ');
        
        if (parts.length > 1) {
          const lastPart = parts[parts.length - 1];
          const possiblePrice = lastPart.replace(/[^0-9.]/g, ''); // strip non-numeric except dot
          
          if (possiblePrice && !isNaN(Number(possiblePrice)) && Number(possiblePrice) > 0) {
            const price = parseFloat(possiblePrice);
            const name = parts.slice(0, -1).join(' ').trim();
            
            if (name.length > 2 && !name.match(/^[0-9]+$/)) { // Name shouldn't be just numbers or too short
              extracted.push({
                id: crypto.randomUUID(),
                name: name,
                price: price,
                selected: true
              });
            }
          }
        }
      });

      setParsedItems(extracted);
    } catch (err) {
      console.error(err);
      toast({ title: "Failed to parse PDF text", variant: "destructive" });
    } finally {
      setIsParsing(false);
    }
  };

  const handleUpdateParsedItem = (id: string, field: 'name' | 'price', value: string) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        if (field === 'price') {
          return { ...item, price: parseFloat(value) || 0 };
        }
        return { ...item, name: value };
      }
      return item;
    }));
  };

  const handleToggleParsedItem = (id: string) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, selected: !item.selected } : item));
  };

  const saveParsedItems = () => {
    const selected = parsedItems.filter(i => i.selected && i.name.trim() !== "");
    if (selected.length === 0) {
      toast({ title: "No valid items selected", variant: "destructive" });
      return;
    }

    selected.forEach(item => {
      addMenuItem({ name: item.name, price: item.price, available: true });
    });

    toast({ title: `Imported ${selected.length} items to Menu` });
    setIsParseModalOpen(false);
  };

  const removePdf = () => {
    if (confirm("Remove this PDF?")) {
      setMenuPdf(null);
      setPdfImage(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-card p-6 rounded-2xl border shadow-sm">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b pb-2">
          <FileText className="h-5 w-5 text-primary" /> Digital Menu PDF
        </h2>

        {!menuPdf ? (
          <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Upload className="w-8 h-8 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold">Upload your Menu PDF</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                Upload your existing menu design. You can print it directly or extract items and your logo from it.
              </p>
            </div>
            <div className="relative">
              <Input 
                type="file" 
                accept="application/pdf" 
                onChange={handlePdfUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={isUploading}
              />
              <Button disabled={isUploading}>
                {isUploading ? "Processing..." : "Select PDF File"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Preview Box */}
              <div className="w-full sm:w-1/3 bg-muted rounded-xl border overflow-hidden aspect-[1/1.4] relative flex items-center justify-center group">
                {pdfImage ? (
                  <img src={pdfImage} alt="Menu Preview" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-muted-foreground text-sm">Rendering...</span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <Button variant="destructive" size="sm" onClick={removePdf}>
                     <Trash2 className="w-4 h-4 mr-2" /> Remove PDF
                   </Button>
                </div>
              </div>

              {/* Actions Box */}
              <div className="w-full sm:w-2/3 flex flex-col gap-3 justify-center">
                <p className="text-sm font-medium text-muted-foreground mb-2">Available Actions:</p>
                
                <Button size="lg" className="justify-start gap-3 h-14 rounded-xl" onClick={printPdf}>
                  <Printer className="w-5 h-5" /> Print Menu PDF
                </Button>
                
                <Button variant="secondary" size="lg" className="justify-start gap-3 h-14 rounded-xl border border-border" onClick={openCropModal}>
                  <CropIcon className="w-5 h-5 text-primary" /> Crop Logo from PDF
                </Button>
                
                <Button variant="secondary" size="lg" className="justify-start gap-3 h-14 rounded-xl border border-border" onClick={openParseModal}>
                  <ListChecks className="w-5 h-5 text-primary" /> Extract Menu Items
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      <Dialog open={isCropModalOpen} onOpenChange={setIsCropModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Crop Logo from PDF</DialogTitle>
            <DialogDescription>Drag to select your logo area on the first page.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-muted/50 p-4 flex justify-center">
            {pdfImage && (
               <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)}>
                 <img ref={imageRef} src={pdfImage} alt="PDF content for cropping" className="max-w-full shadow-md" crossOrigin="anonymous" />
               </ReactCrop>
            )}
          </div>
          <DialogFooter className="p-4 border-t bg-card">
            <Button variant="outline" onClick={() => setIsCropModalOpen(false)}>Cancel</Button>
            <Button onClick={saveCroppedLogo}>Save as Logo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Parse Items Modal */}
      <Dialog open={isParseModalOpen} onOpenChange={setIsParseModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-2xl">
          <DialogHeader>
            <DialogTitle>Imported Items</DialogTitle>
            <DialogDescription>We tried to extract items and prices from your PDF. Review and edit before saving.</DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-3">
            {isParsing ? (
              <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                Analyzing PDF text...
              </div>
            ) : parsedItems.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                Could not automatically detect items. The PDF might be an image or have a complex layout.
              </div>
            ) : (
              parsedItems.map((item, index) => (
                <div key={item.id} className={`flex items-center gap-3 p-3 border rounded-xl transition-opacity ${item.selected ? "bg-card shadow-sm" : "bg-muted/50 opacity-50"}`}>
                  <input 
                    type="checkbox" 
                    checked={item.selected} 
                    onChange={() => handleToggleParsedItem(item.id)}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary ml-2 cursor-pointer"
                  />
                  <div className="flex-1">
                    <Input 
                      value={item.name} 
                      onChange={(e) => handleUpdateParsedItem(item.id, 'name', e.target.value)}
                      className="h-10"
                      disabled={!item.selected}
                    />
                  </div>
                  <div className="w-24">
                    <Input 
                      type="number"
                      value={item.price} 
                      onChange={(e) => handleUpdateParsedItem(item.id, 'price', e.target.value)}
                      className="h-10 text-right"
                      disabled={!item.selected}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
          
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsParseModalOpen(false)}>Cancel</Button>
            <Button onClick={saveParsedItems} disabled={isParsing || parsedItems.length === 0}>
              Add Selected to Menu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
