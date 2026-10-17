import { Injectable } from '@angular/core';
import { Annotation, CreateAnnotationInput, UpdateAnnotationInput } from '../models/annotation.model';

@Injectable({ providedIn: 'root' })
export class AnnotationService {
  private readonly annotations = new Map<string, Annotation>();
  private nextId = 0;

  list(documentId: string, page?: number): Annotation[] {
    return [...this.annotations.values()]
      .filter(annotation => annotation.documentId === documentId && (page === undefined || annotation.page === page))
      .map(annotation => this.clone(annotation));
  }

  create(input: CreateAnnotationInput): Annotation {
    if (!input.documentId.trim()) throw new Error('Annotation document ID is required');
    if (!Number.isInteger(input.page) || input.page < 1) throw new Error('Annotation page must be a positive integer');
    this.validateRect(input.rect);
    if (input.viewport && (![input.viewport.width, input.viewport.height].every(Number.isFinite) ||
        input.viewport.width <= 0 || input.viewport.height <= 0)) {
      throw new Error('Annotation viewport dimensions must be positive and finite');
    }

    const now = Date.now();
    const annotation: Annotation = {
      ...input,
      id: `annotation-${now}-${++this.nextId}`,
      documentId: input.documentId,
      rect: { ...input.rect },
      ...(input.viewport ? { viewport: { ...input.viewport } } : {}),
      style: { color: '#ffeb3b', opacity: 0.45, ...input.style },
      createdAt: now,
      updatedAt: now,
    };
    this.validateStyle(annotation.style);
    this.annotations.set(annotation.id, annotation);
    return this.clone(annotation);
  }

  update(id: string, changes: UpdateAnnotationInput): Annotation {
    const annotation = this.requireAnnotation(id);
    const updated: Annotation = {
      ...annotation,
      ...changes,
      rect: changes.rect ? { ...changes.rect } : { ...annotation.rect },
      viewport: changes.viewport ? { ...changes.viewport } : annotation.viewport ? { ...annotation.viewport } : undefined,
      style: { ...annotation.style, ...changes.style },
      updatedAt: Date.now(),
    };
    if (changes.page !== undefined && (!Number.isInteger(changes.page) || changes.page < 1)) {
      throw new Error('Annotation page must be a positive integer');
    }
    this.validateRect(updated.rect);
    if (updated.viewport && (![updated.viewport.width, updated.viewport.height].every(Number.isFinite) ||
        updated.viewport.width <= 0 || updated.viewport.height <= 0)) {
      throw new Error('Annotation viewport dimensions must be positive and finite');
    }
    this.validateStyle(updated.style);
    this.annotations.set(id, updated);
    return this.clone(updated);
  }

  delete(id: string): boolean {
    return this.annotations.delete(id);
  }

  clearDocument(documentId: string): void {
    for (const annotation of this.annotations.values()) {
      if (annotation.documentId === documentId) this.annotations.delete(annotation.id);
    }
  }

  private requireAnnotation(id: string): Annotation {
    const annotation = this.annotations.get(id);
    if (!annotation) throw new Error(`Annotation not found: ${id}`);
    return annotation;
  }

  private validateRect(rect: Annotation['rect']): void {
    if (![rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) || rect.width <= 0 || rect.height <= 0) {
      throw new Error('Annotation rectangle must have finite coordinates and positive dimensions');
    }
  }

  private validateStyle(style: Annotation['style']): void {
    if (!style.color.trim()) throw new Error('Annotation color is required');
    if (!Number.isFinite(style.opacity) || style.opacity < 0 || style.opacity > 1) {
      throw new Error('Annotation opacity must be between 0 and 1');
    }
    if (style.strokeWidth !== undefined && (!Number.isFinite(style.strokeWidth) || style.strokeWidth <= 0)) {
      throw new Error('Annotation stroke width must be positive');
    }
  }

  private clone(annotation: Annotation): Annotation {
    return {
      ...annotation,
      rect: { ...annotation.rect },
      ...(annotation.viewport ? { viewport: { ...annotation.viewport } } : {}),
      style: { ...annotation.style },
    };
  }
}