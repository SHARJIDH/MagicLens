// FIBO JSON Schema Types
// These types define the structured parameters for Bria FIBO's JSON-native control

export interface CameraParams {
  yaw: number;      // Horizontal rotation (-180 to 180)
  pitch: number;    // Vertical rotation (-90 to 90)
  roll: number;     // Tilt rotation (-180 to 180)
  fov: number;      // Field of view (10 to 120)
}

export interface FIBOParams {
  camera: CameraParams;
  lighting: string;           // e.g., "studio_soft", "natural_daylight", "dramatic_side"
  color_palette?: string;     // e.g., "warm", "cool", "vibrant", "muted"
  composition: string;        // e.g., "centered", "rule_of_thirds", "golden_ratio"
  edit_mode?: string;         // "mask" when user draws a region, "full" for full image
  subject_description?: string; // Description of what to add/change
  realism_level: string;      // "high", "medium", "stylized"
  output_format: string;      // "hdr_16bit", "sdr_8bit", "png", "jpeg"
  // HDR/16-bit settings
  hdr_enabled?: boolean;      // Enable HDR output
  bit_depth?: '8bit' | '16bit'; // Color depth
  // Image expansion settings
  expand_direction?: 'left' | 'right' | 'up' | 'down' | 'all';
  expand_amount?: number;     // Percentage to expand (10-100)
  // Upscale settings
  upscale_factor?: 2 | 4;     // Upscale multiplier
  // HDR enhance settings
  hdr_resolution?: '1MP' | '2MP' | '4MP';  // Target resolution for HDR enhance
  // Background settings
  blur_intensity?: number;    // Background blur intensity (0-100)
  new_background?: string;    // Prompt for new background
}

// Default state for new sessions
export const DEFAULT_FIBO_PARAMS: FIBOParams = {
  camera: { yaw: 0, pitch: 0, roll: 0, fov: 40 },
  lighting: "studio_soft",
  composition: "centered",
  realism_level: "high",
  output_format: "hdr_16bit",
  hdr_enabled: true,
  bit_depth: '16bit'
};

// Bria FIBO API structured prompt format
export interface BriaStructuredPrompt {
  short_description: string;
  objects?: Array<{
    description: string;
    location?: string;
    relative_size?: string;
    shape_and_color?: string;
  }>;
  background_setting?: string;
  lighting?: {
    type: string;
    direction?: string;
    shadows?: string;
  };
  aesthetics?: {
    composition?: string;
    color_scheme?: string;
    mood_atmosphere?: string;
  };
  photographic_characteristics?: {
    depth_of_field?: string;
    focus?: string;
    camera_angle?: string;
    lens_focal_length?: string;
  };
  style_medium?: string;
}

// API Request/Response types
export interface AgentRequest {
  userMessage: string;
  currentParams: FIBOParams;
  hasMask?: boolean;
}

// Operation types detected by the agent
export type OperationType = 
  | 'inpaint_remove'      // Remove something from masked area
  | 'inpaint_replace'     // Replace something in masked area
  | 'inpaint_add'         // Add something to masked area
  | 'style_transfer'      // Change style/mood of whole image
  | 'generate_new'        // Generate completely new image
  | 'camera_adjust'       // Only camera/composition changes
  | 'background_remove'   // Remove background (transparent)
  | 'background_blur'     // Blur background (depth of field)
  | 'background_replace'  // Replace background with new one
  | 'image_expand'        // Expand image boundaries (outpainting)
  | 'image_upscale'       // Increase resolution
  | 'hdr_enhance'         // HDR/AI enhance image quality
  | 'erase_element'       // Erase and fill with background
  | 'combine_images';     // Combine two images

export interface AgentResponse {
  operation?: OperationType;  // Detected operation type
  needsMask?: boolean;        // True if operation requires mask but none provided
  params: FIBOParams;
  prompt?: string;            // Generated prompt for the operation
  response?: string;          // User-friendly message
  structuredPrompt?: BriaStructuredPrompt;
}

export interface GenerateRequest {
  image: string;        // Base64 encoded image
  mask?: string;        // Base64 encoded mask (white = edit region)
  params: FIBOParams;
  prompt?: string;      // Optional text prompt
}

export interface GenerateResponse {
  imageUrl: string;
  seed?: number;
  structuredPrompt?: string;
}

// App state types
export interface EditorState {
  originalImage: string | null;
  maskData: string | null;
  params: FIBOParams;
  generatedImage: string | null;
  isGenerating: boolean;
  isProcessingAgent: boolean;
  error: string | null;
}
