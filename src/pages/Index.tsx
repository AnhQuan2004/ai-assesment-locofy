import { useState } from "react";
import { ImageUpload } from "@/components/ImageUpload";
import { LabelingCanvas, BoundingBox } from "@/components/LabelingCanvas";
import { LLMPredictor } from "@/components/LLMPredictor";
import { DataExport } from "@/components/DataExport";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Target, Brain, BarChart3 } from "lucide-react";

const Index = () => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageName, setImageName] = useState<string>('');
  const [manualLabels, setManualLabels] = useState<BoundingBox[]>([]);
  const [predictedLabels, setPredictedLabels] = useState<BoundingBox[]>([]);
  const [isPrediciting, setIsPrediciting] = useState(false);

  const handleImageUpload = (url: string, fileName: string) => {
    setImageUrl(url);
    setImageName(fileName);
    setManualLabels([]);
    setPredictedLabels([]);
  };

  const handlePrediction = (predictions: BoundingBox[]) => {
    setPredictedLabels(predictions);
    setIsPrediciting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">UI Component Labeling Tool</h1>
              <p className="text-muted-foreground mt-2">
                Create ground truth datasets and evaluate LLM-based UI tagging models
              </p>
            </div>
            <div className="flex gap-3">
              <Badge variant="outline" className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Manual Labeling
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                LLM Prediction
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3" />
                Evaluation
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main Canvas Area */}
          <div className="xl:col-span-3">
            <Card className="p-6">
              <div className="space-y-6">
                {/* Image Upload */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">1. Upload UI Screenshot</h2>
                  <ImageUpload 
                    onImageUpload={handleImageUpload}
                    currentImage={imageUrl}
                    currentFileName={imageName}
                  />
                </div>

                <Separator />

                {/* Labeling Canvas */}
                {imageUrl && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4">2. Label UI Components</h2>
                    <LabelingCanvas
                      imageUrl={imageUrl}
                      onLabelsChange={setManualLabels}
                      predictedLabels={predictedLabels}
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Side Panel */}
          <div className="xl:col-span-1 space-y-6">
            {/* LLM Prediction */}
            <div>
              <h2 className="text-xl font-semibold mb-4">3. Auto-Predict</h2>
              <LLMPredictor
                imageUrl={imageUrl}
                onPrediction={handlePrediction}
                isLoading={isPrediciting}
              />
            </div>

            {/* Statistics */}
            {(manualLabels.length > 0 || predictedLabels.length > 0) && (
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Statistics</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Manual Labels:</span>
                    <Badge variant="secondary">{manualLabels.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Predictions:</span>
                    <Badge variant="secondary">{predictedLabels.length}</Badge>
                  </div>
                  {manualLabels.length > 0 && predictedLabels.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Ready for evaluation
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Data Export */}
            {(manualLabels.length > 0 || predictedLabels.length > 0) && (
              <div>
                <h2 className="text-xl font-semibold mb-4">4. Export & Evaluate</h2>
                <DataExport
                  manualLabels={manualLabels}
                  predictedLabels={predictedLabels}
                  imageName={imageName}
                />
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <Card className="mt-8 p-6">
          <h3 className="text-lg font-semibold mb-4">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">1</span>
                <span className="font-medium">Upload Image</span>
              </div>
              <p className="text-muted-foreground">
                Upload a UI screenshot (PNG, JPG, etc.) to start labeling
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">2</span>
                <span className="font-medium">Manual Labeling</span>
              </div>
              <p className="text-muted-foreground">
                Select a tag, then draw bounding boxes around UI components
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">3</span>
                <span className="font-medium">LLM Prediction</span>
              </div>
              <p className="text-muted-foreground">
                Use AI to automatically detect and label components
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">4</span>
                <span className="font-medium">Export & Evaluate</span>
              </div>
              <p className="text-muted-foreground">
                Download JSON files and generate evaluation metrics
              </p>
            </div>
          </div>
        </Card>

        {/* Supported Tags */}
        <Card className="mt-6 p-6">
          <h3 className="text-lg font-semibold mb-4">Supported UI Components</h3>
          <div className="flex flex-wrap gap-3">
            {['Button', 'Input', 'Radio', 'Dropdown'].map(tag => (
              <Badge key={tag} variant="outline" className="px-3 py-1">
                {tag}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Focus on these four core UI elements for consistent evaluation across different interfaces.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Index;
