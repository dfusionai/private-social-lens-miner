import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: 'root',
})
export class ReferralService {
  public userReferralCode = signal<string>('');
  public referralRewardCode = signal<string>(''); // user uses someone else's referral code

}