import { inject, Injectable } from "@angular/core";
import { ReferralService } from "./referral.service";
import { SubmissionUserApiService } from "./submission-user-api.service";

@Injectable({
  providedIn: 'root',
})
export class SubmissionUserService {
  private readonly submissionUserApiService: SubmissionUserApiService = inject(SubmissionUserApiService);
  private readonly referralService: ReferralService = inject(ReferralService);

  // public submissionUser = signal<ISubmissionUserDto | null>(null);

  public getSubmissionUser(sourceId: string) {
    this.submissionUserApiService.getSubmissionUserById(sourceId).subscribe(
      res => {
        // this.submissionUser.set(res);
        this.referralService.userReferralCode.set(res.referralCode);
      }
    );
  }
}