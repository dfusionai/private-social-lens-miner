import { Injectable, signal } from "@angular/core";

@Injectable({
  providedIn: 'root',
})
export class ReferralService {
  public referralRewardCode = signal<string>(''); // user uses someone else's referral code
}