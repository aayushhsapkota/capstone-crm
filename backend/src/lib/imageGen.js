import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../uploads');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateBusinessImage(businessName, specialisation) {
  const prompt = `Professional hero image for a ${specialisation || 'business'} company called "${businessName}". Clean, modern, high quality.`;

  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: { numberOfImages: 1, outputMimeType: 'image/jpeg' },
  });

  const imageData = response.generatedImages[0].image.imageBytes;
  const filename = `${Date.now()}-${businessName.replace(/\s+/g, '-').toLowerCase()}.jpg`;
  const filePath = path.join(uploadsDir, filename);

  fs.writeFileSync(filePath, Buffer.from(imageData, 'base64'));

  return `/uploads/${filename}`;
}
