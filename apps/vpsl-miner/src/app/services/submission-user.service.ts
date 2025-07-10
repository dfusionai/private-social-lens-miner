import { Injectable, signal } from "@angular/core";
import { ISubmissionUserDto } from "../models/submission-user";

@Injectable({
  providedIn: 'root',
})
export class SubmissionUserService {
  public submissionUser = signal<ISubmissionUserDto | null>(null);
}