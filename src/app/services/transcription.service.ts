import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface TranscriptionResponse {
  transcription: string;
  confidence?: number;
  duration?: number;
  language?: string;
}

export interface TranscriptionError {
  error: string;
  message: string;
  statusCode?: number;
}

@Injectable({
  providedIn: 'root',
})
export class TranscriptionService {
  private readonly apiUrl = 'http://localhost:3000/record';

  constructor(private http: HttpClient) {}

  /**
   * Sends audio blob to transcription API
   * @param audioBlob - The recorded audio blob
   * @returns Observable with transcription response
   */
  transcribeAudio(audioBlob: Blob): Observable<TranscriptionResponse> {
    const formData = new FormData();

    // Convert WebM to MP3-compatible format if needed
    // Note: Most transcription services can handle WebM, but we'll ensure proper naming
    const audioFile = new File([audioBlob], 'recording.webm', {
      type: audioBlob.type || 'audio/webm',
    });

    formData.append('audio', audioFile);
    formData.append('format', 'webm');
    formData.append('timestamp', new Date().toISOString());

    return this.http
      .post<TranscriptionResponse>(this.apiUrl, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Alternative method that converts audio to MP3 format first
   * Note: This would require a WebM to MP3 conversion library
   */
  transcribeAudioAsMP3(audioBlob: Blob): Observable<TranscriptionResponse> {
    // For now, we'll use the same method but indicate MP3 preference
    // TODO: Add actual WebM to MP3 conversion using a library like FFmpeg.wasm
    const formData = new FormData();

    const audioFile = new File([audioBlob], 'recording.mp3', {
      type: 'audio/mp3',
    });

    formData.append('audio', audioFile);
    formData.append('format', 'mp3');
    formData.append('preferredFormat', 'mp3');
    formData.append('originalFormat', 'webm'); // Let API know the source format

    return this.http
      .post<TranscriptionResponse>(this.apiUrl, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Check if transcription service is available
   */
  checkServiceHealth(): Observable<{ status: string; uptime?: number }> {
    return this.http
      .get<{ status: string; uptime?: number }>(`${this.apiUrl}/health`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Handle HTTP errors
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'An error occurred during transcription';

    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = `Client Error: ${error.error.message}`;
    } else {
      // Server-side error
      switch (error.status) {
        case 0:
          errorMessage =
            'Unable to connect to transcription service. Please check if the server is running.';
          break;
        case 400:
          errorMessage = 'Invalid audio format. Please try recording again.';
          break;
        case 413:
          errorMessage = 'Audio file is too large. Please record a shorter audio clip.';
          break;
        case 422:
          errorMessage = 'Audio format not supported. Please try a different recording format.';
          break;
        case 429:
          errorMessage = 'Too many requests. Please wait a moment and try again.';
          break;
        case 500:
          errorMessage = 'Server error occurred during transcription. Please try again later.';
          break;
        case 503:
          errorMessage =
            'Transcription service is temporarily unavailable. Please try again later.';
          break;
        default:
          errorMessage = `Server Error (${error.status}): ${error.error?.message || 'Unknown error'}`;
      }
    }

    // Only log errors in non-test environments
    if (typeof (globalThis as any)['test'] === 'undefined' && typeof jest === 'undefined') {
      console.error('Transcription API Error:', error);
    }
    return throwError(() => new Error(errorMessage));
  };
}
