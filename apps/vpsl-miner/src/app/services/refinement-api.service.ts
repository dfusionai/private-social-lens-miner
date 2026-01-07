import { inject, Injectable } from '@angular/core';
import { AppConfigService } from './app-config.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface RefineResponse {
  add_refinement_tx_hash: string;
}

@Injectable({
  providedIn: 'root',
})
export class RefinementApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly http: HttpClient = inject(HttpClient);

  private get relayBaseUrl(): string {
    return this.appConfigService.relayApi?.baseUrl || '';
  }

  /**
   * Call the refinement API via the relay backend.
   * The relay backend handles the refinement service URL and PINATA_API_JWT.
   *
   * @param fileId ID of the file in Data Registry
   * @param encryptionKey Original encryption key
   * @returns Promise with transaction hash of addRefinementWithPermission
   */
  public async callRefinementService(
    fileId: number,
    encryptionKey: string,
  ): Promise<RefineResponse> {
    if (!this.relayBaseUrl) {
      throw new Error('Relay API URL not configured');
    }

    const requestBody = {
      fileId,
      encryptionKey,
    };

    try {
      return await firstValueFrom(
        this.http.post<RefineResponse>(
          `${this.relayBaseUrl}/api/relay/refinement`,
          requestBody,
        ),
      );
    } catch (error) {
      console.error('Error calling refinement service:', error);
      throw new Error('Failed to process data refinement. Please try again.');
    }
  }
}
