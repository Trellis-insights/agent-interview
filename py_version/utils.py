from typing import List
from fastapi import UploadFile
import httpx
import os
from dotenv import load_dotenv

load_dotenv('.env.local')


async def get_presigned_urls(files: List[UploadFile]) -> List[str]:
    """Get presigned URLs for uploaded files"""
    if not files:
        return []
    
    api_key = os.getenv('TRELLIS_API_KEY')
    if not api_key:
        raise ValueError("TRELLIS_API_KEY not found in environment")
    
    url = "https://enterprise.prod.api.runtrellis.com/v1/assets/presigned"
    headers = {
        'accept': 'application/json',
        'API-Version': '2025-03',
        'Authorization': api_key
    }
    
    # Prepare form data
    files_data = []
    ids_data = []
    
    for i, file in enumerate(files):
        file_content = await file.read()
        await file.seek(0)  # Reset file pointer
        
        files_data.append(('files', (file.filename, file_content, file.content_type)))
        ids_data.append(('ids', f'file_{i}'))
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            url,
            headers=headers,
            files=files_data,
            data=dict(ids_data)
        )
        response.raise_for_status()
        
        result = response.json()
        presigned_urls = []
        
        # Extract URLs from the response structure
        for url_dict in result.get('presigned_urls', []):
            for _, url in url_dict.items():
                presigned_urls.append(url)
        
        return presigned_urls