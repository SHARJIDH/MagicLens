'use client';

import React, { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Tool } from './ToolsPanel';
import { ImageFilters } from './LayersPanel';
import { Upload, RotateCcw, Crop, Check, X, Undo2, Redo2 } from 'lucide-react';

interface CanvasEditorProps {
  imageUrl: string | null;
  tool: Tool;
  brushSize: number;
  brushColor: string;
  brushOpacity: number;
  filters: ImageFilters;
  onMaskChange: (maskDataUrl: string | null) => void;
  onUploadClick?: () => void;
  onImageUpdate?: (dataUrl: string) => void;
  disabled?: boolean;
}

export interface CanvasEditorRef {
  clearMask: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  exportImage: () => string | null;
  getRotatedImage: () => string | null;
  getCroppedImage: () => string | null;
  resetTransforms: () => void;
}

const AdvancedCanvasEditor = forwardRef<CanvasEditorRef, CanvasEditorProps>(
  ({ imageUrl, tool, brushSize: propBrushSize, brushColor, brushOpacity, filters, onMaskChange, onUploadClick, onImageUpdate, disabled }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const maskCanvasRef = useRef<HTMLCanvasElement>(null);
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
    const [imageDimensions, setImageDimensions] = useState({ width: 800, height: 600 });
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });
    
    // History for undo/redo
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [hasMask, setHasMask] = useState(false);
    
    // Rotation state
    const [rotation, setRotation] = useState(0);
    const [isRotating, setIsRotating] = useState(false);
    const [hasRotationChanges, setHasRotationChanges] = useState(false);
    
    // Crop state
    const [isCropping, setIsCropping] = useState(false);
    const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [isDraggingCrop, setIsDraggingCrop] = useState(false);
    const [cropDragStart, setCropDragStart] = useState({ x: 0, y: 0 });
    const [cropStartArea, setCropStartArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [cropResizeHandle, setCropResizeHandle] = useState<string | null>(null);
    const [hasCropChanges, setHasCropChanges] = useState(false);
    const [displayedImageRect, setDisplayedImageRect] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const imageRef = useRef<HTMLImageElement>(null);
    
    // Eraser drag-to-resize state
    const [isResizingEraser, setIsResizingEraser] = useState(false);
    const [eraserResizeStartY, setEraserResizeStartY] = useState(0);
    const [brushSize, setBrushSize] = useState(propBrushSize);
    
    // Update brush size from props
    useEffect(() => {
      setBrushSize(propBrushSize);
    }, [propBrushSize]);

    // Generate CSS filter string from filters
    const getFilterString = useCallback(() => {
      const parts: string[] = [];
      
      if (filters.brightness !== 100) parts.push(`brightness(${filters.brightness}%)`);
      if (filters.contrast !== 100) parts.push(`contrast(${filters.contrast}%)`);
      if (filters.saturation !== 100) parts.push(`saturate(${filters.saturation}%)`);
      if (filters.hue !== 0) parts.push(`hue-rotate(${filters.hue}deg)`);
      if (filters.blur > 0) parts.push(`blur(${filters.blur}px)`);
      if (filters.sepia > 0) parts.push(`sepia(${filters.sepia}%)`);
      if (filters.grayscale > 0) parts.push(`grayscale(${filters.grayscale}%)`);
      
      return parts.length > 0 ? parts.join(' ') : 'none';
    }, [filters]);

    // Load image
    useEffect(() => {
      if (!imageUrl) return;
      
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        
        // Initialize mask canvas
        const maskCanvas = maskCanvasRef.current;
        if (maskCanvas) {
          maskCanvas.width = img.width;
          maskCanvas.height = img.height;
          const ctx = maskCanvas.getContext('2d')!;
          ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
          setHasMask(false);
          setHistory([]);
          setHistoryIndex(-1);
        }
      };
      img.src = imageUrl;
    }, [imageUrl]);

    // Save to history
    const saveToHistory = useCallback(() => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Remove any redo states
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      
      // Limit history to 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    // Export mask for API
    const exportMask = useCallback(() => {
      const canvas = maskCanvasRef.current;
      if (!canvas || !hasMask) {
        onMaskChange(null);
        return;
      }
      
      // Create a binary mask (white where colored, black elsewhere)
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportCtx = exportCanvas.getContext('2d')!;
      
      // Fill with black
      exportCtx.fillStyle = 'black';
      exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      
      // Get mask data
      const maskCtx = canvas.getContext('2d')!;
      const maskData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
      const exportData = exportCtx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
      
      // Convert colored mask to binary mask
      for (let i = 0; i < maskData.data.length; i += 4) {
        const alpha = maskData.data[i + 3];
        if (alpha > 10) {
          // Set to white where there's any color
          exportData.data[i] = 255;     // R
          exportData.data[i + 1] = 255; // G
          exportData.data[i + 2] = 255; // B
          exportData.data[i + 3] = 255; // A
        }
      }
      
      exportCtx.putImageData(exportData, 0, 0);
      onMaskChange(exportCanvas.toDataURL('image/png'));
    }, [hasMask, onMaskChange]);

    // Get canvas position from mouse/touch event
    const getCanvasPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      const canvas = maskCanvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return { x: 0, y: 0 };
      
      const rect = container.getBoundingClientRect();
      
      let clientX: number, clientY: number;
      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      
      // Account for container position, zoom, and pan
      const x = ((clientX - rect.left) / zoom - pan.x) * (canvas.width / (rect.width / zoom));
      const y = ((clientY - rect.top) / zoom - pan.y) * (canvas.height / (rect.height / zoom));
      
      return { x, y };
    }, [zoom, pan]);

    // Draw stroke
    const drawStroke = useCallback((x: number, y: number, isNewStroke: boolean) => {
      const canvas = maskCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;

      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = brushSize;
      
      if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        // Parse color and apply opacity
        const opacity = brushOpacity / 100;
        ctx.strokeStyle = brushColor;
        ctx.globalAlpha = opacity;
      }

      if (isNewStroke || !lastPos) {
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      
      setLastPos({ x, y });
      setHasMask(true);
    }, [brushSize, brushColor, brushOpacity, tool, lastPos]);

    // Mouse/touch handlers
    const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      
      if (tool === 'pan' || (e as React.MouseEvent).button === 1) {
        setIsPanning(true);
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setPanStart({ x: clientX - pan.x, y: clientY - pan.y });
        return;
      }
      
      if (tool === 'brush' || tool === 'eraser') {
        setIsDrawing(true);
        const pos = getCanvasPosition(e);
        drawStroke(pos.x, pos.y, true);
      }
    }, [disabled, tool, pan, getCanvasPosition, drawStroke]);

    const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
      if (disabled) return;
      
      if (isPanning) {
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        setPan({ x: clientX - panStart.x, y: clientY - panStart.y });
        return;
      }
      
      if (isDrawing && (tool === 'brush' || tool === 'eraser')) {
        const pos = getCanvasPosition(e);
        drawStroke(pos.x, pos.y, false);
      }
    }, [disabled, isPanning, panStart, isDrawing, tool, getCanvasPosition, drawStroke]);

    const handlePointerUp = useCallback(() => {
      if (isDrawing) {
        saveToHistory();
        exportMask();
      }
      setIsDrawing(false);
      setIsPanning(false);
      setLastPos(null);
    }, [isDrawing, saveToHistory, exportMask]);

    // Zoom handling
    const handleWheel = useCallback((e: React.WheelEvent) => {
      if (tool === 'zoom' || e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom(prev => Math.min(Math.max(prev * delta, 0.25), 4));
      }
    }, [tool]);

    // Clear mask
    const clearMask = useCallback(() => {
      const canvas = maskCanvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasMask(false);
      saveToHistory();
      onMaskChange(null);
    }, [saveToHistory, onMaskChange]);

    // Undo
    const undo = useCallback(() => {
      if (historyIndex <= 0) return;
      
      const canvas = maskCanvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d')!;
      const newIndex = historyIndex - 1;
      
      if (newIndex < 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setHasMask(false);
      } else {
        ctx.putImageData(history[newIndex], 0, 0);
        setHasMask(true);
      }
      
      setHistoryIndex(newIndex);
      exportMask();
    }, [historyIndex, history, exportMask]);

    // Redo
    const redo = useCallback(() => {
      if (historyIndex >= history.length - 1) return;
      
      const canvas = maskCanvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d')!;
      const newIndex = historyIndex + 1;
      ctx.putImageData(history[newIndex], 0, 0);
      setHistoryIndex(newIndex);
      setHasMask(true);
      exportMask();
    }, [historyIndex, history, exportMask]);

    // Export final image
    const exportImage = useCallback(() => {
      if (!imageUrl) return null;
      
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = imageDimensions.width;
      exportCanvas.height = imageDimensions.height;
      const ctx = exportCanvas.getContext('2d')!;
      
      // Draw image with filters
      const img = new Image();
      img.src = imageUrl;
      ctx.filter = getFilterString();
      ctx.drawImage(img, 0, 0);
      
      return exportCanvas.toDataURL('image/png');
    }, [imageUrl, imageDimensions, getFilterString]);

    // Get rotated image
    const getRotatedImage = useCallback(() => {
      if (!imageUrl || rotation === 0) return null;
      
      const img = new Image();
      img.src = imageUrl;
      
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      
      const newWidth = Math.ceil(imageDimensions.width * cos + imageDimensions.height * sin);
      const newHeight = Math.ceil(imageDimensions.height * cos + imageDimensions.width * sin);
      
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = newWidth;
      exportCanvas.height = newHeight;
      const ctx = exportCanvas.getContext('2d')!;
      
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.filter = getFilterString();
      ctx.drawImage(img, -imageDimensions.width / 2, -imageDimensions.height / 2);
      
      return exportCanvas.toDataURL('image/png');
    }, [imageUrl, rotation, imageDimensions, getFilterString]);

    // Get cropped image
    const getCroppedImage = useCallback(() => {
      if (!imageUrl || !cropArea.width || !cropArea.height) return null;
      
      const img = new Image();
      img.src = imageUrl;
      
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = cropArea.width;
      exportCanvas.height = cropArea.height;
      const ctx = exportCanvas.getContext('2d')!;
      
      ctx.filter = getFilterString();
      ctx.drawImage(
        img,
        cropArea.x, cropArea.y, cropArea.width, cropArea.height,
        0, 0, cropArea.width, cropArea.height
      );
      
      return exportCanvas.toDataURL('image/png');
    }, [imageUrl, cropArea, getFilterString]);

    // Reset transforms
    const resetTransforms = useCallback(() => {
      setRotation(0);
      setIsRotating(false);
      setHasRotationChanges(false);
      setIsCropping(false);
      setCropArea({ x: 0, y: 0, width: 0, height: 0 });
      setHasCropChanges(false);
    }, []);

    // Apply rotation and update image
    const applyRotation = useCallback(() => {
      const rotatedImage = getRotatedImage();
      if (rotatedImage && onImageUpdate) {
        onImageUpdate(rotatedImage);
        setRotation(0);
        setIsRotating(false);
        setHasRotationChanges(false);
      }
    }, [getRotatedImage, onImageUpdate]);

    // Apply crop and update image
    const applyCrop = useCallback(() => {
      const croppedImage = getCroppedImage();
      if (croppedImage && onImageUpdate) {
        onImageUpdate(croppedImage);
        setIsCropping(false);
        setCropArea({ x: 0, y: 0, width: 0, height: 0 });
        setHasCropChanges(false);
      }
    }, [getCroppedImage, onImageUpdate]);

    // Initialize crop area
    const initializeCrop = useCallback(() => {
      setIsCropping(true);
      setHasCropChanges(false);
      // Set initial crop to 80% of image, centered
      const margin = 0.1;
      setCropArea({
        x: imageDimensions.width * margin,
        y: imageDimensions.height * margin,
        width: imageDimensions.width * (1 - margin * 2),
        height: imageDimensions.height * (1 - margin * 2),
      });
    }, [imageDimensions]);

    // Calculate displayed image rect when cropping
    useEffect(() => {
      if (isCropping && imageRef.current && containerRef.current) {
        const updateRect = () => {
          const img = imageRef.current;
          const container = containerRef.current;
          if (!img || !container) return;
          
          const containerRect = container.getBoundingClientRect();
          const imgRect = img.getBoundingClientRect();
          
          setDisplayedImageRect({
            x: imgRect.left - containerRect.left,
            y: imgRect.top - containerRect.top,
            width: imgRect.width,
            height: imgRect.height,
          });
        };
        
        updateRect();
        window.addEventListener('resize', updateRect);
        return () => window.removeEventListener('resize', updateRect);
      }
    }, [isCropping, zoom, pan]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      clearMask,
      undo,
      redo,
      canUndo: historyIndex > 0,
      canRedo: historyIndex < history.length - 1,
      exportImage,
      getRotatedImage,
      getCroppedImage,
      resetTransforms,
    }), [clearMask, undo, redo, historyIndex, history.length, exportImage, getRotatedImage, getCroppedImage, resetTransforms]);

    // Keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        
        if (e.key === '[') {
          e.preventDefault();
          // Decrease brush size - handled by parent
        } else if (e.key === ']') {
          e.preventDefault();
          // Increase brush size - handled by parent
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          undo();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
          e.preventDefault();
          redo();
        } else if (e.key === 'Enter') {
          // Apply crop or rotation when Enter is pressed
          if (isCropping && hasCropChanges) {
            e.preventDefault();
            applyCrop();
          } else if (isRotating && hasRotationChanges) {
            e.preventDefault();
            applyRotation();
          }
        } else if (e.key === 'Escape') {
          // Cancel crop or rotation
          if (isCropping) {
            e.preventDefault();
            setIsCropping(false);
            setCropArea({ x: 0, y: 0, width: 0, height: 0 });
            setHasCropChanges(false);
          } else if (isRotating) {
            e.preventDefault();
            setRotation(0);
            setIsRotating(false);
            setHasRotationChanges(false);
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, isCropping, hasCropChanges, applyCrop, isRotating, hasRotationChanges, applyRotation]);

    // Get cursor style
    const getCursor = () => {
      if (disabled) return 'not-allowed';
      switch (tool) {
        case 'brush':
        case 'eraser':
          return 'crosshair';
        case 'pan':
          return isPanning ? 'grabbing' : 'grab';
        case 'zoom':
          return 'zoom-in';
        default:
          return 'default';
      }
    };

    // Handle eraser drag-to-resize
    const handleEraserResizeStart = useCallback((e: React.MouseEvent) => {
      if (tool === 'eraser') {
        setIsResizingEraser(true);
        setEraserResizeStartY(e.clientY);
        e.preventDefault();
      }
    }, [tool]);

    const handleEraserResize = useCallback((e: React.MouseEvent) => {
      if (isResizingEraser) {
        const deltaY = eraserResizeStartY - e.clientY;
        const newSize = Math.min(Math.max(brushSize + deltaY * 0.5, 5), 150);
        setBrushSize(newSize);
        setEraserResizeStartY(e.clientY);
      }
    }, [isResizingEraser, eraserResizeStartY, brushSize]);

    const handleEraserResizeEnd = useCallback(() => {
      setIsResizingEraser(false);
    }, []);

    // Crop area drag handlers - using screen coordinates
    const handleCropMouseDown = useCallback((e: React.MouseEvent, handle?: string) => {
      if (!isCropping) return;
      e.stopPropagation();
      e.preventDefault();
      
      setCropDragStart({ x: e.clientX, y: e.clientY });
      setCropStartArea({ ...cropArea });
      
      if (handle) {
        setCropResizeHandle(handle);
      } else {
        setIsDraggingCrop(true);
      }
    }, [isCropping, cropArea]);

    const handleCropMouseMove = useCallback((e: React.MouseEvent) => {
      if (!isCropping || (!isDraggingCrop && !cropResizeHandle)) return;
      
      const container = containerRef.current;
      const img = imageRef.current;
      if (!container || !img) return;
      
      const containerRect = container.getBoundingClientRect();
      const imgRect = img.getBoundingClientRect();
      
      // Scale factor from screen to image coordinates
      const scaleX = imageDimensions.width / imgRect.width;
      const scaleY = imageDimensions.height / imgRect.height;
      
      const deltaX = (e.clientX - cropDragStart.x) * scaleX;
      const deltaY = (e.clientY - cropDragStart.y) * scaleY;
      
      if (isDraggingCrop) {
        // Move the entire crop area
        const newX = Math.max(0, Math.min(cropStartArea.x + deltaX, imageDimensions.width - cropStartArea.width));
        const newY = Math.max(0, Math.min(cropStartArea.y + deltaY, imageDimensions.height - cropStartArea.height));
        
        setCropArea({
          ...cropStartArea,
          x: newX,
          y: newY,
        });
        setHasCropChanges(true);
      } else if (cropResizeHandle) {
        // Resize from handles
        let newArea = { ...cropStartArea };
        const minSize = 50;
        
        if (cropResizeHandle.includes('e')) {
          const newWidth = Math.max(minSize, cropStartArea.width + deltaX);
          newArea.width = Math.min(newWidth, imageDimensions.width - cropStartArea.x);
        }
        if (cropResizeHandle.includes('w')) {
          const maxDeltaX = cropStartArea.width - minSize;
          const clampedDeltaX = Math.max(-cropStartArea.x, Math.min(deltaX, maxDeltaX));
          newArea.x = cropStartArea.x + clampedDeltaX;
          newArea.width = cropStartArea.width - clampedDeltaX;
        }
        if (cropResizeHandle.includes('s')) {
          const newHeight = Math.max(minSize, cropStartArea.height + deltaY);
          newArea.height = Math.min(newHeight, imageDimensions.height - cropStartArea.y);
        }
        if (cropResizeHandle.includes('n')) {
          const maxDeltaY = cropStartArea.height - minSize;
          const clampedDeltaY = Math.max(-cropStartArea.y, Math.min(deltaY, maxDeltaY));
          newArea.y = cropStartArea.y + clampedDeltaY;
          newArea.height = cropStartArea.height - clampedDeltaY;
        }
        
        setCropArea(newArea);
        setHasCropChanges(true);
      }
    }, [isCropping, isDraggingCrop, cropResizeHandle, cropDragStart, cropStartArea, imageDimensions]);

    const handleCropMouseUp = useCallback(() => {
      setIsDraggingCrop(false);
      setCropResizeHandle(null);
    }, []);

    if (!imageUrl) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-200 rounded-full flex items-center justify-center">
              <Upload className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-xl font-semibold text-gray-700 mb-2">No image loaded</p>
            <p className="text-sm text-gray-500 mb-6">Upload an image to start editing</p>
            {onUploadClick && (
              <button
                onClick={onUploadClick}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                <Upload className="w-5 h-5 inline-block mr-2 -mt-0.5" />
                Upload Image
              </button>
            )}
          </div>
        </div>
      );
    }

    return (
      <div 
        ref={containerRef}
        className="relative w-full h-full overflow-hidden rounded-2xl bg-[#1a1a1a]"
        style={{ cursor: isResizingEraser ? 'ns-resize' : getCursor() }}
        onWheel={handleWheel}
        onMouseMove={(e) => {
          handleEraserResize(e);
          handleCropMouseMove(e);
        }}
        onMouseUp={() => {
          handleEraserResizeEnd();
          handleCropMouseUp();
        }}
        onMouseLeave={() => {
          handleEraserResizeEnd();
          handleCropMouseUp();
        }}
      >
        {/* Image Layer */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg)`,
            transformOrigin: 'center',
          }}
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt="Source"
            className="max-w-full max-h-full object-contain"
            style={{ filter: getFilterString() }}
            draggable={false}
          />
          
          {/* Mask Canvas Overlay */}
          <canvas
            ref={maskCanvasRef}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            style={{ 
              mixBlendMode: 'normal',
              opacity: 0.6,
            }}
          />
        </div>

        {/* Crop Overlay - Outside transformed container for proper coordinates */}
        {isCropping && imageRef.current && (
          <div 
            className="absolute inset-0 z-30"
            style={{ pointerEvents: 'none' }}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/50" />
            
            {/* Crop area - this is the visible part */}
            {(() => {
              const img = imageRef.current;
              if (!img) return null;
              
              const containerRect = containerRef.current?.getBoundingClientRect();
              const imgRect = img.getBoundingClientRect();
              if (!containerRect) return null;
              
              // Calculate crop box position in screen coordinates
              const imgOffsetX = imgRect.left - containerRect.left;
              const imgOffsetY = imgRect.top - containerRect.top;
              const scaleX = imgRect.width / imageDimensions.width;
              const scaleY = imgRect.height / imageDimensions.height;
              
              const cropLeft = imgOffsetX + cropArea.x * scaleX;
              const cropTop = imgOffsetY + cropArea.y * scaleY;
              const cropWidth = cropArea.width * scaleX;
              const cropHeight = cropArea.height * scaleY;
              
              return (
                <>
                  {/* Clear area (crop selection) */}
                  <div
                    className="absolute bg-transparent border-2 border-white shadow-lg"
                    style={{
                      left: cropLeft,
                      top: cropTop,
                      width: cropWidth,
                      height: cropHeight,
                      pointerEvents: 'auto',
                      cursor: 'move',
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                    }}
                    onMouseDown={(e) => handleCropMouseDown(e)}
                  >
                    {/* Grid lines */}
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/3 left-0 right-0 h-px bg-white/60" />
                      <div className="absolute top-2/3 left-0 right-0 h-px bg-white/60" />
                      <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/60" />
                      <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/60" />
                    </div>
                    
                    {/* Corner handles */}
                    {['nw', 'ne', 'sw', 'se'].map(handle => (
                      <div
                        key={handle}
                        className="absolute w-5 h-5 bg-white rounded-sm shadow-md"
                        style={{
                          left: handle.includes('w') ? -10 : 'auto',
                          right: handle.includes('e') ? -10 : 'auto',
                          top: handle.includes('n') ? -10 : 'auto',
                          bottom: handle.includes('s') ? -10 : 'auto',
                          cursor: `${handle}-resize`,
                          pointerEvents: 'auto',
                        }}
                        onMouseDown={(e) => handleCropMouseDown(e, handle)}
                      />
                    ))}
                    
                    {/* Edge handles */}
                    {['n', 'e', 's', 'w'].map(handle => (
                      <div
                        key={handle}
                        className="absolute bg-white rounded-sm shadow-md"
                        style={{
                          left: handle === 'w' ? -5 : handle === 'e' ? 'auto' : '50%',
                          right: handle === 'e' ? -5 : 'auto',
                          top: handle === 'n' ? -5 : handle === 's' ? 'auto' : '50%',
                          bottom: handle === 's' ? -5 : 'auto',
                          width: handle === 'n' || handle === 's' ? 30 : 10,
                          height: handle === 'e' || handle === 'w' ? 30 : 10,
                          transform: handle === 'n' || handle === 's' ? 'translateX(-50%)' : 'translateY(-50%)',
                          cursor: handle === 'n' || handle === 's' ? 'ns-resize' : 'ew-resize',
                          pointerEvents: 'auto',
                        }}
                        onMouseDown={(e) => handleCropMouseDown(e, handle)}
                      />
                    ))}
                    
                    {/* Size indicator */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                      {Math.round(cropArea.width)} × {Math.round(cropArea.height)}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Interaction Layer (only when not cropping) */}
        {!isCropping && (
          <div
            className="absolute inset-0"
            onMouseDown={(e) => {
              if (tool === 'eraser') {
                handleEraserResizeStart(e);
              }
              handlePointerDown(e);
            }}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onMouseLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
            style={{ touchAction: 'none' }}
          />
        )}

        {/* Top Toolbar - Rotation and Crop controls */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-gray-200 shadow-xl z-10">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          
          <div className="w-px h-6 bg-gray-200 mx-1" />
          
          {/* Rotation */}
          <button
            onClick={() => {
              if (isRotating) {
                setIsRotating(false);
                setRotation(0);
                setHasRotationChanges(false);
              } else {
                setIsRotating(true);
                setIsCropping(false);
              }
            }}
            className={`p-2 rounded-lg transition-colors ${isRotating ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Rotate"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          
          {/* Crop */}
          <button
            onClick={() => {
              if (isCropping) {
                setIsCropping(false);
                setCropArea({ x: 0, y: 0, width: 0, height: 0 });
                setHasCropChanges(false);
              } else {
                initializeCrop();
                setIsRotating(false);
              }
            }}
            className={`p-2 rounded-lg transition-colors ${isCropping ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-100 text-gray-600'}`}
            title="Crop"
          >
            <Crop className="w-4 h-4" />
          </button>
          
          {/* Apply/Cancel buttons for rotation or crop */}
          {(hasRotationChanges || hasCropChanges) && (
            <>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <button
                onClick={() => {
                  if (hasRotationChanges) applyRotation();
                  if (hasCropChanges) applyCrop();
                }}
                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                title="Apply"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  if (isRotating) {
                    setRotation(0);
                    setHasRotationChanges(false);
                  }
                  if (isCropping) {
                    setIsCropping(false);
                    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
                    setHasCropChanges(false);
                  }
                }}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Rotation Slider Panel - Simple style */}
        {isRotating && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-md px-6 py-3 rounded-xl border border-gray-200 shadow-xl z-20 flex items-center gap-4">
            <span className="text-sm text-gray-600">Rotation:</span>
            <input
              type="range"
              min="-180"
              max="180"
              value={rotation}
              onChange={(e) => {
                setRotation(Number(e.target.value));
                setHasRotationChanges(true);
              }}
              className="w-48 h-2 bg-purple-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
            />
            <span className="w-12 h-8 flex items-center justify-center bg-purple-600 text-white text-sm font-medium rounded-full">{rotation}°</span>
          </div>
        )}

        {/* Eraser Size Panel - Simple style */}
        {tool === 'eraser' && (
          <div className="absolute top-20 right-4 bg-white/95 backdrop-blur-md px-5 py-3 rounded-xl border border-gray-200 shadow-xl z-20 flex items-center gap-4">
            <span className="text-sm text-gray-600">Size:</span>
            <input
              type="range"
              min="5"
              max="150"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-32 h-2 bg-blue-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab"
            />
            <span className="w-10 h-8 flex items-center justify-center bg-blue-600 text-white text-xs font-medium rounded-full">{Math.round(brushSize)}</span>
          </div>
        )}

        {/* Keyboard hints for crop/rotate */}
        {(isCropping || isRotating) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/80 text-white text-sm px-4 py-2 rounded-lg">
            Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded mx-1">Enter</kbd> to apply, <kbd className="px-1.5 py-0.5 bg-white/20 rounded mx-1">Esc</kbd> to cancel
          </div>
        )}

        {/* Brush Cursor Preview */}
        {(tool === 'brush' || tool === 'eraser') && !disabled && (
          <div
            className="fixed pointer-events-none border-2 rounded-full opacity-50"
            style={{
              width: brushSize * zoom,
              height: brushSize * zoom,
              borderColor: tool === 'eraser' ? '#fff' : brushColor,
              transform: 'translate(-50%, -50%)',
            }}
          />
        )}
      </div>
    );
  }
);

AdvancedCanvasEditor.displayName = 'AdvancedCanvasEditor';

export default AdvancedCanvasEditor;
