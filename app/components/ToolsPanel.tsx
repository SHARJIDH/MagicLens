'use client';

import React, { ReactNode } from 'react';

export type Tool = 'select' | 'brush' | 'eraser' | 'fill' | 'pan' | 'zoom';

interface ToolsPanelProps {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  brushColor: string;
  onBrushColorChange: (color: string) => void;
  brushOpacity: number;
  onBrushOpacityChange: (opacity: number) => void;
  onClearMask: () => void;
  hasMask: boolean;
  disabled?: boolean;
}

const MASK_COLORS = [
  { color: '#FF6B6B', name: 'Red' },
  { color: '#4ECDC4', name: 'Teal' },
  { color: '#45B7D1', name: 'Blue' },
  { color: '#96CEB4', name: 'Green' },
  { color: '#FFEAA7', name: 'Yellow' },
  { color: '#DDA0DD', name: 'Purple' },
  { color: '#FF8C00', name: 'Orange' },
  { color: '#00CED1', name: 'Cyan' },
];

const TOOLS: { id: Tool; name: string; icon: ReactNode; shortcut: string }[] = [
  {
    id: 'select',
    name: 'Select',
    shortcut: 'V',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
  },
  {
    id: 'brush',
    name: 'Brush',
    shortcut: 'B',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    ),
  },
  {
    id: 'eraser',
    name: 'Eraser',
    shortcut: 'E',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  },
  {
    id: 'fill',
    name: 'Fill',
    shortcut: 'G',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'pan',
    name: 'Pan',
    shortcut: 'H',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
      </svg>
    ),
  },
];

export default function ToolsPanel({
  activeTool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
  brushColor,
  onBrushColorChange,
  brushOpacity,
  onBrushOpacityChange,
  onClearMask,
  hasMask,
  disabled,
}: ToolsPanelProps) {
  return (
    <div className="p-4 space-y-6">
      {/* Tools Grid */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tools</h3>
        <div className="grid grid-cols-3 gap-2">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onToolChange(tool.id)}
              disabled={disabled}
              title={`${tool.name} (${tool.shortcut})`}
              className={`
                flex flex-col items-center gap-1 p-3 rounded-xl transition-all border
                ${activeTool === tool.id
                  ? 'bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/25'
                  : 'bg-white text-gray-600 hover:bg-violet-50 hover:text-violet-600 border-gray-200'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              {tool.icon}
              <span className="text-xs font-medium">{tool.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Brush Settings */}
      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Brush Settings</h3>
          
          {/* Brush Size */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Size</label>
              <span className="text-xs text-gray-500">{brushSize}px</span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
            {/* Size Preview */}
            <div className="flex items-center justify-center py-2">
              <div
                className="rounded-full transition-all"
                style={{
                  width: Math.min(brushSize, 60),
                  height: Math.min(brushSize, 60),
                  backgroundColor: activeTool === 'eraser' ? '#999' : brushColor,
                  opacity: brushOpacity / 100,
                }}
              />
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Opacity</label>
              <span className="text-xs text-gray-500">{brushOpacity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={brushOpacity}
              onChange={(e) => onBrushOpacityChange(Number(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
            />
          </div>

          {/* Mask Color (only for brush) */}
          {activeTool === 'brush' && (
            <div className="space-y-2">
              <label className="text-sm text-gray-700">Mask Color</label>
              <div className="grid grid-cols-4 gap-2">
                {MASK_COLORS.map(({ color, name }) => (
                  <button
                    key={color}
                    onClick={() => onBrushColorChange(color)}
                    disabled={disabled}
                    title={name}
                    className={`
                      w-full aspect-square rounded-lg transition-all
                      ${brushColor === color ? 'ring-2 ring-violet-600 ring-offset-2 ring-offset-white' : ''}
                      ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}
                    `}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clear Mask */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={onClearMask}
          disabled={disabled || !hasMask}
          className={`
            w-full py-2.5 px-4 rounded-xl text-sm font-medium transition-all
            ${hasMask && !disabled
              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Clear All Masks
        </button>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="pt-4 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Shortcuts</h3>
        <div className="space-y-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>[ / ]</span>
            <span>Brush size</span>
          </div>
          <div className="flex justify-between">
            <span>Ctrl + Z</span>
            <span>Undo</span>
          </div>
          <div className="flex justify-between">
            <span>Ctrl + Shift + Z</span>
            <span>Redo</span>
          </div>
        </div>
      </div>
    </div>
  );
}
