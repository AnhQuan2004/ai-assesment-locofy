import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Download, FileJson, BarChart } from "lucide-react";
import { toast } from "sonner";
import { BoundingBox } from "./LabelingCanvas";

interface DataExportProps {
  manualLabels: BoundingBox[];
  predictedLabels: BoundingBox[];
  imageName: string;
}

interface GroundTruthData {
  image_filename: string;
  labels: Array<{
    tag: string;
    bbox: [number, number, number, number];
  }>;
}

interface PredictionData {
  image_filename: string;
  labels: Array<{
    tag: string;
    bbox: [number, number, number, number];
  }>;
}

interface TagMetrics {
  ground_truth_count: number;
  predicted_count: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1_score: number;
}

export const DataExport = ({ manualLabels, predictedLabels, imageName }: DataExportProps) => {
  
  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportGroundTruth = () => {
    if (!manualLabels.length) {
      toast.error('No manual labels to export');
      return;
    }

    const groundTruthData: GroundTruthData = {
      image_filename: imageName,
      labels: manualLabels.map(label => ({
        tag: label.tag,
        bbox: label.bbox
      }))
    };

    const filename = `ground_truth_${imageName.replace(/\.[^/.]+$/, '')}.json`;
    downloadJSON(groundTruthData, filename);
    toast.success(`Exported ground truth with ${manualLabels.length} labels`);
  };

  const exportPredictions = () => {
    if (!predictedLabels.length) {
      toast.error('No predictions to export');
      return;
    }

    const predictionData: PredictionData = {
      image_filename: imageName,
      labels: predictedLabels.map(label => ({
        tag: label.tag,
        bbox: label.bbox
      }))
    };

    const filename = `predictions_${imageName.replace(/\.[^/.]+$/, '')}.json`;
    downloadJSON(predictionData, filename);
    toast.success(`Exported predictions with ${predictedLabels.length} labels`);
  };

  const calculateIoU = (boxA: [number, number, number, number], boxB: [number, number, number, number]): number => {
    const xA = Math.max(boxA[0], boxB[0]);
    const yA = Math.max(boxA[1], boxB[1]);
    const xB = Math.min(boxA[2], boxB[2]);
    const yB = Math.min(boxA[3], boxB[3]);
    
    const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);
    
    const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
    const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);
    
    const iou = interArea / (boxAArea + boxBArea - interArea);
    return iou;
  };

  const generateEvaluation = () => {
    if (!manualLabels.length || !predictedLabels.length) {
      toast.error('Need both manual labels and predictions for evaluation');
      return;
    }

    const iouThreshold = 0.5;
    const tags = ['Button', 'Input', 'Radio', 'Dropdown'];
    const evaluation: any = {
      image_filename: imageName,
      iou_threshold: iouThreshold,
      summary: {} as Record<string, TagMetrics>,
      details: []
    };

    // Calculate metrics for each tag
    tags.forEach(tag => {
      const gtBoxes = manualLabels.filter(label => label.tag === tag);
      const predBoxes = predictedLabels.filter(label => label.tag === tag);

      let truePositives = 0;
      const matchedGT = new Set<string>();
      const matchedPred = new Set<string>();

      // Find matches
      predBoxes.forEach(predBox => {
        let bestIoU = 0;
        let bestMatch: BoundingBox | null = null;

        gtBoxes.forEach(gtBox => {
          if (matchedGT.has(gtBox.id)) return;
          
          const iou = calculateIoU(predBox.bbox, gtBox.bbox);
          if (iou > bestIoU && iou >= iouThreshold) {
            bestIoU = iou;
            bestMatch = gtBox;
          }
        });

        if (bestMatch) {
          truePositives++;
          matchedGT.add(bestMatch.id);
          matchedPred.add(predBox.id);
        }
      });

      const falsePositives = predBoxes.length - truePositives;
      const falseNegatives = gtBoxes.length - truePositives;

      const precision = truePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
      const recall = truePositives > 0 ? truePositives / (truePositives + falseNegatives) : 0;
      const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

      evaluation.summary[tag] = {
        ground_truth_count: gtBoxes.length,
        predicted_count: predBoxes.length,
        true_positives: truePositives,
        false_positives: falsePositives,
        false_negatives: falseNegatives,
        precision: Math.round(precision * 1000) / 1000,
        recall: Math.round(recall * 1000) / 1000,
        f1_score: Math.round(f1Score * 1000) / 1000
      };
    });

    // Overall metrics - safe type handling
    const totalGT = manualLabels.length;
    const totalPred = predictedLabels.length;
    
    const tagMetrics = Object.values(evaluation.summary) as TagMetrics[];
    const totalTP = tagMetrics.reduce((sum, metrics) => sum + metrics.true_positives, 0);
    const totalFP = tagMetrics.reduce((sum, metrics) => sum + metrics.false_positives, 0);
    const totalFN = tagMetrics.reduce((sum, metrics) => sum + metrics.false_negatives, 0);

    const overallPrecision = totalTP > 0 ? totalTP / (totalTP + totalFP) : 0;
    const overallRecall = totalTP > 0 ? totalTP / (totalTP + totalFN) : 0;
    const overallF1 = overallPrecision + overallRecall > 0 ? (2 * overallPrecision * overallRecall) / (overallPrecision + overallRecall) : 0;

    evaluation.summary.overall = {
      ground_truth_count: totalGT,
      predicted_count: totalPred,
      true_positives: totalTP,
      false_positives: totalFP,
      false_negatives: totalFN,
      precision: Math.round(overallPrecision * 1000) / 1000,
      recall: Math.round(overallRecall * 1000) / 1000,
      f1_score: Math.round(overallF1 * 1000) / 1000
    };

    const filename = `evaluation_${imageName.replace(/\.[^/.]+$/, '')}.json`;
    downloadJSON(evaluation, filename);
    toast.success(`Generated evaluation report (Overall F1: ${Math.round(overallF1 * 100)}%)`);
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={exportGroundTruth}
            disabled={!manualLabels.length}
            className="flex items-center gap-2"
          >
            <FileJson className="h-4 w-4" />
            Ground Truth
            {manualLabels.length > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-1 rounded">
                {manualLabels.length}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={exportPredictions}
            disabled={!predictedLabels.length}
            className="flex items-center gap-2"
          >
            <FileJson className="h-4 w-4" />
            Predictions
            {predictedLabels.length > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-1 rounded">
                {predictedLabels.length}
              </span>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={generateEvaluation}
            disabled={!manualLabels.length || !predictedLabels.length}
            className="flex items-center gap-2"
          >
            <BarChart className="h-4 w-4" />
            Evaluation
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          <p>• Ground Truth: Manual labels in JSON format</p>
          <p>• Predictions: LLM-generated labels in JSON format</p>
          <p>• Evaluation: Metrics comparing predictions to ground truth (IoU threshold: 0.5)</p>
        </div>
      </div>
    </Card>
  );
};