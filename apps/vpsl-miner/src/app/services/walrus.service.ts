import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppConfigService } from './app-config.service';
import { firstValueFrom } from 'rxjs';

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      storedEpoch: number;
      blobId: string;
      size: number;
      erasureCodeType: string;
      certifiedEpoch: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
    };
    resourceOperation: {
      RegisterFromScratch?: any;
      Extend?: any;
    };
  };
  alreadyCertified?: {
    blobId: string;
    event: {
      txDigest: string;
      eventSeq: string;
    };
    endEpoch: number;
  };
}

export interface WalrusUploadRelayResponse {
  id: string;
  blobId: string;
  blobObject: {
    id: {
      id: string;
    };
    registered_epoch: number;
    blob_id: string;
    size: string;
    encoding_type: number;
    certified_epoch: number | null;
    storage: {
      id: {
        id: string;
      };
      start_epoch: number;
      end_epoch: number;
      storage_size: string;
    };
    deletable: boolean;
  };
}

@Injectable({
  providedIn: 'root',
})
export class WalrusService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);
  private readonly httpClient: HttpClient = inject(HttpClient);

  private epochs = 53;
  private policyObjectId: string | undefined;
  private movePackageId: string | undefined;
  private keyServers: Array<string> | undefined;

  constructor() {
    this.epochs = this.appConfigService?.walrus?.epochs || 53;
    // validated in sui-poc.service already
    this.policyObjectId = this.appConfigService?.suiPoc?.policyObjectId;
    this.movePackageId = this.appConfigService?.suiPoc?.packageId;
    this.keyServers = this.appConfigService?.suiPoc?.keyServers;
  }

  /**
 * Upload a file to Walrus storage
 * @param encryptedData - The encrypted file data to upload
 * @returns Promise<string> - The URL to access the uploaded blob
 */
  public async uploadFileToWalrus(encryptedData: File): Promise<string> {
    try {
      if (!this.appConfigService.walrus) {
        throw new Error('Walrus configuration is not available');
      }

      return await this.uploadFileToWalrusViaRelay(encryptedData);
    } catch (error) {
      console.error('Walrus upload failed', error);
      throw new Error('Failed to upload encrypted data to Walrus storage. Please try again.');
    }
  }

  public async uploadFileToWalrusViaRelay(encryptedData: File): Promise<string> {
    try {
      const relayUrl = this.appConfigService.relayApi!.baseUrl;

      const uploadUrl = `${relayUrl}/api/relay/walrus/upload-file`;

      const formData = new FormData();
      formData.append('file', encryptedData);
      formData.append('epochs', this.epochs.toString());
      formData.append('policyObjectId', this.policyObjectId!);
      formData.append('movePackageId', this.movePackageId!);
      formData.append('keyServers', JSON.stringify(this.keyServers!));

      const headers = new HttpHeaders({
        'x-api-key': this.appConfigService.relayApi!.apiKey || '',
      });
      // const headers = new HttpHeaders({
      //   'x-api-key': this.appConfigService.relayApi!.apiKey || '',
      //   'Content-Type': 'application/octet-stream',
      // });

      const response = await firstValueFrom(this.httpClient.post<Array<WalrusUploadRelayResponse>>(uploadUrl, formData, { headers }));
      // const response = await firstValueFrom(this.httpClient.post<Array<WalrusUploadRelayResponse>>(uploadUrl, encryptedData, { headers }));
      console.log('Walrus upload via relay response', response);

      if (!response || response.length === 0) {
        throw new Error('No response received from Walrus relay');
      }

      // Return the URL to access the blob
      const aggregatorUrl = this.appConfigService.walrus!.aggregatorUrl;
      return `${aggregatorUrl}/blobs/by-quilt-patch-id/${response[0].id}`;
    } catch (error) {
      console.error('Walrus upload via relay failed', error);
      throw new Error('Failed to upload encrypted data to Walrus storage via relay. Please try again.');
    }
  }

  public async uploadFileToWalrusViaPublisher(encryptedData: File): Promise<string> {
    try {
      if (!this.appConfigService.walrus) {
        throw new Error('Walrus configuration is not available');
      }

      const publisherUrl = this.appConfigService.walrus.publisherUrl;

      // Prepare the upload URL with epochs parameter
      const uploadUrl = `${publisherUrl}/blobs?epochs=${this.epochs}`;

      // Prepare headers
      const headers = new HttpHeaders({
        'Content-Type': 'application/octet-stream',
      });

      // Upload the file using HTTP PUT
      const response = await firstValueFrom(this.httpClient.put<WalrusUploadResponse>(uploadUrl, encryptedData, { headers }));

      if (!response) {
        throw new Error('No response received from Walrus');
      }

      // Extract blob ID from response
      let blobId: string;
      if (response.newlyCreated) {
        blobId = response.newlyCreated.blobObject.blobId;
      } else if (response.alreadyCertified) {
        blobId = response.alreadyCertified.blobId;
      } else {
        throw new Error('Invalid response format from Walrus');
      }

      // Return the URL to access the blob
      const aggregatorUrl = this.appConfigService.walrus.aggregatorUrl;
      return `${aggregatorUrl}/blobs/${blobId}`;
    } catch (error) {
      console.error('Walrus upload failed', error);
      throw new Error('Failed to upload encrypted data to Walrus storage. Please try again.');
    }
  }

  public async uploadFileToWalrusViaQuilt(encryptedData: File): Promise<void> {
  try {
      const publisherUrl = this.appConfigService.walrus!.publisherUrl;
      console.log('publisherUrl', publisherUrl);
      const uploadUrl = `${publisherUrl}/quilts?epochs=${this.epochs}`;
      const metaData = [{"identifier": "quilt-telegram-test", "tags": {"owner": "dfusion-dev", "teleramID": "TODO_TELEGRAM_ID"}}];
      // return;

      const formData = new FormData();
      formData.append('TODO_UNIQUE_file_identifier', encryptedData);
      formData.append('_metadata', JSON.stringify(metaData));

      const headers = new HttpHeaders({
      // Example: 'x-api-key': 'YOUR_API_KEY'
      });

      const response = await firstValueFrom(this.httpClient.put<any>(uploadUrl, formData, { headers }));
      console.log('Walrus upload via quilt response', response);

      if (!response) {
        throw new Error('No response received from Walrus quilt');
      }

      // const aggregatorUrl = this.appConfigService.walrus!.aggregatorUrl;
      // return `${aggregatorUrl}/blobs/by-quilt-patch-id/${response[0].id}`;
    } catch (error) {
      console.error('Walrus upload via quilt failed', error);
      throw new Error('Failed to upload encrypted data to Walrus storage via quilt. Please try again.');
    }
  }

  /**
   * Retrieve a blob from Walrus by Quilt Patch ID
   * @param patchId Quilt patch ID / blobStoreResult.newlyCreated.blobObject.blobid
   * @returns Blob
   */
  public async getBlobByQuiltPatchId(patchId: string): Promise<Blob> {
    try {
      const aggregatorUrl = this.appConfigService.walrus!.aggregatorUrl; // e.g. https://aggregator.walrus-testnet.walrus.space
      const url = `${aggregatorUrl}/blobs/by-quilt-patch-id/${patchId}`;

      const response = await firstValueFrom(
        this.httpClient.get(url, { responseType: 'arraybuffer' })
      );

      return new Blob([response]);
    } catch (error) {
      console.error('Failed to fetch blob by quilt patch ID', error);
      throw new Error('Failed to fetch blob from Walrus (patch ID).');
    }
  }

  /**
   * Retrieve a blob from Walrus by Quilt ID and Identifier
   * @param quiltId Quilt ID / storedQuiltBlobs.quiltPatchId
   * @param identifier Identifier of the file inside the quilt
   * @returns Blob
   */
  public async getBlobByQuiltIdAndIdentifier(quiltId: string, identifier: string): Promise<Blob> {
    try {
      const aggregatorUrl = this.appConfigService.walrus!.aggregatorUrl;
      const url = `${aggregatorUrl}/blobs/by-quilt-id/${quiltId}/${identifier}`;

      const response = await firstValueFrom(
        this.httpClient.get(url, { responseType: 'arraybuffer' })
      );

      return new Blob([response]);
    } catch (error) {
      console.error('Failed to fetch blob by quilt ID and identifier', error);
      throw new Error('Failed to fetch blob from Walrus (quilt ID).');
    }
  }

  /**
   * Download a blob from Walrus storage
   * @param blobId - The blob ID to download
   * @returns Promise<Blob> - The downloaded blob data
   */
  public async downloadBlobFromWalrus(blobId: string): Promise<Blob> {
    try {
      if (!this.appConfigService.walrus) {
        throw new Error('Walrus configuration is not available');
      }

      const aggregatorUrl = this.appConfigService.walrus.aggregatorUrl;
      const downloadUrl = `${aggregatorUrl}/blobs/${blobId}`;

      const response = await firstValueFrom(this.httpClient
        .get(downloadUrl, {
          responseType: 'blob',
        }));

      if (!response) {
        throw new Error('No response received from Walrus');
      }

      return response;
    } catch (error) {
      console.error('Walrus download failed', error);
      throw new Error('Failed to download data from Walrus storage. Please try again.');
    }
  }

  /**
   * Get blob info from Walrus storage
   * @param blobId - The blob ID to get info for
   * @returns Promise<any> - The blob information
   */
  public async getBlobInfo(blobId: string): Promise<any> {
    try {
      if (!this.appConfigService.walrus) {
        throw new Error('Walrus configuration is not available');
      }

      const aggregatorUrl = this.appConfigService.walrus.aggregatorUrl;
      const infoUrl = `${aggregatorUrl}/blobs/${blobId}/info`;

      const response = await firstValueFrom(this.httpClient.get(infoUrl));

      return response;
    } catch (error) {
      console.error('Walrus blob info failed', error);
      throw new Error('Failed to get blob info from Walrus storage. Please try again.');
    }
  }

  /**
   * Check if Walrus is configured and available
   * @returns boolean - True if Walrus is configured
   */
  public isWalrusAvailable(): boolean {
    return !!(this.appConfigService.walrus?.publisherUrl && this.appConfigService.walrus?.aggregatorUrl);
  }
}
