import { AiChatService, AiSettings, MAX_AI_REQUEST, OPENAI_CHAT_URL } from './ai-chat.service';

describe('AiChatService', () => {
  let service: AiChatService;
  let request: jasmine.Spy<typeof fetch>;
  let settings: AiSettings;
  let controller: AbortController;

  beforeEach(() => {
    service = new AiChatService();
    request = spyOn(globalThis, 'fetch').and.resolveTo(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: 'Revised text' } }],
        })
      )
    );
    settings = {
      provider: 'openai',
      endpoint: 'https://ignored.example',
      apiKey: 'private-key',
      model: 'gpt-4o-mini',
    };
    controller = new AbortController();
  });

  const messages = [{ role: 'user' as const, content: 'Summarize this text' }];
  const send = () => service.complete(settings, messages, controller.signal);

  it('uses the primary GPT endpoint with bearer authentication, no cookies and a plain-text result', async () => {
    expect(await send()).toBe('Revised text');
    const [url, init] = request.calls.mostRecent().args;
    expect(url).toBe(OPENAI_CHAT_URL);
    expect(init?.credentials).toBe('omit');
    expect(init?.redirect).toBe('error');
    expect(init?.signal).toBe(controller.signal);
    expect(init?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer private-key',
    });
    const body = JSON.parse(String(init?.body));
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.stream).toBeFalse();
    expect(body.messages[1]).toEqual(messages[0]);
    expect(String(init?.body)).not.toContain('private-key');
  });

  it('uses the full custom URL and model', async () => {
    settings = {
      ...settings,
      provider: 'other',
      endpoint: 'https://provider.example/v1/chat/completions',
      model: 'custom-model',
    };
    await send();
    expect(request.calls.mostRecent().args[0]).toBe(settings.endpoint);
    expect(JSON.parse(String(request.calls.mostRecent().args[1]?.body)).model).toBe('custom-model');
  });

  it('rejects unsafe or invalid endpoint URLs before sending credentials', async () => {
    for (const endpoint of [
      'bad',
      'http://example.com',
      'https://user:pass@example.com',
      'https://example.com?key=secret',
      'https://example.com#secret',
    ]) {
      settings = { ...settings, provider: 'other', endpoint };
      await expectAsync(send()).toBeRejectedWithError(/HTTPS/);
    }
    expect(request).not.toHaveBeenCalled();
  });

  it('validates key, model, empty and oversized messages', async () => {
    settings.apiKey = '';
    await expectAsync(send()).toBeRejectedWithError(/API key/);
    settings.apiKey = 'key';
    settings.model = '';
    await expectAsync(send()).toBeRejectedWithError(/model identifier/);
    settings.model = 'model';
    await expectAsync(service.complete(settings, [], controller.signal)).toBeRejectedWithError(
      /empty or too large/
    );
    await expectAsync(
      service.complete(
        settings,
        [{ role: 'user', content: 'x'.repeat(MAX_AI_REQUEST + 1) }],
        controller.signal
      )
    ).toBeRejectedWithError(/too large/);
    expect(request).not.toHaveBeenCalled();
  });

  it('shows actionable errors without echoing untrusted provider errors', async () => {
    for (const [status, text] of [
      [401, 'authentication'],
      [403, 'authentication'],
      [429, 'quota'],
      [500, 'HTTP 500'],
    ] as const) {
      request.and.resolveTo(new Response('private-key provider details', { status }));
      await expectAsync(send()).toBeRejectedWithError(new RegExp(text));
    }
    request.and.rejectWith(new Error('private-key'));
    await expectAsync(send()).toBeRejectedWithError(/CORS/);
  });

  it('rejects malformed JSON, empty content and incompatible response formats', async () => {
    for (const body of [
      'not JSON',
      '{}',
      '{"choices":[{"message":{"content":""}}]}',
      '{"choices":[{"message":{"content":[]}}]}',
    ]) {
      request.and.resolveTo(new Response(body));
      await expectAsync(send()).toBeRejectedWithError(/JSON|unsupported/);
    }
  });

  it('preserves cancellation without exposing transport details', async () => {
    controller.abort();
    request.and.rejectWith(new Error('cancelled transport'));
    await expectAsync(send()).toBeRejectedWithError(DOMException, 'Request cancelled.');
  });
});
