import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { SealClient } from '@mysten/seal';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { fromHex, toHex } from '@mysten/sui/utils';
import { catchError, firstValueFrom, throwError, timeout } from 'rxjs';
import { ISuiPoc, IWalrus } from '../models/app-config';
import { fileDto, IFileMetadata, IProcessDataRes, ISubmissionResponse } from '../models/social-truth';
import { TIMEOUT_MS } from '../shared/constants';
import { AppConfigService } from './app-config.service';
import { HttpService } from './http.service';
import { SubmissionProcessingService } from './submission-processing.service';
import { WalrusService } from './walrus.service';
import { Web3WalletService } from './web3-wallet.service';

@Injectable({
  providedIn: 'root',
})
export class SuiBlockchainService {
  private readonly httpClient: HttpClient = inject(HttpClient);
  private readonly httpService: HttpService = inject(HttpService);
  private suiClient: SuiClient;
  private sealClient: SealClient;
  private pocConfig: ISuiPoc | null;
  private walrusConfig: IWalrus | null;
  private suiAddress = signal<string>('');
  private keyServers: Array<string> = [];
  private encryptionThreshold = 1;
  private suiMovePackageId = '';
  private policyObjectId = '';

  public suiPublicKey = computed(() => this.suiAddress());

  constructor(
    private readonly walrusService: WalrusService,
    private readonly appConfigService: AppConfigService,
    private readonly submissionProcessingService: SubmissionProcessingService,
    private readonly web3WalletService: Web3WalletService,
  ) {
    this.pocConfig = this.appConfigService.suiPoc;
    this.walrusConfig = this.appConfigService.walrus;
    this.encryptionThreshold = this.pocConfig?.threshold || 1;

    if (this.pocConfig?.packageId) {
      this.suiMovePackageId = this.pocConfig?.packageId;
      console.log('🔷 this.suiMovePackageId', this.suiMovePackageId);
    }
    else {
      console.error('Sui move package id not configured');
      throw new Error('Sui move package id not configured');
    }

    if (this.pocConfig?.policyObjectId) {
      this.policyObjectId = this.pocConfig?.policyObjectId;
      console.log('🔷 this.policyObjectId', this.policyObjectId);
    }
    else {
      console.error('Policy object id not configured');
      throw new Error('Policy object id not configured');
    }

    if (this.pocConfig?.keyServers) {
      this.keyServers = this.pocConfig?.keyServers;
      console.log('🔷 this.keyServers', this.keyServers);
    }
    else {
      console.error('Seal key servers not configured');
      throw new Error('Seal key servers not configured');
    }

    // set up SUI client
    const network = this.pocConfig?.network || 'mainnet';
    this.suiClient = new SuiClient({ url: getFullnodeUrl(network) });

    this.sealClient = new SealClient({
      suiClient: this.suiClient,
      serverConfigs: this.keyServers.map((id) => ({
        objectId: id,
        weight: 1,
      })),
      verifyKeyServers: false,
    });
  }

  public async createPolicyViaRelay(): Promise<string> {
    try {
      const requestBody = {
        packageObjectId: this.suiMovePackageId,
        dlpWalletAddress: this.pocConfig?.dlpWalletAddress || ''
      };

      const response = await await firstValueFrom(this.httpClient
        .post<{ digest: string; policyObjectId: string }>(`${this.appConfigService.relayApi?.baseUrl}/api/relay/sui/create-policy`, requestBody, {
          headers: {
            'accept': 'application/json',
            'x-custom-lang': 'en',
            'Content-Type': 'application/json',
            'x-api-key': this.appConfigService.relayApi?.apiKey || ''
          }
        })
        .pipe(
          timeout(TIMEOUT_MS.THREE_MINUTES),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('Request timed out');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        ));

      if (!response || !response.policyObjectId) {
        throw new Error('Failed to create policy via relay service. Please try again.');
      }

      return response.policyObjectId;
    } catch (err) {
      console.error('Failed to create policy via relay service', err);
      throw new Error('Failed to create policy via relay service. Please try again.');
    }
  }

  public async saveEncryptedFileViaRelay(fileId: string, policyObjId: string, metadata: IFileMetadata): Promise<string> {
    try {
      const requestBody = {
        fileId: fileId,
        policyObjId: policyObjId,
        metadata: metadata
      };

      const response = await firstValueFrom(this.httpClient
        .post<{ digest: string; onChainFileObjId: string }>(`${this.appConfigService.relayApi?.baseUrl}/api/relay/sui/save-encrypted-file`, requestBody, {
          headers: {
            'accept': 'application/json',
            'x-custom-lang': 'en',
            'Content-Type': 'application/json',
            'x-api-key': this.appConfigService.relayApi?.apiKey || ''
          }
        })
        .pipe(
          timeout(TIMEOUT_MS.THREE_MINUTES),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('Request timed out');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        ));

      if (!response || !response.onChainFileObjId) {
        throw new Error('Failed to save encrypted file via relay service. Please try again.');
      }

      return response.onChainFileObjId;
    } catch (err) {
      console.error('Failed to save encrypted file via relay service', err);
      throw new Error('Failed to save encrypted file via relay service. Please try again.');
    }
  }

