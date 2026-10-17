export type AnnotationType = 'highlight' | 'comment' | 'sticky-note' | 'draw' | 'shape' | 'link';

export interface AnnotationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationViewport {
  width: number;
  height: number;
}

export interface AnnotationStyle {
  color: string;
  opacity: number;
  strokeWidth?: number;
}

export interface Annotation {
  id: string;
  documentId: string;
  page: number;
  type: AnnotationType;
  rect: AnnotationRect;
  viewport?: AnnotationViewport;
  style: AnnotationStyle;
  content?: string;
  author?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAnnotationInput {
  documentId: string;
  page: number;
  type: AnnotationType;
  rect: AnnotationRect;
  viewport?: AnnotationViewport;
  style?: Partial<AnnotationStyle>;
  content?: string;
  author?: string;
}

export interface UpdateAnnotationInput {
  page?: number;
  rect?: AnnotationRect;
  viewport?: AnnotationViewport;
  style?: Partial<AnnotationStyle>;
  content?: string;
  author?: string;
}
