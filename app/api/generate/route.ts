import { NextRequest, NextResponse } from 'next/server';
import { FIBOParams, GenerateResponse, OperationType } from '../../lib/types';
import { 
  generateImage,
  removeBackground,
  blurBackground,
  replaceBackground,
  expandImage,
  upscaleImage,
  eraseElements,
  enhanceImage
} from '../../lib/bria';

/**
 * Image Generation API Route
 * 
 * Accepts image, mask, operation type, and FIBO JSON parameters.
 * Routes to correct Bria endpoint based on operation:
 * - inpaint_remove, inpaint_replace, inpaint_add → /gen_fill (requires mask)
 * - generate_new, style_transfer → /image/generate
 * - camera_adjust → /image/generate with camera params
 * - background_remove → /background/remove
 * - background_blur → /background/blur
 * - background_replace → /background/replace
 * - image_expand → /image/expand
 * - image_upscale → /image/increase_resolution
 * - erase_element → /eraser
 */

interface GenerateRequestBody {
  image: string;              // Base64 data URL or raw base64
  secondImage?: string;       // Second image for combine operation
  mask?: string;              // Base64 mask (white = edit region)
  params: FIBOParams;
  prompt?: string;            // Text prompt for the operation
  operation?: OperationType;  // Detected operation type from agent
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequestBody = await request.json();
    const { image, secondImage, mask, params, prompt, operation } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    if (!params) {
      return NextResponse.json(
        { error: 'FIBO parameters are required' },
        { status: 400 }
      );
    }

    // Get API token from environment
    const apiToken = process.env.BRIA_API_TOKEN;

    console.log('[Generate] Operation:', operation);
    console.log('[Generate] Has mask:', !!mask);
    console.log('[Generate] Prompt:', prompt);

    let result: GenerateResponse;

    // Route to the appropriate Bria API based on operation type
    switch (operation) {
      case 'background_remove':
        console.log('[Generate] Using background removal API');
        result = await removeBackground(image, apiToken);
        break;

      case 'background_blur':
        console.log('[Generate] Using background blur API');
        const blurIntensity = params.blur_intensity || 50;
        result = await blurBackground(image, blurIntensity, apiToken);
        break;

      case 'background_replace':
        console.log('[Generate] Using background replace API');
        const bgPrompt = params.new_background || prompt || 'professional studio background';
        result = await replaceBackground(image, bgPrompt, apiToken);
        break;

      case 'image_expand':
        console.log('[Generate] Using image expansion API');
        const expandDir = params.expand_direction || 'all';
        const expandAmt = params.expand_amount || 25;
        result = await expandImage(image, expandDir, expandAmt, prompt, apiToken);
        break;

      case 'image_upscale':
        console.log('[Generate] Using image upscale API');
        const scaleFactor = params.upscale_factor || 2;
        result = await upscaleImage(image, scaleFactor, apiToken);
        break;

      case 'hdr_enhance':
        console.log('[Generate] Using enhance API for HDR quality');
        const resolution = params.hdr_resolution || '2MP';
        result = await enhanceImage(image, resolution, apiToken);
        break;

      case 'erase_element':
        if (!mask) {
          return NextResponse.json(
            { error: 'Please draw on the element you want to erase first!', needsMask: true },
            { status: 400 }
          );
        }
        console.log('[Generate] Using eraser API');
        result = await eraseElements(image, mask, apiToken);
        break;

      case 'inpaint_remove':
      case 'inpaint_replace':
      case 'inpaint_add':
        // These operations require a mask
        if (!mask) {
          return NextResponse.json(
            { 
              error: 'Please draw on the area you want to edit first! Use the brush tool to mark the region, then try again.',
              needsMask: true 
            },
            { status: 400 }
          );
        }
        // Fall through to default generation with mask
        
      default:
        // Standard generation with gen_fill (if mask) or text-to-image
        let effectivePrompt = prompt || '';
        
        if (operation === 'inpaint_remove') {
          effectivePrompt = prompt || 'empty, background continues naturally';
        } else if (!effectivePrompt) {
          effectivePrompt = buildPromptFromParams(params);
        }

        result = await generateImage(
          image,
          mask,
          params,
          effectivePrompt,
          apiToken
        );
        break;
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Generate API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate image' },
      { status: 500 }
    );
  }
}

/**
 * Extract base64 string from data URL or return as-is
 */
function extractBase64(input: string): string {
  if (input.startsWith('data:')) {
    return input.split(',')[1] || input;
  }
  return input;
}

/**
 * Build a text prompt from FIBO parameters for better results
 */
function buildPromptFromParams(params: FIBOParams): string {
  const parts: string[] = [];

  // Add subject description
  if (params.subject_description) {
    parts.push(params.subject_description);
  }

  // Add lighting description
  const lightingMap: Record<string, string> = {
    'studio_soft': 'soft studio lighting',
    'natural_daylight': 'natural daylight',
    'dramatic_side': 'dramatic side lighting',
    'backlit': 'backlit with rim lighting',
    'overcast': 'soft overcast lighting',
    'neon': 'colorful neon lighting',
    'candlelight': 'warm candlelight'
  };
  if (params.lighting && lightingMap[params.lighting]) {
    parts.push(lightingMap[params.lighting]);
  }

  // Add color palette
  if (params.color_palette) {
    parts.push(`${params.color_palette} color palette`);
  }

  // Add camera info if non-default
  if (params.camera) {
    if (Math.abs(params.camera.yaw) > 15) {
      parts.push(`camera rotated ${params.camera.yaw > 0 ? 'right' : 'left'}`);
    }
    if (Math.abs(params.camera.pitch) > 15) {
      parts.push(`${params.camera.pitch > 0 ? 'high' : 'low'} angle shot`);
    }
    if (params.camera.fov < 30) {
      parts.push('telephoto lens, shallow depth of field');
    } else if (params.camera.fov > 60) {
      parts.push('wide angle lens');
    }
  }

  // Add composition
  const compositionMap: Record<string, string> = {
    'centered': 'centered composition',
    'rule_of_thirds': 'rule of thirds composition',
    'golden_ratio': 'golden ratio composition',
    'symmetrical': 'symmetrical composition',
    'dynamic': 'dynamic composition'
  };
  if (params.composition && compositionMap[params.composition]) {
    parts.push(compositionMap[params.composition]);
  }

  // Add quality/realism
  if (params.realism_level === 'high') {
    parts.push('photorealistic, highly detailed');
  } else if (params.realism_level === 'stylized') {
    parts.push('stylized, artistic');
  }

  // Add HDR if specified
  if (params.output_format === 'hdr_16bit') {
    parts.push('HDR, high dynamic range');
  }

  return parts.join(', ') || 'A professional photograph';
}

/**
 * Example FIBO Request Payload
 * 
 * This shows what gets sent to Bria's API:
 * 
 * {
 *   "images": ["base64_encoded_image_without_prefix"],
 *   "prompt": "add flowers in the garden, soft studio lighting, warm color palette, centered composition, photorealistic, HDR",
 *   "structured_prompt": "{\"short_description\":\"A professional photograph with flowers\",\"lighting\":{\"type\":\"soft studio lighting\"},\"aesthetics\":{\"composition\":\"centered\",\"color_scheme\":\"warm\"}}",
 *   "model_version": "FIBO",
 *   "sync": true,
 *   "guidance_scale": 4,
 *   "steps_num": 40,
 *   "aspect_ratio": "1:1"
 * }
 */
