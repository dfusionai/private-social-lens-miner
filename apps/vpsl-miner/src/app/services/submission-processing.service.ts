import { inject, Injectable, signal } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { SubmissionProcessingComponent } from '../components/submission-processing/submission-processing.component';
import { ERROR_MSG_GENERAL } from '../shared/constants';
import { SubmissionStatus } from '../shared/enum';

@Injectable({
  providedIn: 'root',
})
export class SubmissionProcessingService {
  private readonly dialog: MatDialog = inject(MatDialog);

  public showCloudFlare = signal<boolean>(false);

  public showInfo = signal<boolean>(false);
  public showError = signal<boolean>(false);
  public showSuccess = signal<boolean>(false);
  public showFailure = signal<boolean>(false);

  public showInfoMessage = signal<string>('');
  public showErrorMessage = signal<string>('');
  public showSuccessMessage = signal<string>('');
  public showFailureMessage = signal<string>('');
  public successRewardsAmount = signal<string>('');
  public vanaSubmissionStatus = signal<SubmissionStatus>(SubmissionStatus.NOT_DONE);
  public vanaSubmissionErr = signal<string>('');

  public isVanaSubmissionDone = signal<boolean>(false);

  public setVanaProcessErr(errMessage: string) {
    this.vanaSubmissionErr.set(errMessage)
    this.vanaSubmissionStatus.set(SubmissionStatus.DONE)
    this.isVanaSubmissionDone.set(true)
    this.displayError(errMessage);
  }

  public resetProcessState() {
    this.vanaSubmissionStatus.set(SubmissionStatus.NOT_DONE)
    this.vanaSubmissionErr.set('')
    this.successRewardsAmount.set('')
    this.isVanaSubmissionDone.set(false)
  }

  public setVanaProcessDone(successMessage: string) {
    this.vanaSubmissionStatus.set(SubmissionStatus.DONE)
    this.isVanaSubmissionDone.set(true)
    this.displaySuccess(successMessage);
  }

  public displayInfo(infoMessage: string) {
    this.showInfo.set(true);
    this.showInfoMessage.set(infoMessage);
    this.showError.set(false);
    this.showSuccess.set(false);
    this.showFailure.set(false);
  }

  public displayError(errorMessage: string) {
    this.showInfo.set(false);
    this.showError.set(true);
    this.showErrorMessage.set(errorMessage || ERROR_MSG_GENERAL);
    this.showSuccess.set(false);
    this.showFailure.set(false);
  }

  public displaySuccess(successMessage: string = '') {
      this.showInfo.set(false);
      this.showError.set(false);
      this.showSuccess.set(true);
      this.showSuccessMessage.set(successMessage);
      this.showFailure.set(false);
  }

  public displayFailure(failureMessage: string = '') {
    this.showInfo.set(false);
    this.showError.set(false);
    this.showSuccess.set(false);
    this.showFailure.set(true);
    this.showFailureMessage.set(failureMessage);
  }

  public resetState() {
    this.showInfo.set(false);
    this.showError.set(false);
    this.showSuccess.set(false);
    this.showFailure.set(false);

    this.showInfoMessage.set('');
    this.showErrorMessage.set('');
    this.showSuccessMessage.set('');
    this.showFailureMessage.set('');
  }


  public startProcessingState() {
    const matDialogConfig: MatDialogConfig = {
      disableClose: true,
      minHeight: '400px',
      height: 'auto',
      width: '700px',
    };
    this.dialog.open(SubmissionProcessingComponent, matDialogConfig);
  }

  public endProcessingState() {
    this.dialog.closeAll();
  }
}
