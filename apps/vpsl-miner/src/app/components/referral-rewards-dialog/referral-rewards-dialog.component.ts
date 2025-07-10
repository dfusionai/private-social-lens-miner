import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Clipboard } from '@angular/cdk/clipboard';
import { SubmissionUserService } from '../../services/submission-user.service';


@Component({
  selector: 'app-referral-rewards-dialog',
  standalone: false,
  templateUrl: './referral-rewards-dialog.component.html',
  styleUrl: './referral-rewards-dialog.component.scss',
})
export class ReferralRewardsDialogComponent {
  private readonly snackBar: MatSnackBar = inject(MatSnackBar);
  private readonly clipboard: Clipboard = inject(Clipboard);
  private readonly submissionUserService: SubmissionUserService = inject(SubmissionUserService);

  public get referralCode() {
    return this.submissionUserService.submissionUser()?.referralCode || 'Not available';
  }

  public copyReferralCode() {
    if (!this.submissionUserService.submissionUser()?.referralCode) {
      return;
    }

    this.clipboard.copy(this.submissionUserService.submissionUser()?.referralCode || '');

    this.snackBar.open(
      `Copied`,
      ``,
      { duration: 1000 * 2 }
    );
  }
}
