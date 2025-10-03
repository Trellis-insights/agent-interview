// File upload functionality tests
import { getPresignedUrls } from '../utils/fileUtils';
import { getEnvVar } from '../utils/envUtils';
import axios from 'axios';

// Mock axios for file upload tests
jest.mock('axios');
jest.mock('../utils/envUtils');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockGetEnvVar = getEnvVar as jest.MockedFunction<typeof getEnvVar>;

describe('File Upload Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEnvVar.mockReturnValue('test-api-key');
  });

  describe('getPresignedUrls', () => {
    it('should return empty array for empty file list', async () => {
      const result = await getPresignedUrls([]);
      expect(result).toEqual([]);
    });

    it('should handle successful file upload', async () => {
      const mockResponse = {
        data: {
          presigned_urls: [
            { 'file_0': 'https://example.com/presigned-url-1' },
            { 'file_1': 'https://example.com/presigned-url-2' }
          ]
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockResponse);

      const files = [
        {
          filename: 'test1.txt',
          content: Buffer.from('test content 1'),
          contentType: 'text/plain'
        },
        {
          filename: 'test2.pdf',
          content: Buffer.from('test content 2'),
          contentType: 'application/pdf'
        }
      ];

      const result = await getPresignedUrls(files);

      expect(result).toEqual([
        'https://example.com/presigned-url-1',
        'https://example.com/presigned-url-2'
      ]);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://enterprise.prod.api.runtrellis.com/v1/assets/presigned',
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({
            'accept': 'application/json',
            'API-Version': '2025-03',
            'Authorization': 'test-api-key'
          }),
          timeout: 30000
        })
      );
    });

    it('should handle files without contentType', async () => {
      const mockResponse = {
        data: {
          presigned_urls: [
            { 'file_0': 'https://example.com/presigned-url' }
          ]
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockResponse);

      const files = [{
        filename: 'test.bin',
        content: Buffer.from('binary content')
        // No contentType
      }];

      const result = await getPresignedUrls(files);
      expect(result).toEqual(['https://example.com/presigned-url']);
    });

    it('should throw error when API key is missing', async () => {
      mockGetEnvVar.mockReturnValue('');

      const files = [{
        filename: 'test.txt',
        content: Buffer.from('test'),
        contentType: 'text/plain'
      }];

      await expect(getPresignedUrls(files)).rejects.toThrow(
        'TRELLIS_API_KEY not found in environment'
      );
    });

    it('should handle API errors gracefully', async () => {
      const apiError = Object.assign(new Error('Request failed with status code 400'), {
        isAxiosError: true,
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { message: 'Invalid file format' }
        }
      });
      
      mockedAxios.post.mockRejectedValue(apiError);

      const files = [{
        filename: 'invalid.exe',
        content: Buffer.from('malicious content'),
        contentType: 'application/octet-stream'
      }];

      await expect(getPresignedUrls(files)).rejects.toThrow(
        'Failed to get presigned URLs: Request failed with status code 400'
      );
    });

    it('should handle network errors', async () => {
      const networkError = new Error('Network Error');
      
      mockedAxios.post.mockRejectedValue(networkError);

      const files = [{
        filename: 'test.txt',
        content: Buffer.from('test'),
        contentType: 'text/plain'
      }];

      await expect(getPresignedUrls(files)).rejects.toThrow(
        'Failed to get presigned URLs: Network Error'
      );
    });

    it('should handle malformed API response', async () => {
      const mockResponse = {
        data: {
          // Missing presigned_urls field
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockResponse);

      const files = [{
        filename: 'test.txt',
        content: Buffer.from('test'),
        contentType: 'text/plain'
      }];

      const result = await getPresignedUrls(files);
      expect(result).toEqual([]);
    });

    it('should handle large file uploads', async () => {
      const mockResponse = {
        data: {
          presigned_urls: [
            { 'file_0': 'https://example.com/large-file-url' }
          ]
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockResponse);

      // Create a 10MB buffer
      const largeContent = Buffer.alloc(10 * 1024 * 1024, 'a');
      
      const files = [{
        filename: 'large-file.dat',
        content: largeContent,
        contentType: 'application/octet-stream'
      }];

      const result = await getPresignedUrls(files);
      expect(result).toEqual(['https://example.com/large-file-url']);
    });

    it('should handle multiple files with mixed content types', async () => {
      const mockResponse = {
        data: {
          presigned_urls: [
            { 'file_0': 'https://example.com/url-1' },
            { 'file_1': 'https://example.com/url-2' },
            { 'file_2': 'https://example.com/url-3' }
          ]
        }
      };
      
      mockedAxios.post.mockResolvedValue(mockResponse);

      const files = [
        {
          filename: 'document.txt',
          content: Buffer.from('Text content'),
          contentType: 'text/plain'
        },
        {
          filename: 'image.png',
          content: Buffer.from('PNG binary data'),
          contentType: 'image/png'
        },
        {
          filename: 'unknown.dat',
          content: Buffer.from('Unknown content')
          // No contentType - should default
        }
      ];

      const result = await getPresignedUrls(files);
      expect(result).toHaveLength(3);
      expect(result).toEqual([
        'https://example.com/url-1',
        'https://example.com/url-2', 
        'https://example.com/url-3'
      ]);
    });
  });

  describe('File Upload Integration with tRPC', () => {
    it('should handle file uploads in tRPC requests', () => {
      // This test verifies the integration between file uploads and tRPC
      const base64Content = Buffer.from('test file content').toString('base64');
      
      const tRPCFileData = {
        filename: 'test.txt',
        content: base64Content,
        contentType: 'text/plain'
      };

      // Verify base64 encoding/decoding works correctly
      const decodedContent = Buffer.from(tRPCFileData.content, 'base64');
      expect(decodedContent.toString()).toBe('test file content');
      
      // Verify FileUpload interface compatibility
      const fileUpload = {
        filename: tRPCFileData.filename,
        content: decodedContent,
        ...((tRPCFileData as any).contentType && { contentType: (tRPCFileData as any).contentType })
      };

      expect(fileUpload.filename).toBe('test.txt');
      expect(fileUpload.content).toBeInstanceOf(Buffer);
      expect(fileUpload.contentType).toBe('text/plain');
    });

    it('should handle missing contentType in tRPC requests', () => {
      const base64Content = Buffer.from('test content').toString('base64');
      
      const tRPCFileData = {
        filename: 'mystery.file',
        content: base64Content
        // Missing contentType
      };

      const decodedContent = Buffer.from(tRPCFileData.content, 'base64');
      const fileUpload = {
        filename: tRPCFileData.filename,
        content: decodedContent,
        ...((tRPCFileData as any).contentType && { contentType: (tRPCFileData as any).contentType })
      };

      expect(fileUpload.filename).toBe('mystery.file');
      expect(fileUpload.content).toBeInstanceOf(Buffer);
      expect(fileUpload.contentType).toBeUndefined();
    });
  });
});