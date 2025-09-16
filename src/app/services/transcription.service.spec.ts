import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TranscriptionService, TranscriptionResponse } from './transcription.service';

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3000/record';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TranscriptionService],
    });
    service = TestBed.inject(TranscriptionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('transcribeAudio', () => {
    it('should send audio blob and return transcription', () => {
      const mockResponse: TranscriptionResponse = {
        transcription: 'Hello world',
        confidence: 0.95,
        duration: 2.5,
        language: 'en',
      };

      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTruthy();

      // Check FormData contents
      const formData = req.request.body as FormData;
      const audioFile = formData.get('audio') as File;
      expect(audioFile).toBeTruthy();
      expect(audioFile.name).toBe('recording.webm');
      expect(formData.get('format')).toBe('webm');
      expect(formData.get('timestamp')).toBeTruthy();

      req.flush(mockResponse);
    });

    it('should handle 400 error with appropriate message', () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe('Invalid audio format. Please try recording again.');
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { error: 'Bad Request', message: 'Invalid audio format' },
        { status: 400, statusText: 'Bad Request' },
      );
    });

    it('should handle 413 error with appropriate message', () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe(
            'Audio file is too large. Please record a shorter audio clip.',
          );
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ error: 'Payload Too Large' }, { status: 413, statusText: 'Payload Too Large' });
    });

    it('should handle network error', () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe(
            'Unable to connect to transcription service. Please check if the server is running.',
          );
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.error(new ProgressEvent('error'), { status: 0 });
    });

    it('should handle 500 server error', () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe(
            'Server error occurred during transcription. Please try again later.',
          );
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { error: 'Internal Server Error' },
        { status: 500, statusText: 'Internal Server Error' },
      );
    });
  });

  describe('transcribeAudioAsMP3', () => {
    it('should send audio blob as MP3 format', () => {
      const mockResponse: TranscriptionResponse = {
        transcription: 'Hello world MP3',
      };

      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudioAsMP3(audioBlob).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');

      const formData = req.request.body as FormData;
      const audioFile = formData.get('audio') as File;
      expect(audioFile.name).toBe('recording.mp3');
      expect(audioFile.type).toBe('audio/mp3');
      expect(formData.get('format')).toBe('mp3');
      expect(formData.get('preferredFormat')).toBe('mp3');

      req.flush(mockResponse);
    });
  });

  describe('checkServiceHealth', () => {
    it('should check service health', () => {
      const mockHealth = { status: 'ok', uptime: 12345 };

      service.checkServiceHealth().subscribe((response) => {
        expect(response).toEqual(mockHealth);
      });

      const req = httpMock.expectOne(`${apiUrl}/health`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHealth);
    });

    it('should handle health check error', () => {
      service.checkServiceHealth().subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe(
            'Unable to connect to transcription service. Please check if the server is running.',
          );
        },
      });

      const req = httpMock.expectOne(`${apiUrl}/health`);
      req.error(new ProgressEvent('error'), { status: 0 });
    });
  });

  describe('error handling', () => {
    it('should handle 422 error correctly', () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe(
            'Audio format not supported. Please try a different recording format.',
          );
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { error: 'Unprocessable Entity' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    });

    it('should handle 429 error correctly', () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe('Too many requests. Please wait a moment and try again.');
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ error: 'Too Many Requests' }, { status: 429, statusText: 'Too Many Requests' });
    });

    it('should handle 503 error correctly', () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe(
            'Transcription service is temporarily unavailable. Please try again later.',
          );
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush(
        { error: 'Service Unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    });

    it('should handle unknown error codes', () => {
      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudio(audioBlob).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe('Server Error (418): Custom error message');
        },
      });

      const req = httpMock.expectOne(apiUrl);
      req.flush({ message: 'Custom error message' }, { status: 418, statusText: "I'm a teapot" });
    });
  });
});
