import { AnnotationService } from './annotation.service';

describe('AnnotationService', () => {
  let service: AnnotationService;

  beforeEach(() => {
    service = new AnnotationService();
  });

  it('creates, lists, updates, and deletes isolated annotation records', () => {
    const created = service.create({
      documentId: 'doc-1', page: 2, type: 'highlight', rect: { x: 10, y: 20, width: 80, height: 12 },
    });
    expect(created.id).toContain('annotation-');
    expect(created.style).toEqual({ color: '#ffeb3b', opacity: 0.45 });
    expect(service.list('doc-1', 2)).toEqual([created]);
    expect(service.list('other-doc')).toEqual([]);

    const updated = service.update(created.id, { content: 'reviewed', style: { color: '#00ff00', opacity: 0.6 } });
    expect(updated.content).toBe('reviewed');
    expect(updated.style.color).toBe('#00ff00');
    expect(updated.style.opacity).toBe(0.6);
    expect(updated.createdAt).toBe(created.createdAt);
    expect(service.delete(created.id)).toBeTrue();
    expect(service.delete(created.id)).toBeFalse();
  });

  it('clears only annotations belonging to the requested document', () => {
    service.create({ documentId: 'doc-1', page: 1, type: 'comment', rect: { x: 0, y: 0, width: 1, height: 1 } });
    service.create({ documentId: 'doc-2', page: 1, type: 'comment', rect: { x: 0, y: 0, width: 1, height: 1 } });
    service.clearDocument('doc-1');
    expect(service.list('doc-1')).toEqual([]);
    expect(service.list('doc-2').length).toBe(1);
  });

  it('copies viewport metadata and rejects invalid viewport dimensions', () => {
    const viewport = { width: 600, height: 800 };
    const created = service.create({
      documentId: 'doc', page: 1, type: 'highlight',
      rect: { x: 10, y: 20, width: 30, height: 40 }, viewport,
    });
    viewport.width = 0;

    expect(created.viewport).toEqual({ width: 600, height: 800 });
    expect(service.list('doc')[0].viewport).toEqual({ width: 600, height: 800 });
    expect(() => service.create({
      documentId: 'doc', page: 1, type: 'highlight',
      rect: { x: 0, y: 0, width: 1, height: 1 }, viewport: { width: 0, height: 10 },
    })).toThrowError('Annotation viewport dimensions must be positive and finite');
  });

  it('rejects invalid page numbers, rectangles, style values, and unknown updates', () => {
    expect(() => service.create({ documentId: 'doc', page: 0, type: 'draw', rect: { x: 0, y: 0, width: 1, height: 1 } })).toThrowError('Annotation page must be a positive integer');
    expect(() => service.create({ documentId: 'doc', page: 1, type: 'draw', rect: { x: 0, y: 0, width: 0, height: 1 } })).toThrowError('Annotation rectangle must have finite coordinates and positive dimensions');
    expect(() => service.create({ documentId: 'doc', page: 1, type: 'draw', rect: { x: 0, y: 0, width: 1, height: 1 }, style: { opacity: 2 } })).toThrowError('Annotation opacity must be between 0 and 1');
    expect(() => service.update('missing', { content: 'x' })).toThrowError('Annotation not found: missing');
  });
});