import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas as FabricCanvas, FabricObject, Rect, FabricImage } from "fabric";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

export interface BoundingBox {
  id: string;
  tag: string;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
  type: 'manual' | 'predicted';
}

interface LabelingCanvasProps {
  imageUrl: string | null;
  onLabelsChange: (labels: BoundingBox[]) => void;
  predictedLabels?: BoundingBox[];
  className?: string;
}

const UI_TAGS = ['Button', 'Input', 'Radio', 'Dropdown'] as const;
type UITag = typeof UI_TAGS[number];

export const LabelingCanvas = ({ 
  imageUrl, 
  onLabelsChange, 
  predictedLabels = [],
  className 
}: LabelingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedTag, setSelectedTag] = useState<UITag>('Button');
  const [isDrawing, setIsDrawing] = useState(false);
  const [labels, setLabels] = useState<BoundingBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<string | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 800,
      height: 600,
      backgroundColor: '#ffffff',
      selection: true,
    });

    setFabricCanvas(canvas);

    return () => {
      canvas.dispose();
    };
  }, []);

  // Handle image loading
  useEffect(() => {
    if (!fabricCanvas || !imageUrl) return;

    const img = new Image();
    img.onload = () => {
      const scale = Math.min(800 / img.width, 600 / img.height);
      const scaledWidth = img.width * scale;
      const scaledHeight = img.height * scale;

      fabricCanvas.setDimensions({
        width: scaledWidth,
        height: scaledHeight
      });

      FabricImage.fromURL(imageUrl).then((img) => {
        img.set({
          scaleX: scale,
          scaleY: scale,
          originX: 'left',
          originY: 'top',
          selectable: false,
          evented: false
        });
        fabricCanvas.backgroundImage = img;
        fabricCanvas.renderAll();
      });
    };
    img.src = imageUrl;
  }, [fabricCanvas, imageUrl]);

  // Handle predicted labels
  useEffect(() => {
    if (!fabricCanvas || !predictedLabels.length) return;

    // Clear existing predicted boxes
    const objects = fabricCanvas.getObjects().filter(obj => 
      (obj as any).data?.type === 'predicted'
    );
    objects.forEach(obj => fabricCanvas.remove(obj));

    // Add predicted boxes
    predictedLabels.forEach(label => {
      const [x1, y1, x2, y2] = label.bbox;
      const rect = new Rect({
        left: x1,
        top: y1,
        width: x2 - x1,
        height: y2 - y1,
        fill: 'transparent',
        stroke: 'hsl(var(--predicted-box))',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false
      });

      (rect as any).data = { 
        id: label.id, 
        tag: label.tag, 
        type: 'predicted' 
      };

      fabricCanvas.add(rect);
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas, predictedLabels]);

  const startDrawing = useCallback(() => {
    if (!fabricCanvas) return;
    setIsDrawing(true);
    fabricCanvas.defaultCursor = 'crosshair';
    
    let startX: number, startY: number;
    let rect: Rect | null = null;

    const handleMouseDown = (e: any) => {
      const pointer = fabricCanvas.getPointer(e.e);
      startX = pointer.x;
      startY = pointer.y;

      rect = new Rect({
        left: startX,
        top: startY,
        width: 0,
        height: 0,
        fill: 'transparent',
        stroke: 'hsl(var(--manual-box))',
        strokeWidth: 2,
        selectable: true
      });

      (rect as any).data = { 
        type: 'manual', 
        tag: selectedTag,
        id: `manual-${Date.now()}`
      };

      fabricCanvas.add(rect);
    };

    const handleMouseMove = (e: any) => {
      if (!rect) return;
      const pointer = fabricCanvas.getPointer(e.e);
      
      rect.set({
        width: Math.abs(pointer.x - startX),
        height: Math.abs(pointer.y - startY),
        left: Math.min(startX, pointer.x),
        top: Math.min(startY, pointer.y)
      });
      
      fabricCanvas.renderAll();
    };

    const handleMouseUp = () => {
      if (rect && rect.width! > 10 && rect.height! > 10) {
        const newLabel: BoundingBox = {
          id: (rect as any).data.id,
          tag: selectedTag,
          bbox: [
            rect.left!,
            rect.top!,
            rect.left! + rect.width!,
            rect.top! + rect.height!
          ],
          type: 'manual'
        };

        setLabels(prev => {
          const updated = [...prev, newLabel];
          onLabelsChange(updated);
          return updated;
        });

        toast.success(`Added ${selectedTag} label`);
      }

      fabricCanvas.off('mouse:down', handleMouseDown);
      fabricCanvas.off('mouse:move', handleMouseMove);
      fabricCanvas.off('mouse:up', handleMouseUp);
      
      setIsDrawing(false);
      fabricCanvas.defaultCursor = 'default';
    };

    fabricCanvas.on('mouse:down', handleMouseDown);
    fabricCanvas.on('mouse:move', handleMouseMove);
    fabricCanvas.on('mouse:up', handleMouseUp);
  }, [fabricCanvas, selectedTag, onLabelsChange]);

  const deleteBox = useCallback((id: string) => {
    if (!fabricCanvas) return;

    const objects = fabricCanvas.getObjects();
    const targetObj = objects.find(obj => (obj as any).data?.id === id);
    
    if (targetObj) {
      fabricCanvas.remove(targetObj);
      setLabels(prev => {
        const updated = prev.filter(label => label.id !== id);
        onLabelsChange(updated);
        return updated;
      });
      toast.success("Deleted label");
    }
  }, [fabricCanvas, onLabelsChange]);

  const clearCanvas = useCallback(() => {
    if (!fabricCanvas) return;
    
    const objects = fabricCanvas.getObjects().filter(obj => 
      (obj as any).data?.type === 'manual'
    );
    objects.forEach(obj => fabricCanvas.remove(obj));
    
    setLabels([]);
    onLabelsChange([]);
    toast.success("Cleared all manual labels");
  }, [fabricCanvas, onLabelsChange]);

  return (
    <div className={className}>
      <div className="flex flex-col gap-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center">
          <Select value={selectedTag} onValueChange={(value: UITag) => setSelectedTag(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UI_TAGS.map(tag => (
                <SelectItem key={tag} value={tag}>
                  {tag}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button 
            onClick={startDrawing} 
            disabled={isDrawing || !imageUrl}
            variant={isDrawing ? "secondary" : "default"}
          >
            {isDrawing ? "Drawing..." : "Draw Box"}
          </Button>
          
          <Button 
            onClick={clearCanvas} 
            variant="outline"
            disabled={!labels.length}
          >
            Clear All
          </Button>
        </div>

        {/* Canvas */}
        <div className="border border-border rounded-lg overflow-hidden bg-canvas-bg">
          <canvas ref={canvasRef} className="max-w-full" />
        </div>

        {/* Labels List */}
        {labels.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold mb-3">Manual Labels ({labels.length})</h3>
            <div className="space-y-2">
              {labels.map(label => (
                <div 
                  key={label.id} 
                  className="flex items-center justify-between p-2 bg-secondary rounded"
                >
                  <span className="font-medium">{label.tag}</span>
                  <span className="text-sm text-muted-foreground">
                    [{Math.round(label.bbox[0])}, {Math.round(label.bbox[1])}, {Math.round(label.bbox[2])}, {Math.round(label.bbox[3])}]
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteBox(label.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Legend */}
        <div className="flex gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-manual-box"></div>
            <span>Manual Labels</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-predicted-box border-dashed"></div>
            <span>Predicted Labels</span>
          </div>
        </div>
      </div>
    </div>
  );
};