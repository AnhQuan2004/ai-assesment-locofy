import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageIcon } from "lucide-react";
import { toast } from "sonner";
import sampleImage from "@/assets/sample-ui.png";

interface SampleDataProps {
  onLoadSample: (imageUrl: string, fileName: string) => void;
}

export const SampleData = ({ onLoadSample }: SampleDataProps) => {
  const loadSampleImage = () => {
    onLoadSample(sampleImage, "sample-ui.png");
    toast.success("Loaded sample UI screenshot");
  };

  return (
    <Card className="p-4 border-dashed">
      <div className="text-center space-y-3">
        <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground" />
        <div>
          <h3 className="font-medium">Try the Demo</h3>
          <p className="text-sm text-muted-foreground">
            Load a sample UI to test the labeling tool
          </p>
        </div>
        <Button onClick={loadSampleImage} variant="outline" size="sm">
          Load Sample Image
        </Button>
      </div>
    </Card>
  );
};