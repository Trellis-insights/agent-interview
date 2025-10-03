// File utility functions - TypeScript translation of utils.py
import axios from 'axios';
import { getEnvVar } from './envUtils';

export interface FileUpload {
  filename: string;
  content: Buffer;
  contentType?: string;
}

/**
 * Get presigned URLs for uploaded files
 * @param files - Array of file upload objects
 * @returns Array of presigned URLs
 * @throws Error if API key not found or request fails
 */
export async function getPresignedUrls(files: FileUpload[]): Promise<string[]> {
  if (!files || files.length === 0) {
    return [];
  }
  
  const apiKey = getEnvVar('TRELLIS_API_KEY');
  if (!apiKey) {
    throw new Error('TRELLIS_API_KEY not found in environment');
  }
  
  const url = 'https://enterprise.prod.api.runtrellis.com/v1/assets/presigned';
  const headers = {
    'accept': 'application/json',
    'API-Version': '2025-03',
    'Authorization': apiKey
  };
  
  // Prepare form data
  const formData = new FormData();
  
  files.forEach((file, index) => {
    const blob = new Blob([file.content], { type: file.contentType || 'application/octet-stream' });
    formData.append('files', blob, file.filename);
    formData.append('ids', `file_${index}`);
  });
  
  try {
    const response = await axios.post(url, formData, {
      headers,
      timeout: 30000 // 30 second timeout
    });
    
    const result = response.data;
    const presignedUrls: string[] = [];
    
    // Extract URLs from the response structure
    const urlsData = result.presigned_urls || [];
    for (const urlDict of urlsData) {
      for (const [_, url] of Object.entries(urlDict)) {
        if (typeof url === 'string') {
          presignedUrls.push(url);
        }
      }
    }
    
    return presignedUrls;
    
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status;
      const statusText = error.response?.statusText;
      const responseData = error.response?.data;
      
      throw new Error(
        `Failed to get presigned URLs: ${statusCode} ${statusText}. ${
          responseData?.message || error.message
        }`
      );
    }
    
    throw new Error(`Failed to get presigned URLs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}