  public async processDataWithWorker(blobId: string, onChainFileObjId: string, policyObjectId: string, threshold: number) {
    try {
      const processParams = {
        blobId: blobId,
        onchainFileId: onChainFileObjId,
        policyId: policyObjectId,
        jobType: 'both',
        priority: 5
      };

      const response = await firstValueFrom(this.httpService
        .post<IProcessDataRes>('jobs/data-processing', processParams)
        .pipe(
          timeout(TIMEOUT_MS.THREE_MINUTES),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('Request timed out after 3 minutes');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        ));

      if (!response) {
        throw new Error('No response received from worker');
      }

      return response;
    } catch (err) {
      console.error('Failed to process data with worker', err);
      throw new Error('Failed to process data with worker. Please try again.');
    }
  }

  public async encryptData(policyObjId: string, teleChat: string) {
    try {
      const policyObjectBytes = fromHex(policyObjId);
      const nonce = crypto.getRandomValues(new Uint8Array(5));
      const id = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));
      console.log('🔷 seal id', id);

      const { encryptedObject: encryptedBytes } = await this.sealClient.encrypt({
        threshold: this.encryptionThreshold,
        packageId: this.suiMovePackageId,
        id,
        data: new Uint8Array(new TextEncoder().encode(teleChat)),
      });

      if (!encryptedBytes) {
        throw new Error('Failed to encrypt data');
      }

      return { encryptedBytes, id };
    } catch (err) {
      console.error('Failed to encrypt data', err);
      throw new Error('Failed to encrypt data. Please try again.');
    }
  }

  // public async doSuiPoc(teleChat: string) {
  //   // const policyObjId = await this.createPolicyViaRelay();
  //   const policyObjId = this.policyObjectId;
  //   const {encryptedBytes, id } = await this.encryptData(policyObjId, teleChat);

  //   let walrusUploadRes;
  //   try {
  //     console.log("💥 starting walrus upload");
  //     walrusUploadRes = await this.walrusService.uploadFileToWalrus(new File([encryptedBytes], 'encryptedFile'));
  //     // walrusUploadRes = await this.walrusService.uploadFileToWalrus(encryptedBytes);
  //   } catch (error) {
  //     console.error('walrus upload failed', error);
  //     this.submissionProcessingService.setSuiProcessErr('Failed to upload encrypted data to Walrus storage. Please try again.');
  //     throw new Error('Failed to upload encrypted data to Walrus storage. Please try again.');
  //   }
  //   console.log("💥 walrus upload finished");
  //   const blobId = walrusUploadRes.split('/').pop() || '';

  //   const metadata: IFileMetadata = {
  //     walrusUrl: walrusUploadRes,
  //     size: encryptedBytes.length,
  //   };

  //   const encryptedData = new Uint8Array(encryptedBytes);
  //   const encryptedObject = EncryptedObject.parse(encryptedData);
  //   const onChainFileObjId = await this.saveEncryptedFileViaRelay(encryptedObject.id, policyObjId, metadata);

  //   console.log('🔷 blobId', blobId);
  //   console.log('🔷 onChainFileObjId', onChainFileObjId);
  //   console.log('🔷 policyObjId', policyObjId);
  //   const processDataRes = await this.processDataWithWorker(blobId, onChainFileObjId, policyObjId, this.encryptionThreshold);
  //   console.log('🚀 ~ Nautilus Processed data:', processDataRes?.data);
  // }

  public async batchQuilt(fileDto: fileDto) {
    const { encryptedBytes, id } = await this.encryptData(this.policyObjectId, JSON.stringify(fileDto));

    // Convert Uint8Array to base64 string
    const encryptedDataBase64 = this.uint8ArrayToBase64(encryptedBytes);

    // console.log('this.web3WalletService.walletAddress()', this.web3WalletService.walletAddress());
    const submissionDto = {
      encryptedData: encryptedDataBase64,
      encryptionId: id,
      submissionChatCount: fileDto.chats.length,
      walletAddress: this.web3WalletService.walletAddress(),
    }

    try {
      const response = await firstValueFrom(this.httpService
        .post<ISubmissionResponse>('submissions', submissionDto)
        .pipe(
          timeout(TIMEOUT_MS.THREE_MINUTES),
          catchError((error) => {
            if (error.name === 'TimeoutError') {
              console.error('Request timed out after 3 minutes');
              return throwError(() => new Error('Request timed out. Please try again.'));
            }
            return throwError(() => error);
          }),
        ));

      if (!response || !response.submissionId) {
        throw new Error('No response received from submission service');
      }

      console.log('🚀 ~ Submission created:', response);
      return response;
    } catch (err) {
      console.error('Failed to create submission', err);
      throw new Error('Failed to create submission. Please try again.');
    }
  }

  private uint8ArrayToBase64(uint8Array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    return btoa(binary);
  }
}
