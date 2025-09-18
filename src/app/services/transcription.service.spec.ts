import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import {
  TranscriptionService,
  TranscriptionResponse,
  ConversationStartResponse,
} from './transcription.service';

describe('TranscriptionService', () => {
  let service: TranscriptionService;
  let httpMock: HttpTestingController;
  const apiUrl = 'http://localhost:3000/record';
  const conversationUrl = 'http://localhost:3000/conversation/start';

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
    it('should send audio blob and return transcription without conversationId', () => {
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

    it('should send audio blob with conversationId as query parameter', () => {
      const mockResponse: TranscriptionResponse = {
        transcription: 'Hello world with conversation',
        confidence: 0.95,
      };

      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });
      const conversationId = 'test-conv-id';

      service.transcribeAudio(audioBlob, conversationId).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const expectedUrl = `${apiUrl}?conversationId=${encodeURIComponent(conversationId)}`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body instanceof FormData).toBeTruthy();

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
    it('should start conversation first then send audio blob as MP3 format', () => {
      const conversationId = 'test-conv-id';
      const backendConversationId = 'backend-conv-id';
      const mockConversationResponse: ConversationStartResponse = {
        conversationId: backendConversationId,
        status: 'started',
      };
      const mockTranscriptionResponse: TranscriptionResponse = {
        transcription: 'Hello world MP3',
      };

      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      service.transcribeAudioAsMP3(audioBlob, conversationId).subscribe((response) => {
        expect(response).toEqual(mockTranscriptionResponse);
      });

      // First expect conversation start request
      const conversationReq = httpMock.expectOne(conversationUrl);
      expect(conversationReq.request.method).toBe('POST');
      expect(conversationReq.request.body).toEqual({ conversationId });
      conversationReq.flush(mockConversationResponse);

      // Then expect transcription request with backend conversationId
      const expectedUrl = `${apiUrl}?conversationId=${encodeURIComponent(backendConversationId)}`;
      const transcriptionReq = httpMock.expectOne(expectedUrl);
      expect(transcriptionReq.request.method).toBe('POST');

      const formData = transcriptionReq.request.body as FormData;
      const audioFile = formData.get('audio') as File;
      expect(audioFile.name).toBe('recording.mp3');
      expect(audioFile.type).toBe('audio/mp3');
      expect(formData.get('format')).toBe('mp3');
      expect(formData.get('preferredFormat')).toBe('mp3');

      transcriptionReq.flush(mockTranscriptionResponse);
    });

    it('should reuse existing conversation and skip start call', () => {
      const conversationId = 'test-conv-id';
      const backendConversationId = 'backend-conv-id';
      const mockConversationResponse: ConversationStartResponse = {
        conversationId: backendConversationId,
        status: 'started',
      };
      const mockTranscriptionResponse: TranscriptionResponse = {
        transcription: 'Hello world MP3 reused',
      };

      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      // First call - should start conversation
      service.transcribeAudioAsMP3(audioBlob, conversationId).subscribe();

      const conversationReq = httpMock.expectOne(conversationUrl);
      conversationReq.flush(mockConversationResponse);

      const firstTranscriptionReq = httpMock.expectOne(
        `${apiUrl}?conversationId=${encodeURIComponent(backendConversationId)}`,
      );
      firstTranscriptionReq.flush(mockTranscriptionResponse);

      // Second call - should skip conversation start
      service.transcribeAudioAsMP3(audioBlob, conversationId).subscribe((response) => {
        expect(response).toEqual(mockTranscriptionResponse);
      });

      // Should NOT make another conversation start request
      const secondTranscriptionReq = httpMock.expectOne(
        `${apiUrl}?conversationId=${encodeURIComponent(backendConversationId)}`,
      );
      secondTranscriptionReq.flush(mockTranscriptionResponse);
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

  describe('startConversation', () => {
    it('should start a new conversation', () => {
      const conversationId = 'test-conv-id';
      const mockResponse: ConversationStartResponse = {
        conversationId: 'backend-conv-id',
        status: 'started',
        message: 'Conversation started successfully',
      };

      service.startConversation(conversationId).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(conversationUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ conversationId });
      req.flush(mockResponse);
    });

    it('should handle conversation start error', () => {
      const conversationId = 'test-conv-id';

      service.startConversation(conversationId).subscribe({
        next: () => fail('Expected error'),
        error: (error) => {
          expect(error.message).toBe(
            'Unable to connect to transcription service. Please check if the server is running.',
          );
        },
      });

      const req = httpMock.expectOne(conversationUrl);
      req.error(new ProgressEvent('error'), { status: 0 });
    });
  });

  describe('clearStartedConversations', () => {
    it('should clear started conversations and allow restarting', () => {
      const conversationId = 'test-conv-id';
      const backendConversationId = 'backend-conv-id';
      const mockConversationResponse: ConversationStartResponse = {
        conversationId: backendConversationId,
        status: 'started',
      };
      const mockTranscriptionResponse: TranscriptionResponse = {
        transcription: 'Hello world',
      };

      const audioBlob = new Blob(['test audio data'], { type: 'audio/webm' });

      // First call - should start conversation
      service.transcribeAudioAsMP3(audioBlob, conversationId).subscribe();

      const conversationReq = httpMock.expectOne(conversationUrl);
      conversationReq.flush(mockConversationResponse);

      const transcriptionReq = httpMock.expectOne(
        `${apiUrl}?conversationId=${encodeURIComponent(backendConversationId)}`,
      );
      transcriptionReq.flush(mockTranscriptionResponse);

      // Clear conversations
      service.clearStartedConversations();

      // Second call - should start conversation again after clearing
      service.transcribeAudioAsMP3(audioBlob, conversationId).subscribe();

      const secondConversationReq = httpMock.expectOne(conversationUrl);
      expect(secondConversationReq.request.body).toEqual({ conversationId });
      secondConversationReq.flush(mockConversationResponse);

      const secondTranscriptionReq = httpMock.expectOne(
        `${apiUrl}?conversationId=${encodeURIComponent(backendConversationId)}`,
      );
      secondTranscriptionReq.flush(mockTranscriptionResponse);
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
