import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { SampleData } from "./SampleData";

interface ImageUploadProps {
  onImageUpload: (imageUrl: string, fileName: string) => void;
  currentImage?: string;
  currentFileName?: string;
}

export const ImageUpload = ({ onImageUpload, currentImage, currentFileName }: ImageUploadProps) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    const url = URL.createObjectURL(file);
    onImageUpload(url, file.name);
    toast.success(`Uploaded ${file.name}`);
  }, [onImageUpload]);

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: false,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const clearImage = () => {
    onImageUpload('', '');
    toast.success('Image cleared');
  };

  if (currentImage) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">{currentFileName}</p>
              <p className="text-sm text-muted-foreground">Ready for labeling</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearImage}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-4">
          <img 
            src={currentImage} 
            alt="Uploaded"
            className="max-w-full h-32 object-contain rounded border"
          />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${(isDragActive || dropzoneActive) 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {(isDragActive || dropzoneActive) ? 'Drop image here' : 'Upload UI Screenshot'}
          </p>
          <p className="text-muted-foreground">
            Drag and drop an image or click to browse
          </p>
          <p className="text-sm text-muted-foreground">
            Supports PNG, JPG, GIF, and other image formats
          </p>
        </div>
        
        <Button className="mt-4" variant="outline">
          Choose File
        </Button>
      </div>
      
      <div className="mt-4">
        <SampleData onLoadSample={onImageUpload} />
      </div>
    </Card>
  );
};