import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface TranscriptionResponse {
  transcription: string;
  confidence?: number;
  duration?: number;
  language?: string;
  audioBuffer?: string; // Base64 encoded audio data
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
      .post<TranscriptionResponse>(this.apiUrl, formData, {
        responseType: 'json', // Ensure we can handle both text and binary data
      })
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
   * Converts base64 encoded audio string to ArrayBuffer
   * @param base64Audio - Base64 encoded audio data
   * @returns ArrayBuffer containing the audio data
   */
  base64ToArrayBuffer(base64Audio: string): ArrayBuffer {
    // Remove data URL prefix if present (e.g., "data:audio/mp3;base64,")
    const base64Data = base64Audio.includes(',') ? base64Audio.split(',')[1] : base64Audio;
    // Use window.atob for browser compatibility
    const binaryString = window.atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Converts ArrayBuffer to Blob for audio playback
   * @param audioBuffer - The audio buffer from the backend
   * @param mimeType - The MIME type of the audio (default: audio/mp3)
   * @returns Blob that can be used for audio playback
   */
  createAudioBlobFromBuffer(audioBuffer: ArrayBuffer, mimeType: string = 'audio/mp3'): Blob {
    return new Blob([audioBuffer], { type: mimeType });
  }

  /**
   * Creates an audio URL from base64 encoded audio for immediate playback
   * @param base64Audio - Base64 encoded audio data from the backend
   * @param mimeType - The MIME type of the audio (default: audio/mp3)
   * @returns URL that can be used with Audio API
   */
  createAudioUrlFromBase64(base64Audio: string, mimeType: string = 'audio/mp3'): string {
    const arrayBuffer = this.base64ToArrayBuffer(base64Audio);
    const blob = this.createAudioBlobFromBuffer(arrayBuffer, mimeType);
    return URL.createObjectURL(blob);
  }

  /**
   * Creates an audio URL from ArrayBuffer for immediate playback
   * @param audioBuffer - The audio buffer from the backend
   * @param mimeType - The MIME type of the audio (default: audio/mp3)
   * @returns URL that can be used with Audio API
   */
  createAudioUrlFromBuffer(audioBuffer: ArrayBuffer, mimeType: string = 'audio/mp3'): string {
    const blob = this.createAudioBlobFromBuffer(audioBuffer, mimeType);
    return URL.createObjectURL(blob);
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
    if (
      !(globalThis as unknown as { __TESTING__?: boolean })['__TESTING__'] &&
      !(globalThis as unknown as { jest?: unknown })['jest']
    ) {
      console.error('Transcription API Error:', error);
    }
    return throwError(() => new Error(errorMessage));
  };
}
