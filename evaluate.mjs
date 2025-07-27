import fs from 'fs/promises';
import path from 'path';

const UI_TAGS = ['Button', 'Input', 'Radio', 'Dropdown'];
const IOU_THRESHOLD = 0.5;

/**
 * Calculates the Intersection over Union (IoU) of two bounding boxes.
 * @param {number[]} boxA - Bounding box [x1, y1, x2, y2]
 * @param {number[]} boxB - Bounding box [x1, y1, x2, y2]
 * @returns {number} The IoU score.
 */
function calculateIoU(boxA, boxB) {
  const xA = Math.max(boxA[0], boxB[0]);
  const yA = Math.max(boxA[1], boxB[1]);
  const xB = Math.min(boxA[2], boxB[2]);
  const yB = Math.min(boxA[3], boxB[3]);

  const interArea = Math.max(0, xB - xA) * Math.max(0, yB - yA);

  const boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1]);
  const boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1]);

  const unionArea = boxAArea + boxBArea - interArea;
  
  if (unionArea === 0) {
    return 0;
  }

  return interArea / unionArea;
}

/**
 * Evaluates a single pair of ground truth and prediction files.
 * @param {object} gtData - The ground truth data.
 * @param {object} predData - The prediction data.
 * @returns {object} The evaluation metrics for the file pair.
 */
function evaluateSingleFile(gtData, predData) {
  const metrics = {};

  for (const tag of UI_TAGS) {
    const gtBoxes = gtData.labels.filter(l => l.tag === tag);
    const predBoxes = predData.labels.filter(l => l.tag === tag);

    let truePositives = 0;
    const matchedPredIndices = new Set();

    for (const gtBox of gtBoxes) {
      let bestIoU = 0;
      let bestMatchIndex = -1;

      predBoxes.forEach((predBox, i) => {
        if (matchedPredIndices.has(i)) return;
        
        const iou = calculateIoU(gtBox.bbox, predBox.bbox);
        if (iou > bestIoU) {
          bestIoU = iou;
          bestMatchIndex = i;
        }
      });

      if (bestIoU >= IOU_THRESHOLD) {
        truePositives++;
        matchedPredIndices.add(bestMatchIndex);
      }
    }

    const falsePositives = predBoxes.length - truePositives;
    const falseNegatives = gtBoxes.length - truePositives;
    const precision = (truePositives + falsePositives) > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall = (truePositives + falseNegatives) > 0 ? truePositives / (truePositives + falseNegatives) : 0;
    const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    metrics[tag] = {
      true_positives: truePositives,
      false_positives: falsePositives,
      false_negatives: falseNegatives,
      ground_truth_count: gtBoxes.length,
      predicted_count: predBoxes.length,
      precision,
      recall,
      f1_score: f1Score,
    };
  }

  return metrics;
}

/**
 * Aggregates results from multiple file evaluations.
 * @param {object[]} allMetrics - An array of metrics from each file pair.
 * @returns {object} The aggregated performance report.
 */
