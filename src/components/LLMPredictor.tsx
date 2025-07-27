import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";
import { BoundingBox } from "./LabelingCanvas";

interface LLMPredictorProps {
  imageUrl: string | null;
  onPrediction: (predictions: BoundingBox[]) => void;
  isLoading?: boolean;
}

interface ApiLabel {
  tag: string;
  bbox: [number, number, number, number];
}

const LLM_PROVIDERS = [
  { value: "openai", label: "OpenAI GPT-4o" },
  { value: "anthropic", label: "Claude 3.5 Sonnet" },
  { value: "gemini", label: "Google Gemini 2.5 Flash" },
  { value: "mock", label: "Mock (Demo)" },
] as const;

// IMPORTANT: Replace with your actual Google AI Studio API key
const GEMINI_API_KEY = "";

export const LLMPredictor = ({
  imageUrl,
  onPrediction,
  isLoading,
}: LLMPredictorProps) => {
  const [provider, setProvider] = useState<string>("gemini");
  const [apiKey, setApiKey] = useState("");
  const [customPrompt, setCustomPrompt] = useState(
    'Analyze this UI screenshot and detect Button, Input, Radio, and Dropdown elements. Return a JSON object with a "labels" array. Each object in the array should have a "tag" (one of "Button", "Input", "Radio", "Dropdown") and a "bbox" (an array of [x1, y1, x2, y2] coordinates). If no UI elements are found, return an empty "labels" array: {"labels": []}.'
  );
  const [showSettings, setShowSettings] = useState(false);

  const generateMockPredictions = (): BoundingBox[] => {
    // Generate random but realistic looking predictions for demo
    const mockPredictions: BoundingBox[] = [];
    const tags = ["Button", "Input", "Radio", "Dropdown"];

    for (let i = 0; i < Math.floor(Math.random() * 5) + 2; i++) {
      const x1 = Math.random() * 600;
      const y1 = Math.random() * 400;
      const width = Math.random() * 150 + 50;
      const height = Math.random() * 50 + 30;

      mockPredictions.push({
        id: `predicted-${Date.now()}-${i}`,
        tag: tags[Math.floor(Math.random() * tags.length)],
        bbox: [x1, y1, x1 + width, y1 + height],
        type: "predicted",
      });
    }

    return mockPredictions;
  };

  const callGemini = async (imageDataUrl: string): Promise<BoundingBox[]> => {
    // Convert data URL to base64 without the data:image/jpeg;base64, prefix
    const base64Data = imageDataUrl.split(",")[1];

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: customPrompt },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: base64Data,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content received from Gemini API");
    }

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in Gemini response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return (
      parsed.labels?.map((label: ApiLabel, index: number) => ({
        id: `predicted-${Date.now()}-${index}`,
        tag: label.tag,
        bbox: label.bbox,
        type: "predicted" as const,
      })) || []
    );
  };

  const callOpenAI = async (imageDataUrl: string): Promise<BoundingBox[]> => {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: customPrompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return (
      parsed.labels?.map((label: ApiLabel, index: number) => ({
        id: `predicted-${Date.now()}-${index}`,
        tag: label.tag,
        bbox: label.bbox,
        type: "predicted" as const,
      })) || []
    );
  };

  const convertImageToBase64 = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };

      img.src = imageUrl;
    });
  };

  const handlePredict = async () => {
    if (!imageUrl) {
      toast.error("Please upload an image first");
      return;
    }

    try {
      let predictions: BoundingBox[];

      if (provider === "mock") {
        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
        predictions = generateMockPredictions();
        toast.success(`Generated ${predictions.length} mock predictions`);
      } else {
        const imageDataUrl = await convertImageToBase64(imageUrl);

        if (provider === "openai") {
          if (!apiKey.trim()) {
            toast.error("Please enter your OpenAI API key");
            return;
          }
          predictions = await callOpenAI(imageDataUrl);
        } else if (provider === "gemini") {
          if (GEMINI_API_KEY === "YOUR_API_KEY_HERE") {
            toast.error(
              'Please replace "YOUR_API_KEY_HERE" in LLMPredictor.tsx with your actual Gemini API key.'
            );
            return;
          }
          predictions = await callGemini(imageDataUrl);
        } else {
          // For Anthropic or other future providers
          if (!apiKey.trim()) {
            toast.error(`Please enter your API key for ${provider}`);
            return;
          }
          throw new Error("Provider not implemented yet");
        }

        toast.success(`Generated ${predictions.length} predictions`);
      }

      onPrediction(predictions);
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to generate predictions"
      );
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            <h3 className="font-semibold">LLM Auto-Prediction</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>

        {showSettings && (
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="provider">LLM Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LLM_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {provider !== "mock" && provider !== "gemini" && (
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key for {provider}</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder={`Enter your ${provider} API key`}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
            )}

            {provider === "gemini" && (
              <div className="space-y-2">
                <Label>API Key Status</Label>
                <p className="text-xs text-muted-foreground p-2 bg-background rounded border">
                  The Gemini API key is hardcoded. Please replace the
                  placeholder in the source code to use this provider.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="prompt">Custom Prompt</Label>
              <Textarea
                id="prompt"
                rows={3}
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
              />
            </div>
          </div>
        )}

        <Button
          onClick={handlePredict}
          disabled={!imageUrl || isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Bot className="mr-2 h-4 w-4" />
              Generate Predictions
            </>
          )}
        </Button>

        {provider === "mock" && (
          <p className="text-xs text-muted-foreground">
            Mock mode generates random predictions for demo purposes
          </p>
        )}

        {provider === "gemini" && (
          <p className="text-xs text-muted-foreground">
            Get your API key from{" "}
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google AI Studio
            </a>
          </p>
        )}
      </div>
    </Card>
  );
};
