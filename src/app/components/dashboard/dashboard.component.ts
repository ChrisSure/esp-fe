import { Component, OnDestroy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { CommonModule } from '@angular/common';
import { TranscriptionService, TranscriptionResponse } from '../../services/transcription.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnDestroy {
  isRecording = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  audioUrl: string | null = null;

  // Transcription properties
  isTranscribing = false;
  transcriptionResult: string | null = null;
  transcriptionError: string | null = null;
  lastTranscriptionTime: Date | null = null;

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly transcriptionService: TranscriptionService,
  ) {}

  async startRecording() {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Create MediaRecorder instance
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      // Clear previous recording data
      this.audioChunks = [];
      if (this.audioUrl) {
        URL.revokeObjectURL(this.audioUrl);
        this.audioUrl = null;
      }

      // Handle data available event
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      // Handle recording stop event
      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.audioUrl = URL.createObjectURL(audioBlob);

        // Stop all audio tracks to release microphone
        stream.getTracks().forEach((track) => track.stop());

        this.snackBar.open('Recording saved successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      };

      // Start recording
      this.mediaRecorder.start();
      this.isRecording = true;

      this.snackBar.open('Recording started...', 'Close', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    } catch (error) {
      // Log error for debugging purposes
      if (error instanceof Error) {
        console.warn('Microphone access error:', error.message);
      }
      this.snackBar.open('Error: Could not access microphone. Please check permissions.', 'Close', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

  stopRecording() {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;

      this.snackBar.open('Recording stopped.', 'Close', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

  playRecording() {
    if (this.audioUrl) {
      const audio = new Audio(this.audioUrl);
      audio.play().catch((error) => {
        // Log error for debugging purposes
        if (error instanceof Error) {
          console.warn('Audio playback error:', error.message);
        }
        this.snackBar.open('Error playing audio', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      });
    }
  }

  downloadRecording() {
    if (this.audioUrl) {
      const link = document.createElement('a');
      link.href = this.audioUrl;
      link.download = `recording-${new Date().getTime()}.webm`;
      link.click();
    }
  }

  clearRecording() {
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
      this.audioChunks = [];

      // Clear transcription data as well
      this.transcriptionResult = null;
      this.transcriptionError = null;
      this.lastTranscriptionTime = null;

      this.snackBar.open('Recording cleared.', 'Close', {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    }
  }

  /**
   * Send recorded audio for transcription
   */
  transcribeAudio() {
    if (!this.audioUrl || this.audioChunks.length === 0) {
      this.snackBar.open('No audio recording available to transcribe.', 'Close', {
        duration: 3000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
      return;
    }

    this.isTranscribing = true;
    this.transcriptionError = null;
    this.transcriptionResult = null;

    // Create blob from audio chunks
    const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });

    this.snackBar.open('Sending audio for transcription...', 'Close', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });

    this.transcriptionService.transcribeAudioAsMP3(audioBlob).subscribe({
      next: (response: TranscriptionResponse) => {
        this.isTranscribing = false;
        this.transcriptionResult = response.transcription;
        this.lastTranscriptionTime = new Date();

        this.snackBar.open('Transcription completed successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
      error: (error: Error) => {
        this.isTranscribing = false;
        this.transcriptionError = error.message;

        this.snackBar.open(`Transcription failed: ${error.message}`, 'Close', {
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        });
      },
    });
  }

  /**
   * Copy transcription result to clipboard
   */
  copyTranscription() {
    if (this.transcriptionResult) {
      navigator.clipboard
        .writeText(this.transcriptionResult)
        .then(() => {
          this.snackBar.open('Transcription copied to clipboard!', 'Close', {
            duration: 2000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        })
        .catch(() => {
          this.snackBar.open('Failed to copy to clipboard.', 'Close', {
            duration: 3000,
            horizontalPosition: 'center',
            verticalPosition: 'bottom',
          });
        });
    }
  }

  /**
   * Clear transcription results
   */
  clearTranscription() {
    this.transcriptionResult = null;
    this.transcriptionError = null;
    this.lastTranscriptionTime = null;

    this.snackBar.open('Transcription cleared.', 'Close', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  ngOnDestroy() {
    // Clean up when component is destroyed
    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
    }
  }
}
