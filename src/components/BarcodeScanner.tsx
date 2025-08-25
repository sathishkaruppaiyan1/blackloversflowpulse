import { useState, useRef } from "react";
import { Scan, Camera, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface ScanResult {
  id: string;
  type: 'order' | 'sku' | 'tracking';
  value: string;
  timestamp: Date;
  status: 'success' | 'error';
}

export const BarcodeScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [manualInput, setManualInput] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleStartScan = async () => {
    setIsScanning(true);
    // In a real implementation, this would start the camera
    // For demo purposes, we'll simulate scanning
    setTimeout(() => {
      const mockResult: ScanResult = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'order',
        value: 'ORD-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
        timestamp: new Date(),
        status: 'success'
      };
      setScanResults(prev => [mockResult, ...prev]);
      setIsScanning(false);
    }, 2000);
  };

  const handleManualInput = () => {
    if (manualInput.trim()) {
      const result: ScanResult = {
        id: Math.random().toString(36).substr(2, 9),
        type: manualInput.startsWith('ORD-') ? 'order' : 'sku',
        value: manualInput.trim(),
        timestamp: new Date(),
        status: 'success'
      };
      setScanResults(prev => [result, ...prev]);
      setManualInput("");
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'order': return 'bg-primary';
      case 'sku': return 'bg-accent';
      case 'tracking': return 'bg-success';
      default: return 'bg-muted';
    }
  };

  return (
    <div className="space-y-6">
      {/* Scanner Interface */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scan className="w-5 h-5" />
            Barcode Scanner
          </CardTitle>
          <CardDescription>
            Scan or enter order numbers, SKUs, or tracking codes manually
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Manual Input Section */}
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Scan or enter barcode manually..."
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualInput()}
                className="flex-1"
                autoFocus
              />
              <Button onClick={handleManualInput} variant="accent" size="lg">
                <Scan className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
            
            {/* Quick Scan Types */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                Order ID
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                SKU Code
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground">
                Tracking Number
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Results */}
      {scanResults.length > 0 && (
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Recent Scans</CardTitle>
            <CardDescription>
              {scanResults.length} codes scanned today
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {scanResults.slice(0, 10).map((result) => (
                <div 
                  key={result.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${result.status === 'success' ? 'bg-success' : 'bg-destructive'}`} />
                    <Badge className={getTypeColor(result.type)}>
                      {result.type.toUpperCase()}
                    </Badge>
                    <span className="font-mono font-semibold">{result.value}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{result.timestamp.toLocaleTimeString()}</span>
                    {result.status === 'success' ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <X className="w-4 h-4 text-destructive" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};