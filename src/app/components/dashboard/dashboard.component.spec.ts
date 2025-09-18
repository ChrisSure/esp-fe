import { MatSnackBar } from '@angular/material/snack-bar';
import { of, throwError } from 'rxjs';
import { DashboardComponent } from './dashboard.component';
import { TranscriptionService, TranscriptionResponse } from '../../services/transcription.service';

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive';
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;

  constructor(
    public stream: MediaStream,
    public options: any,
  ) {}

  start() {
    this.state = 'recording';
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }
}

describe('DashboardComponent - Unit Tests', () => {
  let component: DashboardComponent;
  let snackBarSpy: jest.Mocked<MatSnackBar>;
  let transcriptionServiceSpy: jest.Mocked<TranscriptionService>;
  let mockGetUserMedia: jest.Mock;

  beforeEach(() => {
    // Create spy for MatSnackBar
    snackBarSpy = {
      open: jest.fn(),
    } as jest.Mocked<MatSnackBar>;

    // Create spy for TranscriptionService
    transcriptionServiceSpy = {
      transcribeAudio: jest.fn(),
      transcribeAudioAsMP3: jest.fn(),
      checkServiceHealth: jest.fn(),
      createAudioUrlFromBase64: jest.fn(),
      clearStartedConversations: jest.fn(),
    } as jest.Mocked<TranscriptionService>;

    // Setup global mocks
    mockGetUserMedia = jest.fn();

    // Mock setTimeout
    jest.useFakeTimers();

    Object.defineProperty(global, 'MediaRecorder', {
      writable: true,
      value: MockMediaRecorder,
    });

    Object.defineProperty(global, 'navigator', {
      writable: true,
      value: {
        mediaDevices: {
          getUserMedia: mockGetUserMedia,
        },
      },
    });

    Object.defineProperty(global, 'Audio', {
      writable: true,
      value: jest.fn().mockImplementation((src: string) => ({
        src,
        play: jest.fn().mockResolvedValue(undefined),
      })),
    });

    Object.defineProperty(global, 'URL', {
      writable: true,
      value: {
        createObjectURL: jest.fn(() => 'mock-blob-url'),
        revokeObjectURL: jest.fn(),
      },
    });

    const mockCreateElement = jest.fn((tagName: string) => {
      if (tagName === 'a') {
        return {
          href: '',
          download: '',
          click: jest.fn(),
        };
      }
      return document.createElement(tagName);
    });

    Object.defineProperty(document, 'createElement', {
      writable: true,
      value: mockCreateElement,
    });

    // Create component instance manually
    component = new DashboardComponent(snackBarSpy, transcriptionServiceSpy);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Component Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(component.isRecording).toBe(false);
      expect(component.mediaRecorder).toBeNull();
      expect(component.audioChunks).toEqual([]);
      expect(component.audioUrl).toBeNull();

      // Transcription properties
      expect(component.isTranscribing).toBe(false);
      expect(component.transcriptionResult).toBeNull();
      expect(component.transcriptionError).toBeNull();
      expect(component.lastTranscriptionTime).toBeNull();

      // Session properties
      expect(component.conversationId).toBeTruthy();
      expect(component.conversationId).toMatch(/^conv_\d+_[a-z0-9]+$/);
    });
  });

  describe('Recording Functionality', () => {
    it('should start recording successfully', async () => {
      const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) } as any;
      mockGetUserMedia.mockResolvedValue(mockStream);

      await component.startRecording();

      expect(component.isRecording).toBe(true);
      expect(component.mediaRecorder).toBeTruthy();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Recording started...',
        'Close',
        expect.objectContaining({
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should handle microphone access error', async () => {
      mockGetUserMedia.mockRejectedValue(new Error('Permission denied'));

      await component.startRecording();

      expect(component.isRecording).toBe(false);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Error: Could not access microphone. Please check permissions.',
        'Close',
        expect.objectContaining({
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should stop recording when currently recording', async () => {
      // Start recording first
      const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) } as any;
      mockGetUserMedia.mockResolvedValue(mockStream);
      await component.startRecording();

      // Then stop recording
      component.stopRecording();

      expect(component.isRecording).toBe(false);
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Recording stopped. Processing...',
        'Close',
        expect.objectContaining({
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should not stop recording if not currently recording', () => {
      component.stopRecording();

      expect(snackBarSpy.open).not.toHaveBeenCalledWith(
        'Recording stopped. Processing...',
        'Close',
        expect.any(Object),
      );
    });

    it('should automatically trigger transcription after stopping recording', async () => {
      // Setup mock for transcription service
      transcriptionServiceSpy.transcribeAudioAsMP3.mockReturnValue(
        of({ transcription: 'Test transcription' }),
      );

      // Start recording first
      const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) } as any;
      mockGetUserMedia.mockResolvedValue(mockStream);
      await component.startRecording();

      // Setup audio data as if recording was successful
      component.audioChunks = [new Blob(['mock audio data'], { type: 'audio/webm' })];
      component.audioUrl = 'mock-audio-url';

      // Stop recording
      component.stopRecording();

      // Verify transcription is not called immediately
      expect(transcriptionServiceSpy.transcribeAudioAsMP3).not.toHaveBeenCalled();

      // Fast-forward the timer
      jest.advanceTimersByTime(500);

      // Now transcription should be called
      expect(transcriptionServiceSpy.transcribeAudioAsMP3).toHaveBeenCalledWith(
        expect.any(Blob),
        component.conversationId,
      );
    });
  });

  describe('Playback Functionality', () => {
    it('should play recording when audio URL exists', () => {
      component.audioUrl = 'mock-audio-url';
      const audioSpy = jest.spyOn(global, 'Audio');

      component.playRecording();

      expect(audioSpy).toHaveBeenCalledWith('mock-audio-url');
    });

    it('should not play recording if no audio URL exists', () => {
      component.audioUrl = null;
      const audioSpy = jest.spyOn(global, 'Audio');

      component.playRecording();

      expect(audioSpy).not.toHaveBeenCalled();
    });

    it('should handle audio playback error gracefully', async () => {
      component.audioUrl = 'mock-audio-url';

      // Mock Audio to throw error on play
      const mockAudio = {
        play: jest.fn().mockRejectedValue(new Error('Playback failed')),
      };
      const audioSpy = jest.spyOn(global, 'Audio').mockReturnValue(mockAudio as any);

      await component.playRecording();

      expect(audioSpy).toHaveBeenCalledWith('mock-audio-url');
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Error playing audio',
        'Close',
        expect.objectContaining({
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });
  });

  describe('Download Functionality', () => {
    it('should download recording when audio URL exists', () => {
      component.audioUrl = 'mock-audio-url';
      const mockLink = { href: '', download: '', click: jest.fn() };
      const createElementSpy = jest
        .spyOn(document, 'createElement')
        .mockReturnValue(mockLink as any);

      component.downloadRecording();

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.href).toBe('mock-audio-url');
      expect(mockLink.download).toMatch(/recording-\d+\.webm/);
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should not download if no audio URL exists', () => {
      component.audioUrl = null;
      const createElementSpy = jest.spyOn(document, 'createElement');

      component.downloadRecording();

      expect(createElementSpy).not.toHaveBeenCalled();
    });
  });

  describe('Clear Functionality', () => {
    it('should clear recording when audio URL exists', () => {
      component.audioUrl = 'mock-audio-url';
      component.audioChunks = [new Blob(['data'])];
      component.transcriptionResult = 'Some transcription';
      component.transcriptionError = 'Some error';
      component.lastTranscriptionTime = new Date();
      const urlSpy = jest.spyOn(URL, 'revokeObjectURL');

      component.clearRecording();

      expect(urlSpy).toHaveBeenCalledWith('mock-audio-url');
      expect(component.audioUrl).toBeNull();
      expect(component.audioChunks).toEqual([]);
      // Should also clear transcription data
      expect(component.transcriptionResult).toBeNull();
      expect(component.transcriptionError).toBeNull();
      expect(component.lastTranscriptionTime).toBeNull();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Recording cleared.',
        'Close',
        expect.objectContaining({
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should not clear recording if no audio URL exists', () => {
      component.audioUrl = null;
      const urlSpy = jest.spyOn(URL, 'revokeObjectURL');

      component.clearRecording();

      expect(urlSpy).not.toHaveBeenCalled();
      expect(snackBarSpy.open).not.toHaveBeenCalled();
    });
  });

  describe('Component Cleanup', () => {
    it('should clean up resources on destroy', () => {
      component.audioUrl = 'mock-audio-url';
      component.isRecording = true;
      component.mediaRecorder = new MockMediaRecorder({} as any, {}) as any;

      const urlSpy = jest.spyOn(URL, 'revokeObjectURL');
      const stopSpy = jest.spyOn(component.mediaRecorder, 'stop');

      component.ngOnDestroy();

      expect(urlSpy).toHaveBeenCalledWith('mock-audio-url');
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should handle destroy with no active recording', () => {
      component.audioUrl = null;
      component.isRecording = false;
      component.mediaRecorder = null;

      const urlSpy = jest.spyOn(URL, 'revokeObjectURL');

      expect(() => component.ngOnDestroy()).not.toThrow();
      expect(urlSpy).not.toHaveBeenCalled();
    });
  });

  describe('Recording Events', () => {
    it('should handle recording completion', async () => {
      const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) } as any;
      mockGetUserMedia.mockResolvedValue(mockStream);
      const urlSpy = jest.spyOn(URL, 'createObjectURL');

      await component.startRecording();

      // Simulate data available event
      if (component.mediaRecorder?.ondataavailable) {
        component.mediaRecorder.ondataavailable({
          data: new Blob(['mock data'], { type: 'audio/webm' }),
        });
      }

      // Simulate recording stop
      if (component.mediaRecorder?.onstop) {
        component.mediaRecorder.onstop();
      }

      expect(urlSpy).toHaveBeenCalled();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Recording saved successfully!',
        'Close',
        expect.objectContaining({
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should handle data available event correctly', async () => {
      const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) } as any;
      mockGetUserMedia.mockResolvedValue(mockStream);

      await component.startRecording();

      // Initially no chunks
      expect(component.audioChunks).toEqual([]);

      // Simulate data available event
      const mockBlob = new Blob(['mock data'], { type: 'audio/webm' });
      if (component.mediaRecorder?.ondataavailable) {
        component.mediaRecorder.ondataavailable({
          data: mockBlob,
        });
      }

      // Should have added the chunk
      expect(component.audioChunks).toContain(mockBlob);
    });

    it('should not add empty chunks', async () => {
      const mockStream = { getTracks: jest.fn(() => [{ stop: jest.fn() }]) } as any;
      mockGetUserMedia.mockResolvedValue(mockStream);

      await component.startRecording();

      // Simulate data available event with empty blob
      const emptyBlob = new Blob([], { type: 'audio/webm' });
      if (component.mediaRecorder?.ondataavailable) {
        component.mediaRecorder.ondataavailable({
          data: emptyBlob,
        });
      }

      // Should not have added the empty chunk
      expect(component.audioChunks).toEqual([]);
    });
  });

  describe('Transcription Functionality', () => {
    beforeEach(() => {
      // Setup component with mock audio data
      component.audioUrl = 'mock-audio-url';
      component.audioChunks = [new Blob(['mock audio data'], { type: 'audio/webm' })];
    });

    it('should transcribe audio successfully', () => {
      const mockResponse: TranscriptionResponse = {
        transcription: 'Hello world test transcription',
        confidence: 0.95,
      };
      transcriptionServiceSpy.transcribeAudioAsMP3.mockReturnValue(of(mockResponse));

      component.transcribeAudio();

      expect(component.isTranscribing).toBe(false);
      expect(component.transcriptionResult).toBe(mockResponse.transcription);
      expect(component.lastTranscriptionTime).toBeTruthy();
      expect(transcriptionServiceSpy.transcribeAudioAsMP3).toHaveBeenCalledWith(
        expect.any(Blob),
        component.conversationId,
      );
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Transcription completed successfully!',
        'Close',
        expect.objectContaining({
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should handle transcription error', () => {
      const errorMessage = 'Transcription service unavailable';
      transcriptionServiceSpy.transcribeAudioAsMP3.mockReturnValue(
        throwError(() => new Error(errorMessage)),
      );

      component.transcribeAudio();

      expect(component.isTranscribing).toBe(false);
      expect(component.transcriptionError).toBe(errorMessage);
      expect(component.transcriptionResult).toBeNull();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        `Transcription failed: ${errorMessage}`,
        'Close',
        expect.objectContaining({
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should not transcribe when no audio is available', () => {
      component.audioUrl = null;
      component.audioChunks = [];

      component.transcribeAudio();

      expect(transcriptionServiceSpy.transcribeAudioAsMP3).not.toHaveBeenCalled();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'No audio recording available to transcribe.',
        'Close',
        expect.objectContaining({
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should copy transcription to clipboard', async () => {
      component.transcriptionResult = 'Test transcription text';

      // Mock clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockResolvedValue(undefined),
        },
        writable: true,
      });

      await component.copyTranscription();

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Test transcription text');
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Transcription copied to clipboard!',
        'Close',
        expect.objectContaining({
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should handle clipboard copy error', async () => {
      component.transcriptionResult = 'Test transcription text';

      // Mock clipboard API to fail
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: jest.fn().mockRejectedValue(new Error('Clipboard unavailable')),
        },
        writable: true,
      });

      await component.copyTranscription();

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Failed to copy to clipboard.',
        'Close',
        expect.objectContaining({
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should not copy when no transcription result exists', async () => {
      component.transcriptionResult = null;

      const clipboardSpy = jest.fn();
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: clipboardSpy },
        writable: true,
      });

      await component.copyTranscription();

      expect(clipboardSpy).not.toHaveBeenCalled();
    });

    it('should clear transcription data', () => {
      component.transcriptionResult = 'Some transcription';
      component.transcriptionError = 'Some error';
      component.lastTranscriptionTime = new Date();

      component.clearTranscription();

      expect(component.transcriptionResult).toBeNull();
      expect(component.transcriptionError).toBeNull();
      expect(component.lastTranscriptionTime).toBeNull();
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Transcription cleared.',
        'Close',
        expect.objectContaining({
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should show loading state during transcription', () => {
      transcriptionServiceSpy.transcribeAudioAsMP3.mockImplementation(() => {
        // Check loading state during call
        expect(component.isTranscribing).toBe(true);
        expect(component.transcriptionError).toBeNull();
        expect(component.transcriptionResult).toBeNull();
        return of({ transcription: 'Test result' });
      });

      component.transcribeAudio();

      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'Sending audio for transcription...',
        'Close',
        expect.objectContaining({
          duration: 2000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });
  });

  describe('Session Management', () => {
    it('should generate conversation ID on initialization', () => {
      expect(component.conversationId).toBeTruthy();
      expect(component.conversationId).toMatch(/^conv_\d+_[a-z0-9]+$/);
    });

    it('should return short conversation ID', () => {
      component.conversationId = 'conv_1234567890_abcdefghijk';
      const shortId = component.getShortConversationId();
      expect(shortId).toBe('defghijk');
      expect(shortId.length).toBe(8);
    });

    it('should start new session and clear data', () => {
      // Set up existing data
      component.audioUrl = 'mock-audio-url';
      component.audioChunks = [new Blob(['data'])];
      component.transcriptionResult = 'Some transcription';
      component.transcriptionError = 'Some error';
      component.lastTranscriptionTime = new Date();
      component.transcriptionAudioUrl = 'mock-transcription-audio-url';
      const oldConversationId = component.conversationId;

      const urlSpy = jest.spyOn(URL, 'revokeObjectURL');

      component.startNewSession();

      // Should generate new conversation ID
      expect(component.conversationId).not.toBe(oldConversationId);
      expect(component.conversationId).toMatch(/^conv_\d+_[a-z0-9]+$/);

      // Should clear service conversations
      expect(transcriptionServiceSpy.clearStartedConversations).toHaveBeenCalled();

      // Should clear all data
      expect(component.audioUrl).toBeNull();
      expect(component.audioChunks).toEqual([]);
      expect(component.transcriptionResult).toBeNull();
      expect(component.transcriptionError).toBeNull();
      expect(component.lastTranscriptionTime).toBeNull();
      expect(component.transcriptionAudioUrl).toBeNull();
      expect(component.isPlayingTranscriptionAudio).toBe(false);

      // Should revoke URLs
      expect(urlSpy).toHaveBeenCalledWith('mock-audio-url');
      expect(urlSpy).toHaveBeenCalledWith('mock-transcription-audio-url');

      // Should show notification
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'New session started!',
        'Close',
        expect.objectContaining({
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom',
        }),
      );
    });

    it('should handle new session with no existing data', () => {
      const oldConversationId = component.conversationId;
      const urlSpy = jest.spyOn(URL, 'revokeObjectURL');

      component.startNewSession();

      expect(component.conversationId).not.toBe(oldConversationId);
      expect(transcriptionServiceSpy.clearStartedConversations).toHaveBeenCalled();
      expect(urlSpy).not.toHaveBeenCalled(); // No URLs to revoke
      expect(snackBarSpy.open).toHaveBeenCalledWith(
        'New session started!',
        'Close',
        expect.any(Object),
      );
    });
  });
});
