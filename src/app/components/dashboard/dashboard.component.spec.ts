import { MatSnackBar } from '@angular/material/snack-bar';
import { DashboardComponent } from './dashboard.component';

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
  let mockGetUserMedia: jest.Mock;

  beforeEach(() => {
    // Create spy for MatSnackBar
    snackBarSpy = {
      open: jest.fn(),
    } as jest.Mocked<MatSnackBar>;

    // Setup global mocks
    mockGetUserMedia = jest.fn();

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
    component = new DashboardComponent(snackBarSpy);
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        'Recording stopped.',
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
        'Recording stopped.',
        'Close',
        expect.any(Object),
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
      const urlSpy = jest.spyOn(URL, 'revokeObjectURL');

      component.clearRecording();

      expect(urlSpy).toHaveBeenCalledWith('mock-audio-url');
      expect(component.audioUrl).toBeNull();
      expect(component.audioChunks).toEqual([]);
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
});
