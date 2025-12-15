'use client';

import { motion } from 'motion/react';
import { 
  Eraser, 
  Maximize2, 
  ZoomIn, 
  ImageOff, 
  Sparkles, 
  Layers,
  Sun,
  Image as ImageIcon,
  Wand2,
  Focus
} from 'lucide-react';

export type QuickAction = 
  | 'background_remove'
  | 'background_blur'
  | 'background_replace'
  | 'image_expand'
  | 'image_upscale'
  | 'erase_element'
  | 'hdr_enhance';

interface QuickActionsPanelProps {
  onAction: (action: QuickAction, params?: Record<string, unknown>) => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

const QUICK_ACTIONS = [
  {
    id: 'background_remove' as QuickAction,
    label: 'Remove BG',
    description: 'Remove background (transparent)',
    icon: ImageOff,
    color: 'from-red-500 to-pink-500',
  },
  {
    id: 'background_blur' as QuickAction,
    label: 'Blur BG',
    description: 'Add depth-of-field blur',
    icon: Focus,
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'background_replace' as QuickAction,
    label: 'Replace BG',
    description: 'Generate new background',
    icon: Layers,
    color: 'from-purple-500 to-indigo-500',
  },
  {
    id: 'image_expand' as QuickAction,
    label: 'Expand',
    description: 'Extend image boundaries',
    icon: Maximize2,
    color: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'image_upscale' as QuickAction,
    label: 'Upscale 2x',
    description: 'Increase resolution',
    icon: ZoomIn,
    color: 'from-orange-500 to-amber-500',
  },
  {
    id: 'erase_element' as QuickAction,
    label: 'Erase',
    description: 'Remove & fill marked area',
    icon: Eraser,
    color: 'from-rose-500 to-red-500',
  },
];

export default function QuickActionsPanel({ onAction, disabled, isProcessing }: QuickActionsPanelProps) {
  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="w-4 h-4 text-violet-500" />
        <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
      </div>
      
      <p className="text-xs text-gray-500 mb-3">
        One-click AI enhancements powered by Bria FIBO
      </p>

      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <motion.button
              key={action.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onAction(action.id)}
              disabled={disabled || isProcessing}
              className={`
                relative group p-3 rounded-xl border border-gray-200 
                bg-white hover:bg-gray-50 
                transition-all duration-200
                text-left
                ${disabled || isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:border-gray-300'}
              `}
            >
              <div className={`
                w-8 h-8 rounded-lg bg-gradient-to-br ${action.color}
                flex items-center justify-center mb-2
                shadow-sm
              `}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              
              <p className="text-sm font-medium text-gray-900">{action.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
              
              {/* Hover glow effect */}
              <div className={`
                absolute inset-0 rounded-xl bg-gradient-to-br ${action.color} 
                opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none
              `} />
            </motion.button>
          );
        })}
      </div>

      {/* HDR/Quality Settings */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Sun className="w-4 h-4 text-amber-500" />
          <h4 className="text-sm font-medium text-gray-900">Output Quality</h4>
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center justify-between p-2 rounded-lg bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-sm text-gray-700">HDR Mode</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
              16-bit
            </span>
          </label>
          
          <p className="text-xs text-gray-500 px-2">
            Enhanced dynamic range and color depth for professional output
          </p>
        </div>
      </div>

      {/* Pro tip */}
      <div className="mt-4 p-3 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100">
        <p className="text-xs text-violet-700">
          💡 <strong>Pro tip:</strong> Use "Erase" after drawing on unwanted objects to remove them seamlessly.
        </p>
      </div>
    </div>
  );
}
