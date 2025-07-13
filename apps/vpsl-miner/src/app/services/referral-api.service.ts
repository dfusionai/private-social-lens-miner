import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { IReferralLeaderboardDto } from "../models/referral";
import { AppConfigService } from "./app-config.service";

@Injectable({
  providedIn: 'root',
})
export class ReferralApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);

    private get apiUrl() {
      return this.appConfigService.dFusion?.validatorBackendUrl;
    }

    constructor(private http: HttpClient) {}

    public getTopNReferrals(): Observable<IReferralLeaderboardDto> {
      const url = this.apiUrl as string;
      const params = new HttpParams().set('topNRecords', 10);

      return this.http.get<IReferralLeaderboardDto>(url, { params });
    }

}