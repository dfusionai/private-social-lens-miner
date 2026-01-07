import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from './app-config.service';

interface StorageUploadResponse {
  url: string;
  ipfsHash: string;
  size: number;
}

@Injectable({
  providedIn: 'root',
})
export class PinataApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly http: HttpClient = inject(HttpClient);

  private get relayBaseUrl(): string {
    return this.appConfigService.relayApi?.baseUrl || '';
  }

  /**
   * Upload encrypted file to IPFS storage via the relay backend.
   * The relay backend handles the actual Pinata upload.
   *
   * @param encryptedData - The encrypted file to upload
   * @returns The public URL to the uploaded file
   */
  public async uploadFileToPinata(encryptedData: File | Blob): Promise<string> {
    if (!this.relayBaseUrl) {
      throw new Error('Relay API URL not configured');
    }

    const formData = new FormData();
    formData.append('file', encryptedData, 'encrypted-data');

    try {
      const response = await firstValueFrom(
        this.http.post<StorageUploadResponse>(
          `${this.relayBaseUrl}/api/relay/offchain-storage`,
          formData
        )
      );

      if (!response?.url) {
        throw new Error('No URL returned from storage service');
      }

      return response.url;
    } catch (error) {
      console.error('Storage upload failed', error);
      throw new Error(
        'Failed to upload encrypted data to off-chain storage. Please try again.'
      );
    }
  }
}
