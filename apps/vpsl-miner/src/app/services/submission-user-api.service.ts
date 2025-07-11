import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { DataSource, ISubmissionUserDto } from '../models/submission-user';
import { AppConfigService } from './app-config.service';

@Injectable({
  providedIn: 'root'
})
export class SubmissionUserApiService {
  private readonly appConfigService: AppConfigService = inject(AppConfigService);

  private get apiUrl() {
    return this.appConfigService.dFusion?.validatorBackendUrl;
  }

  constructor(private http: HttpClient) {}

  public getSubmissionUserById(sourceId: string): Observable<ISubmissionUserDto> {
    const url = this.apiUrl as string;
    const params = new HttpParams().set('dataSource', DataSource.telegram).set('sourceId', sourceId);

    return this.http.get<ISubmissionUserDto>(url, { params });
  }
}