function aggregateResults(allMetrics) {
  const finalReport = {};

  for (const tag of UI_TAGS) {
    const tagStats = {
      true_positives: 0,
      false_positives: 0,
      false_negatives: 0,
      ground_truth_count: 0,
      predicted_count: 0,
    };

    for (const fileMetrics of allMetrics) {
      if (fileMetrics[tag]) {
        tagStats.true_positives += fileMetrics[tag].true_positives;
        tagStats.false_positives += fileMetrics[tag].false_positives;
        tagStats.false_negatives += fileMetrics[tag].false_negatives;
        tagStats.ground_truth_count += fileMetrics[tag].ground_truth_count;
        tagStats.predicted_count += fileMetrics[tag].predicted_count;
      }
    }

    const precision = (tagStats.true_positives + tagStats.false_positives) > 0 ? tagStats.true_positives / (tagStats.true_positives + tagStats.false_positives) : 0;
    const recall = (tagStats.true_positives + tagStats.false_negatives) > 0 ? tagStats.true_positives / (tagStats.true_positives + tagStats.false_negatives) : 0;
    const f1Score = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;

    finalReport[tag] = { ...tagStats, precision, recall, f1_score: f1Score };
  }
  
  // Calculate overall metrics
  const overall = Object.values(finalReport).reduce((acc, stats) => {
      acc.true_positives += stats.true_positives;
      acc.false_positives += stats.false_positives;
      acc.false_negatives += stats.false_negatives;
      acc.ground_truth_count += stats.ground_truth_count;
      acc.predicted_count += stats.predicted_count;
      return acc;
  }, { true_positives: 0, false_positives: 0, false_negatives: 0, ground_truth_count: 0, predicted_count: 0 });

  const overallPrecision = (overall.true_positives + overall.false_positives) > 0 ? overall.true_positives / (overall.true_positives + overall.false_positives) : 0;
  const overallRecall = (overall.true_positives + overall.false_negatives) > 0 ? overall.true_positives / (overall.true_positives + overall.false_negatives) : 0;
  const overallF1 = (overallPrecision + overallRecall) > 0 ? 2 * (overallPrecision * overallRecall) / (overallPrecision + overallRecall) : 0;

  finalReport.Overall = { ...overall, precision: overallPrecision, recall: overallRecall, f1_score: overallF1 };

  return finalReport;
}

/**
 * Formats and prints the final report to the console.
 * @param {object} report - The aggregated performance report.
 */
function printReport(report) {
  console.log("\n--- LLM Tagging Performance Evaluation ---");
  console.log(`IoU Threshold: ${IOU_THRESHOLD}\n`);

  const formatPercent = (n) => (n * 100).toFixed(2).padStart(6, ' ');
  const formatInt = (n) => String(n).padEnd(5, ' ');

  console.log("Tag       | GT Count | Pred Count | TP   | FP   | FN   | Precision | Recall | F1-Score");
  console.log("----------|----------|------------|------|------|------|-----------|--------|---------");

  for (const tag of [...UI_TAGS, 'Overall']) {
    const stats = report[tag];
    if (stats) {
      const row = [
        tag.padEnd(9),
        String(stats.ground_truth_count).padEnd(8),
        String(stats.predicted_count).padEnd(10),
        formatInt(stats.true_positives),
        formatInt(stats.false_positives),
        formatInt(stats.false_negatives),
        formatPercent(stats.precision),
        formatPercent(stats.recall),
        formatPercent(stats.f1_score),
      ].join(" | ");
      console.log(row);
    }
  }
  console.log("------------------------------------------------------------------------------------");
}


/**
 * Main function to run the evaluation.
 */
async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.error("Usage: node evaluate.mjs <ground_truth_folder> <predictions_folder>");
    process.exit(1);
  }

  const [gtFolder, predFolder] = args;
  const allMetrics = [];

  try {
    const gtFiles = await fs.readdir(gtFolder);
    
    for (const file of gtFiles) {
      if (path.extname(file) !== '.json') continue;

      const gtPath = path.join(gtFolder, file);
      const predPath = path.join(predFolder, file);

      try {
        const gtContent = await fs.readFile(gtPath, 'utf-8');
        const predContent = await fs.readFile(predPath, 'utf-8');
        
        const gtData = JSON.parse(gtContent);
        const predData = JSON.parse(predContent);

        const fileMetrics = evaluateSingleFile(gtData, predData);
        allMetrics.push(fileMetrics);
        
      } catch (err) {
        if (err.code === 'ENOENT') {
          console.warn(`Warning: Prediction file not found for ${file}. Skipping.`);
        } else {
          console.error(`Error processing file ${file}:`, err.message);
        }
      }
    }

    if (allMetrics.length === 0) {
      console.log("No matching file pairs found to evaluate.");
      return;
    }

    const finalReport = aggregateResults(allMetrics);
    printReport(finalReport);

  } catch (error) {
    console.error(`Failed to read directories: ${error.message}`);
    process.exit(1);
  }
}

main();