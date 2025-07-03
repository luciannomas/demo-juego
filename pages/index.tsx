import { useState, useEffect, useRef } from "react";
import { Paintbrush, Eraser, Undo, Redo, Save, Image as ImageIcon, PaintBucket, Download, RefreshCw } from "lucide-react";
import { toast, Toaster } from "sonner";
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
//comentario v1.0.0


interface DrawingTool {
  name: string;
  icon: JSX.Element;
  isActive?: boolean;
  subTools?: DrawingTool[];
}


interface Color {
  name: string;
  hex: string;
}


interface BrushSizeOption {
  label: string;
  value: number;
}


interface GradientOption {
  label: string;
  value: string;
}


interface DrawingAction {
  type: "draw" | "erase" | "fill" | "clear";
  x: number;
  y: number;
  color?: string;
  size?: number;
  prevColor?: string;
}


const Index = () => {
  const [color, setColor] = useState<string>("#000000");
  const [brushSize, setBrushSize] = useState<number>(5);
  const [eraserSize, setEraserSize] = useState<number>(20);
  const [tool, setTool] = useState<string>("paintbrush");
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [canvasHistory, setCanvasHistory] = useState<ImageData[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [showBrushSizeDropdown, setShowBrushSizeDropdown] = useState<boolean>(false);
  const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
  const [showEraserSizeDropdown, setShowEraserSizeDropdown] = useState<boolean>(false);
  const [backgroundGradient, setBackgroundGradient] = useState<string>("linear-gradient(to bottom right, #FFFFFF, #E0E0E0)");
  const [isGradientLoading, setIsGradientLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const brushSizeDropdownRef = useRef<HTMLDivElement>(null);
  const eraserSizeDropdownRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // Agregar estos estados al inicio del componente Index:
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{x: number, y: number} | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{x: number, y: number} | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);


  const colors: Color[] = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Red", hex: "#FF0000" },
    { name: "Blue", hex: "#0000FF" },
    { name: "Green", hex: "#00FF00" },
    { name: "Yellow", hex: "#FFFF00" },
    { name: "Purple", hex: "#800080" },
    { name: "Orange", hex: "#FFA500" },
    { name: "Pink", hex: "#FFC0CB" },
    { name: "Brown", hex: "#964B00" },
    { name: "Gray", hex: "#808080" },
    { name: "Rainbow", hex: "rainbow" },
  ];


  const brushSizes: BrushSizeOption[] = [
    { label: "Small", value: 3 },
    { label: "Medium", value: 5 },
    { label: "Large", value: 8 },
    { label: "X-Large", value: 12 },
  ];


  const eraserSizes: BrushSizeOption[] = [
    { label: "Small", value: 10 },
    { label: "Medium", value: 20 },
    { label: "Large", value: 30 },
    { label: "X-Large", value: 40 },
  ];


  const gradients: GradientOption[] = [
    { label: "Default", value: "linear-gradient(to bottom right, #FFFFFF, #E0E0E0)" },
    { label: "Sunset", value: "linear-gradient(to bottom right, #FFD700, #FFA07A)" },
    { label: "Ocean", value: "linear-gradient(to bottom right, #B0E0E6, #4682B4)" },
    { label: "Forest", value: "linear-gradient(to bottom right, #F5F5DC, #228B22)" },
    { label: "Lavender", value: "linear-gradient(to bottom right, #FFF0F5, #9370DB)" },
    { label: "Candy", value: "linear-gradient(to bottom right, #FFB6C1, #FF69B4)" },
    { label: "Sky", value: "linear-gradient(to bottom right, #87CEEB, #1E90FF)" },
    { label: "Mint", value: "linear-gradient(to bottom right, #F5FFFA, #98FB98)" },
    { label: "Grape", value: "linear-gradient(to bottom right, #F8F8FF, #800080)" },
  ];


  const tools: DrawingTool[] = [
    { 
      name: "paintbrush", 
      icon: <Paintbrush size={24} />, 
      isActive: true,
      subTools: [
        { name: "small", icon: <Paintbrush size={16} /> },
        { name: "medium", icon: <Paintbrush size={20} /> },
        { name: "large", icon: <Paintbrush size={28} /> },
        { name: "x-large", icon: <Paintbrush size={36} /> },
      ]
    },
    { 
      name: "eraser", 
      icon: <Eraser size={24} />,
      isActive: false,
      subTools: [
        { name: "small", icon: <Eraser size={16} /> },
        { name: "medium", icon: <Eraser size={20} /> },
        { name: "large", icon: <Eraser size={28} /> },
        { name: "x-large", icon: <Eraser size={36} /> },
      ]
    },
    { 
      name: "fill", 
      icon: <PaintBucket size={24} />,
      isActive: false
    },
    { 
      name: "undo", 
      icon: <Undo size={24} />,
      isActive: false
    },
    { 
      name: "redo", 
      icon: <Redo size={24} />,
      isActive: false
    },
    { 
      name: "save", 
      icon: <Save size={24} />,
      isActive: false
    },
    { 
      name: "background", 
      icon: <ImageIcon size={24} />,
      isActive: false
    },
  ];


  const rainbowColors: string[] = ["#FF0000", "#FF7F00", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#9400D3"];


  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      // Obtener el tamaño visual real del contenedor
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      } else {
        // Fallback si no hay contenedor
        canvas.width = 800;
        canvas.height = 600;
      }
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctxRef.current = ctx;
        initializeCanvas();
      }
    }
  }, []);

  // Agregar listener para cambios de tamaño de ventana
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        // Reinicializar el canvas con el nuevo tamaño
        if (ctxRef.current) {
          ctxRef.current.lineCap = "round";
          ctxRef.current.lineJoin = "round";
          initializeCanvas();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  useEffect(() => {
    if (ctxRef.current) {
      if (tool === "paintbrush") {
        ctxRef.current.globalCompositeOperation = "source-over";
        ctxRef.current.strokeStyle = color === "rainbow" ? rainbowColors[0] : color;
        ctxRef.current.lineWidth = brushSize;
      } else if (tool === "eraser") {
        ctxRef.current.globalCompositeOperation = "source-over";
        ctxRef.current.strokeStyle = "white";
        ctxRef.current.lineWidth = eraserSize;
      }
    }
  }, [tool, color, brushSize, eraserSize]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(event.target as Node) &&
        !event.target.closest("[data-color-picker-toggle]")
      ) {
        setShowColorPicker(false);
      }
      if (
        brushSizeDropdownRef.current &&
        !brushSizeDropdownRef.current.contains(event.target as Node) &&
        !event.target.closest("[data-brush-size-toggle]")
      ) {
        setShowBrushSizeDropdown(false);
      }
      if (
        eraserSizeDropdownRef.current &&
        !eraserSizeDropdownRef.current.contains(event.target as Node) &&
        !event.target.closest("[data-eraser-size-toggle]")
      ) {
        setShowEraserSizeDropdown(false);
      }
    };


    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  useEffect(() => {
    if (canvasHistory.length === 0) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "white";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          setCanvasHistory([imageData]);
          setCurrentStep(0);
        }
      }
    }
  }, [canvasHistory]);


  const initializeCanvas = () => {
    if (ctxRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      ctxRef.current.fillStyle = "white";
      ctxRef.current.fillRect(0, 0, canvas.width, canvas.height);
      const imageData = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasHistory([imageData]);
      setCurrentStep(0);
    }
  };


  const saveCanvasState = () => {
    if (ctxRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const imageData = ctxRef.current.getImageData(0, 0, canvas.width, canvas.height);
      const newHistory = [...canvasHistory.slice(0, currentStep + 1), imageData];
      setCanvasHistory(newHistory);
      setCurrentStep(newHistory.length - 1);
    }
  };


  const undo = () => {
    if (currentStep > 0 && canvasRef.current) {
      const newStep = currentStep - 1;
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(canvasHistory[newStep], 0, 0);
        setCurrentStep(newStep);
      }
    }
  };


  const redo = () => {
    if (currentStep < canvasHistory.length - 1 && canvasRef.current) {
      const newStep = currentStep + 1;
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(canvasHistory[newStep], 0, 0);
        setCurrentStep(newStep);
      }
    }
  };


  // Función auxiliar para obtener la posición tanto de mouse como de touch, considerando scroll y zoom
  const getPointerPosition = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>): { x: number; y: number } => {
    let pageX = 0, pageY = 0;
    if ('touches' in e && e.touches.length > 0) {
      pageX = e.touches[0].pageX;
      pageY = e.touches[0].pageY;
    } else if ('pageX' in e) {
      pageX = (e as React.MouseEvent<HTMLCanvasElement>).pageX;
      pageY = (e as React.MouseEvent<HTMLCanvasElement>).pageY;
    }
    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      // Sumar el scroll de la página para obtener la posición real
      const scrollLeft = window.scrollX || window.pageXOffset;
      const scrollTop = window.scrollY || window.pageYOffset;
      const x = pageX - (rect.left + scrollLeft);
      const y = pageY - (rect.top + scrollTop);
      return { x, y };
    }
    return { x: 0, y: 0 };
  };

  // Helper para distinguir entre mouse y touch
  const isMouseEvent = (e: any): e is React.MouseEvent<HTMLCanvasElement> => {
    return e && typeof e === 'object' && 'button' in e;
  };

  // Adaptar funciones para soportar touch y mouse correctamente
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isMouseEvent(e)) e.preventDefault();
    if (ctxRef.current) {
      const { x, y } = getPointerPosition(e);
      ctxRef.current.beginPath();
      ctxRef.current.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctxRef.current) return;
    if (isMouseEvent(e)) e.preventDefault();
    const { x, y } = getPointerPosition(e);
    if (tool === "paintbrush") {
      ctxRef.current.strokeStyle = color === "rainbow" ? rainbowColors[Math.floor(Math.random() * rainbowColors.length)] : color;
      ctxRef.current.lineWidth = brushSize;
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
    } else if (tool === "eraser") {
      ctxRef.current.strokeStyle = "white";
      ctxRef.current.lineWidth = eraserSize;
      ctxRef.current.lineTo(x, y);
      ctxRef.current.stroke();
    }
  };

  const stopDrawing = (e?: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      saveCanvasState();
    }
    if (ctxRef.current) {
      ctxRef.current.closePath();
    }
    setIsDrawing(false);
  };

  const floodFill = (x: number, y: number, fillColor: string) => {
    if (!canvasRef.current || !ctxRef.current) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const MAX_PIXELS = 500000; // Límite de seguridad

    // Validar coordenadas
    if (x < 0 || x >= canvasWidth || y < 0 || y >= canvasHeight) return;

    // Obtener el color objetivo y el imageData una sola vez
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    const getColorAt = (px: number, py: number) => {
      const idx = (py * canvasWidth + px) * 4;
      return `rgba(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]}, ${data[idx + 3] / 255})`;
    };
    const setColorAt = (px: number, py: number, color: string) => {
      const idx = (py * canvasWidth + px) * 4;
      if (color.startsWith("rgba")) {
        const rgba = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(?:\.\d+)?)\)$/);
        if (rgba) {
          data[idx] = parseInt(rgba[1]);
          data[idx + 1] = parseInt(rgba[2]);
          data[idx + 2] = parseInt(rgba[3]);
          data[idx + 3] = Math.round(parseFloat(rgba[4]) * 255);
        }
      } else {
        const hex = color.replace("#", "");
        if (hex.length === 3) {
          data[idx] = parseInt(hex[0] + hex[0], 16);
          data[idx + 1] = parseInt(hex[1] + hex[1], 16);
          data[idx + 2] = parseInt(hex[2] + hex[2], 16);
          data[idx + 3] = 255;
        } else if (hex.length === 6) {
          data[idx] = parseInt(hex.substring(0, 2), 16);
          data[idx + 1] = parseInt(hex.substring(2, 4), 16);
          data[idx + 2] = parseInt(hex.substring(4, 6), 16);
          data[idx + 3] = 255;
        }
      }
    };
    const targetColor = getColorAt(x, y);
    if (!targetColor || colorsMatch(targetColor, fillColor)) return;

    const queue: [number, number][] = [[x, y]];
    const visited = new Uint8Array(canvasWidth * canvasHeight);
    let pixelsFilled = 0;

    while (queue.length > 0 && pixelsFilled < MAX_PIXELS) {
      const [cx, cy] = queue.shift()!;
      if (
        cx < 0 || cx >= canvasWidth ||
        cy < 0 || cy >= canvasHeight
      ) continue;
      const idx = cy * canvasWidth + cx;
      if (visited[idx]) continue;
      if (!colorsMatch(getColorAt(cx, cy), targetColor)) continue;
      setColorAt(cx, cy, fillColor);
      visited[idx] = 1;
      pixelsFilled++;
      queue.push([cx + 1, cy]);
      queue.push([cx - 1, cy]);
      queue.push([cx, cy + 1]);
      queue.push([cx, cy - 1]);
    }
    ctx.putImageData(imageData, 0, 0);
    saveCanvasState();
    if (pixelsFilled >= MAX_PIXELS) {
      toast.error("El área es demasiado grande para rellenar de una vez. Intenta en una zona más pequeña.");
    }
  };


  const getPixelColor = (x: number, y: number): string | null => {
    if (!canvasRef.current || !ctxRef.current) return null;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const index = (y * canvas.width + x) * 4;
    if (index < 0 || index >= data.length) return null;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const a = data[index + 3];
    return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
  };


  const setPixelColor = (x: number, y: number, color: string) => {
    if (!canvasRef.current || !ctxRef.current) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const index = (y * canvas.width + x) * 4;
    if (index < 0 || index >= data.length) return;


    if (color.startsWith("rgba")) {
      const rgba = color.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+(?:\.\d+)?)\)$/);
      if (rgba) {
        data[index] = parseInt(rgba[1]);
        data[index + 1] = parseInt(rgba[2]);
        data[index + 2] = parseInt(rgba[3]);
        data[index + 3] = Math.round(parseFloat(rgba[4]) * 255);
      }
    } else {
      const hex = color.replace("#", "");
      if (hex.length === 3) {
        const r = parseInt(hex[0] + hex[0], 16);
        const g = parseInt(hex[1] + hex[1], 16);
        const b = parseInt(hex[2] + hex[2], 16);
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 255;
      } else if (hex.length === 6) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        data[index] = r;
        data[index + 1] = g;
        data[index + 2] = b;
        data[index + 3] = 255;
      }
    }
  };


  const colorsMatch = (color1: string | null, color2: string): boolean => {
    if (!color1) return false;
    const rgba1 = color1.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);
    const rgba2 = color2.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);


    if (!rgba1 || !rgba2) return color1 === color2;


    const r1 = parseInt(rgba1[1]);
    const g1 = parseInt(rgba1[2]);
    const b1 = parseInt(rgba1[3]);
    const a1 = rgba1[4] ? Math.round(parseFloat(rgba1[4]) * 255) : 255;


    const r2 = parseInt(rgba2[1]);
    const g2 = parseInt(rgba2[2]);
    const b2 = parseInt(rgba2[3]);
    const a2 = rgba2[4] ? Math.round(parseFloat(rgba2[4]) * 255) : 255;


    return r1 === r2 && g1 === g2 && b1 === b2 && a1 === a2;
  };


  const saveAsImage = async () => {
    if (canvasRef.current) {
      setIsSaving(true);
      try {
        const dataUrl = canvasRef.current.toDataURL("image/png");
        
        if (typeof window !== "undefined") {
          const a = document.createElement("a");
          a.href = dataUrl;
          a.download = `kids-art-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          toast.success("Your masterpiece has been saved to your device!", {
            position: "top-center",
            style: {
              background: "#4CAF50",
              color: "white",
              borderRadius: "12px",
              padding: "16px",
              fontFamily: "'Comic Sans MS', cursive",
            },
          });
        }
      } catch (error) {
        console.error("Error saving image:", error);
        toast.error("Oops! Couldn't save your artwork. Try again?", {
          position: "top-center",
          style: {
            background: "#f44336",
            color: "white",
            borderRadius: "12px",
            padding: "16px",
            fontFamily: "'Comic Sans MS', cursive",
          },
        });
      } finally {
        setIsSaving(false);
      }
    }
  };


  const clearCanvas = () => {
    if (canvasRef.current && ctxRef.current) {
      const canvas = canvasRef.current;
      ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
      ctxRef.current.fillStyle = "white";
      ctxRef.current.fillRect(0, 0, canvas.width, canvas.height);
      saveCanvasState();
    }
  };


  const changeBackgroundGradient = (gradient: string) => {
    setIsGradientLoading(true);
    setTimeout(() => {
      setBackgroundGradient(gradient);
      setIsGradientLoading(false);
    }, 300);
  };


  const handleToolClick = (toolName: string) => {
    setTool(toolName);
    if (toolName === "undo") {
      undo();
    } else if (toolName === "redo") {
      redo();
    } else if (toolName === "save") {
      saveAsImage();
    } else if (toolName === "background") {
    }
  };


  const handleBrushSizeClick = (size: number) => {
    setBrushSize(size);
    setShowBrushSizeDropdown(false);
  };


  const handleEraserSizeClick = (size: number) => {
    setEraserSize(size);
    setShowEraserSizeDropdown(false);
  };


  const handleColorClick = (colorHex: string) => {
    setColor(colorHex);
    setShowColorPicker(false);
  };


  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (tool === "fill" && ctxRef.current) {
      const { x, y } = getPointerPosition(e);
      const fillColor = color === "rainbow" ? rainbowColors[0] : color;
      floodFill(Math.floor(x), Math.floor(y), fillColor);
    }
  };


  const handleDownloadClick = () => {
    saveAsImage();
  };


  const handleClearClick = () => {
    clearCanvas();
  };

  // --- MANEJO DE EVENTOS TOUCH MANUAL PARA MÓVIL ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handlers touch
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      startDrawing(e as any);
      handleCanvasClick(e as any);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      draw(e as any);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      stopDrawing(e as any);
    };
    const handleTouchCancel = (e: TouchEvent) => {
      e.preventDefault();
      stopDrawing(e as any);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchCancel, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [tool, color, brushSize, eraserSize, isDrawing]);

  // Inicia la selección
  const handleStartSelection = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (tool !== "background") return;
    let x = 0, y = 0;
    if ('touches' in e && e.touches.length > 0) {
      const rect = canvasRef.current!.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else if ('clientX' in e) {
      const rect = canvasRef.current!.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    setIsSelecting(true);
    setSelectionStart({x, y});
    setSelectionEnd({x, y});
  };

  // Actualiza la selección
  const handleMoveSelection = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isSelecting || !selectionStart) return;
    let x = 0, y = 0;
    if ('touches' in e && e.touches.length > 0) {
      const rect = canvasRef.current!.getBoundingClientRect();
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else if ('clientX' in e) {
      const rect = canvasRef.current!.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    setSelectionEnd({x, y});
  };

  // Finaliza la selección y muestra la previsualización
  const handleEndSelection = () => {
    if (!isSelecting || !selectionStart || !selectionEnd || !canvasRef.current) {
      setIsSelecting(false);
      return;
    }
    setIsSelecting(false);
    const x = Math.min(selectionStart.x, selectionEnd.x);
    const y = Math.min(selectionStart.y, selectionEnd.y);
    const w = Math.abs(selectionEnd.x - selectionStart.x);
    const h = Math.abs(selectionEnd.y - selectionStart.y);
    if (w < 5 || h < 5) return;
    const canvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = w;
    tempCanvas.height = h;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(canvas, x, y, w, h, 0, 0, w, h);
    setPreviewUrl(tempCanvas.toDataURL('image/png'));
  };

  const handleDownloadPreview = () => {
    if (!previewUrl) return;
    const a = document.createElement('a');
    a.href = previewUrl;
    a.download = `kids-art-capture-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setPreviewUrl(null);
  };

  const handleCancelPreview = () => setPreviewUrl(null);


  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ 
      background: backgroundGradient,
      // Fondo oscuro si está en dark mode
      ...(resolvedTheme === 'dark' ? { background: '#18181b' } : {}),
      transition: isGradientLoading ? "none" : "background 0.5s ease-in-out",
      fontFamily: "'Comic Sans MS', cursive",
    }}>
      <Toaster position="top-center" />
      
      {/* Gradient transition overlay */}
      {isGradientLoading && (
        <div className="absolute inset-0 z-0" style={{ 
          background: backgroundGradient,
          opacity: 0.5,
          transition: "opacity 0.3s ease-in-out",
        }}></div>
      )}
      
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 shadow-lg relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-4xl md:text-4xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center dark:bg-gradient-to-r dark:from-blue-300 dark:via-purple-300 dark:to-pink-300">
            <span className="mr-2">?</span> Kids' Art Studio
          </h1>
          <div className="flex items-center space-x-3">
            {/* Aquí estaba el botón de modo oscuro, ahora eliminado */}
            <button
              onClick={handleDownloadClick}
              className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-2 px-4 rounded-full flex items-center shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
              aria-label="Save your artwork"
              disabled={isSaving}
            >
              <span className="hidden md:inline-block">
                {isSaving ? (
                  <RefreshCw size={20} className="animate-spin mr-2" />
                ) : (
                  <Download size={20} className="mr-2" />
                )}
              </span>
              <span>{isSaving ? "Saving..." : "Save Art"}</span>
            </button>
            <button
              onClick={handleClearClick}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold py-2 px-4 rounded-full flex items-center shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
              aria-label="Clear canvas"
            >
              <span className="hidden md:inline-block">
                <RefreshCw size={20} className="mr-2" />
              </span>
              <span>New</span>
            </button>
          </div>
        </div>
      </header>


      <main className="flex-1 flex flex-col items-center justify-center p-4 relative">
        <div
          ref={containerRef}
          className="relative w-full max-w-7xl md:h-[calc(100vh-180px)] h-[56vh] rounded-3xl overflow-hidden shadow-2xl border-4 border-white/30 backdrop-blur-sm"
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full bg-white/90 rounded-2xl md:max-h-none max-h-[56vh]"
            onMouseDown={tool === "background" ? handleStartSelection : startDrawing}
            onMouseMove={tool === "background" ? handleMoveSelection : draw}
            onMouseUp={tool === "background" ? handleEndSelection : stopDrawing}
            onMouseLeave={tool === "background" ? handleEndSelection : stopDrawing}
            onTouchStart={tool === "background" ? handleStartSelection : undefined}
            onTouchMove={tool === "background" ? handleMoveSelection : undefined}
            onTouchEnd={tool === "background" ? handleEndSelection : undefined}
            onClick={handleCanvasClick}
            style={{ cursor: tool === "background" ? "crosshair" : tool === "paintbrush" ? "crosshair" : tool === "eraser" ? "cell" : "default" }}
          ></canvas>
          {/* Dibuja el recuadro de selección */}
          {isSelecting && selectionStart && selectionEnd && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(selectionStart.x, selectionEnd.x),
                top: Math.min(selectionStart.y, selectionEnd.y),
                width: Math.abs(selectionEnd.x - selectionStart.x),
                height: Math.abs(selectionEnd.y - selectionStart.y),
                border: '2px dashed #6366f1',
                background: 'rgba(99,102,241,0.1)',
                pointerEvents: 'none',
                zIndex: 20,
              }}
            />
          )}
          {/* Modal de previsualización */}
          {previewUrl && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-4 shadow-2xl flex flex-col items-center">
                <img src={previewUrl} alt="Preview" className="max-w-xs max-h-[60vh] rounded-lg border mb-4" />
                <div className="flex gap-4">
                  <button onClick={handleDownloadPreview} className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600">Guardar</button>
                  <button onClick={handleCancelPreview} className="bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-bold hover:bg-gray-400">Cancelar</button>
                </div>
              </div>
            </div>
          )}
          <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg flex items-center space-x-1">
            <ImageIcon size={16} className="text-gray-600" />
            <span className="text-xs text-gray-600">
              {canvasRef.current?.width || 800} × {canvasRef.current?.height || 600}
            </span>
          </div>
        </div>
      </main>


      <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md p-4 shadow-lg relative z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-10 h-10 rounded-full shadow-lg border-2 border-white outline-none focus:ring-2 focus:ring-blue-400 transition-transform duration-300 transform hover:scale-110 cursor-pointer"
                style={{ 
                  background: color === "rainbow" ? "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)" : color,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                aria-label="Select color"
                data-color-picker-toggle
              >
                {color === "rainbow" && (
                  <div style={{
                    position: 'absolute',
                    inset: '2px',
                    borderRadius: '50%',
                    background: 'white',
                    zIndex: 1
                  }}></div>
                )}
              </button>
              {showColorPicker && (
                <div 
                  ref={colorPickerRef}
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white/90 backdrop-blur-md rounded-xl shadow-xl p-3 grid grid-cols-4 sm:grid-cols-6 gap-2 w-64 sm:w-96 z-50 border border-gray-200"
                >
                  {colors.map((colorOption) => (
                    <div
                      key={colorOption.hex}
                      onClick={() => handleColorClick(colorOption.hex)}
                      className="w-8 h-8 rounded-full shadow-md cursor-pointer border-2 border-white hover:border-gray-300 transition-all duration-300 transform hover:scale-110 relative"
                      style={{ 
                        background: colorOption.hex === "rainbow" ? "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)" : colorOption.hex,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      title={colorOption.name}
                    >
                      {colorOption.hex === "rainbow" && (
                        <div style={{
                          position: 'absolute',
                          inset: '2px',
                          borderRadius: '50%',
                          background: 'white',
                          zIndex: 1
                        }}></div>
                      )}
                      {color === colorOption.hex && (
                        <div className="absolute inset-0 rounded-full border-2 border-white">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Selector de tamaño de pincel */}
            <div className="relative">
              <button
                onClick={() => setShowBrushSizeDropdown(!showBrushSizeDropdown)}
                className="bg-white rounded-full shadow-lg p-2 border-2 border-white outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300 transform hover:scale-110 flex items-center justify-center cursor-pointer"
                aria-label="Select brush size"
                data-brush-size-toggle
                style={{ width: '48px', height: '48px' }}
              >
                <Paintbrush size={32} className="text-gray-700" />
              </button>
              {showBrushSizeDropdown && (
                <div 
                  ref={brushSizeDropdownRef}
                  className="absolute bottom-full left-0 mb-2 bg-white/90 backdrop-blur-md rounded-xl shadow-xl p-2 w-48 z-50 border border-gray-200"
                >
                  <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-black">Brush Size</div>
                  {brushSizes.map((sizeOption) => (
                    <div
                      key={sizeOption.value}
                      onClick={() => handleBrushSizeClick(sizeOption.value)}
                      className={`flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-colors dark:text-black ${
                        brushSize === sizeOption.value ? "bg-blue-100 text-blue-700 dark:bg-blue-200" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-sm">{sizeOption.label}</span>
                      <Paintbrush size={sizeOption.value * 2} className="text-gray-700" />
                    </div>
                  ))}
                </div>
              )}
            </div>
            {/* Selector de tamaño de goma */}
            <div className="relative">
              <button
                onClick={() => setShowEraserSizeDropdown(!showEraserSizeDropdown)}
                className="bg-white rounded-full shadow-lg p-2 border-2 border-white outline-none focus:ring-2 focus:ring-red-400 transition-all duration-300 transform hover:scale-110 flex items-center justify-center cursor-pointer"
                aria-label="Select eraser size"
                data-eraser-size-toggle
                style={{ width: '48px', height: '48px' }}
              >
                <Eraser size={32} className="text-gray-700" />
              </button>
              {showEraserSizeDropdown && (
                <div 
                  ref={eraserSizeDropdownRef}
                  className="absolute bottom-full left-0 mb-2 bg-white/90 backdrop-blur-md rounded-xl shadow-xl p-2 w-48 z-50 border border-gray-200"
                >
                  <div className="text-xs font-semibold mb-2 text-gray-700 dark:text-black">Eraser Size</div>
                  {eraserSizes.map((sizeOption) => (
                    <div
                      key={sizeOption.value}
                      onClick={() => handleEraserSizeClick(sizeOption.value)}
                      className={`flex items-center justify-between py-1 px-2 rounded-lg cursor-pointer transition-colors dark:text-black ${
                        eraserSize === sizeOption.value ? "bg-red-100 text-red-700 dark:bg-red-200" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="text-sm">{sizeOption.label}</span>
                      <Eraser size={sizeOption.value / 2} className="text-gray-700" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            {tools.map((toolItem) => (
              <button
                key={toolItem.name}
                onClick={() => handleToolClick(toolItem.name)}
                className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 transform hover:scale-110 cursor-pointer ${
                  tool === toolItem.name
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white ring-2 ring-offset-2 ring-blue-500"
                    : "bg-white text-gray-600 border-2 border-white hover:border-gray-200"
                }`}
                aria-label={toolItem.name.charAt(0).toUpperCase() + toolItem.name.slice(1)}
              >
                {toolItem.icon}
              </button>
            ))}
          </div>
          
          {/* Eliminar este bloque: el segundo botón de selección de color a la derecha */}
          {/*
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-10 h-10 rounded-full shadow-lg border-2 border-white outline-none focus:ring-2 focus:ring-blue-400 transition-transform duration-300 transform hover:scale-110 cursor-pointer"
                style={{ 
                  background: color === "rainbow" ? "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)" : color,
                  position: 'relative',
                  overflow: 'hidden'
                }}
                aria-label="Select color"
                data-color-picker-toggle
              >
                {color === "rainbow" && (
                  <div style={{
                    position: 'absolute',
                    inset: '2px',
                    borderRadius: '50%',
                    background: 'white',
                    zIndex: 1
                  }}></div>
                )}
              </button>
              {showColorPicker && (
                <div 
                  ref={colorPickerRef}
                  className="absolute bottom-full right-0 mb-2 bg-white/90 backdrop-blur-md rounded-xl shadow-xl p-3 grid grid-cols-4 sm:grid-cols-6 gap-2 w-64 sm:w-96 z-50 border border-gray-200"
                >
                  {colors.map((colorOption) => (
                    <div
                      key={colorOption.hex}
                      onClick={() => handleColorClick(colorOption.hex)}
                      className="w-8 h-8 rounded-full shadow-md cursor-pointer border-2 border-white hover:border-gray-300 transition-all duration-300 transform hover:scale-110 relative"
                      style={{ 
                        background: colorOption.hex === "rainbow" ? "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)" : colorOption.hex,
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      title={colorOption.name}
                    >
                      {colorOption.hex === "rainbow" && (
                        <div style={{
                          position: 'absolute',
                          inset: '2px',
                          borderRadius: '50%',
                          background: 'white',
                          zIndex: 1
                        }}></div>
                      )}
                      {color === colorOption.hex && (
                        <div className="absolute inset-0 rounded-full border-2 border-white">
                          <Check size={14} className="text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          */}
        </div>
      </footer>
    </div>
  );
};


const Check = ({ size, className }: { size: number; className: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);


export default Index;
// Zod Schema
export const Schema = {
    "commentary": "",
    "template": "nextjs-developer",
    "title": "",
    "description": "",
    "additional_dependencies": [],
    "has_additional_dependencies": false,
    "install_dependencies_command": "",
    "port": 3000,
    "file_path": "pages/index.tsx",
    "code": "<see code above>"
}
