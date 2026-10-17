import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { Store } from '@ngrx/store';
import { RuntimeService } from '@core/services/runtime.service';
import { PasswordResponses } from 'pdfjs-dist';
import { PdfDocumentService, LoadedPdfDocument, PdfPasswordCancelledError } from '../../services/pdf-document.service';
import { PdfRenderService } from '../../services/pdf-render.service';
import { HistoryService } from '../../services/history.service';
import { AnnotationService } from '../../services/annotation.service';
import { PdfPageOperationsService } from '../../services/pdf-page-operations.service';
import { PdfEditSerializationService } from '../../services/pdf-edit-serialization.service';
import { PdfFormField, PdfFormFieldPlacement, PdfFormService } from '../../services/pdf-form.service';
import { PdfMetadata, PdfPermissionPreset, PdfSecurityService } from '../../services/pdf-security.service';
import { PersistenceService } from '@core/services/persistence.service';
import { Annotation, AnnotationType } from '../../models/annotation.model';
import { recordEditCommand, redoEditCommand, undoEditCommand } from '../../store/workspace.actions';

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se';
type EditableObjectType = 'text' | 'image' | 'link';

interface EditableObject {
  id: string;
  type: EditableObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  text?: string;
  imageSrc?: string;
  url?: string;
}

interface SearchResult {
  page: number;
  count: number;
  excerpt: string;
}

interface PdfBookmark {
  title: string;
  page: number | null;
  depth: number;
}

interface CropRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface FormWidget {
  id: string;
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'dropdown';
  x: number;
  y: number;
  width: number;
  height: number;
  value: string;
  options: string[];
  option: string;
  date: boolean;
  readOnly: boolean;
  required: boolean;
}

interface FormVisibilityRule {
  targetFieldName: string;
  sourceFieldName: string;
  equalsValue: string;
}

interface SignatureAsset {
  id: string;
  name: string;
  kind: 'signature' | 'initials';
  data: string;
}

@Component({
  selector: 'app-pdf-workspace',
  standalone: false,
  template: `
    <div class="workspace-container">
      <div class="toolbar">
        <div class="toolbar-left">
          <h1>PDF Viewer & Editor</h1>
          <button (click)="openFile()">Open</button>
          <fieldset class="pdf-toolbar-actions" [disabled]="!!document?.isEncrypted">
          <button [disabled]="!document || loading" (click)="saveFile()">Save</button>
          <button [disabled]="!document || loading" (click)="saveFileAs()">Save As</button>
          <button *ngIf="document" (click)="openMetadataDialog()">Metadata</button>
          <button *ngIf="document" (click)="openProtectionDialog()">Protect PDF</button>
          <button [disabled]="!document || loading || totalPages <= 1" (click)="deleteCurrentPage()">Delete Page</button>
          <button [disabled]="!document || loading" (click)="insertPdfInput.click()">Insert PDF</button>
          <input #insertPdfInput type="file" accept="application/pdf,.pdf" hidden (change)="insertPagesFromFile($event)" />
          <button [disabled]="!document || loading" (click)="extractSelectedPages()">Extract Pages</button>
          <button [disabled]="!document || loading" (click)="mergePdfInput.click()">Merge PDFs</button>
          <input #mergePdfInput type="file" accept="application/pdf,.pdf" multiple hidden (change)="mergePdfsFromFiles($event)" />
          <button [disabled]="!document || loading" (click)="splitSelectedPages()">Split PDF</button>
          <button [disabled]="!document || loading" (click)="rotateSelectedPages(90)">Rotate 90</button>
          <button [disabled]="!document || loading" (click)="rotateSelectedPages(180)">Rotate 180</button>
          <button [disabled]="!document || loading" (click)="rotateSelectedPages(270)">Rotate 270</button>
          <button [disabled]="!document || loading" (click)="setCropMode(true)">Crop Page</button>
          <button [disabled]="!cropSelection" (click)="applyCropSelection()">Apply Crop</button>
          <button *ngIf="cropMode || cropSelection" (click)="setCropMode(false)">Cancel Crop</button>
          <button *ngIf="document" (click)="beginFormFieldAuthoring('text')" [attr.aria-pressed]="formAuthoringType === 'text'">Add Text Field</button>
          <button *ngIf="document" (click)="beginFormFieldAuthoring('checkbox')" [attr.aria-pressed]="formAuthoringType === 'checkbox'">Add Checkbox Field</button>
          <button *ngIf="document" (click)="beginFormFieldAuthoring('dropdown')" [attr.aria-pressed]="formAuthoringType === 'dropdown'">Add Dropdown Field</button>
          <button *ngIf="document" (click)="exportFormData()">Export Form Data</button>
          <button *ngIf="document" (click)="formDataInput.click()">Import Form Data</button>
          <input #formDataInput type="file" accept="application/json,.json" hidden (change)="importFormDataFile($event)" />
          <button *ngIf="selectedFormFieldName" (click)="toggleSelectedFieldRequired()">{{ selectedFormFieldRequired ? 'Mark Optional' : 'Mark Required' }}</button>
          <button *ngIf="selectedFormFieldName" (click)="editSelectedFormField()">Edit Field</button>
          <button *ngIf="selectedFormFieldName" (click)="deleteSelectedFormField()">Delete Field</button>
          <button *ngIf="selectedFormFieldName" (click)="setSelectedFieldCondition()">Set Visibility Rule</button>
          <button *ngIf="selectedFormFieldName && hasSelectedFieldCondition" (click)="clearSelectedFieldCondition()">Clear Visibility Rule</button>
          <button [disabled]="!document || loading" (click)="addTextObject()">Add Text</button>
          <button [disabled]="!document || loading" (click)="addImageObject()">Add Image</button>
          <button [disabled]="!document || loading" (click)="addLinkObject()">Add Link</button>
          <button *ngIf="document" (click)="openSignatureDialog('signature')">Add Signature</button>
          <button *ngIf="document" (click)="openSignatureDialog('initials')">Add Initials</button>
          <button *ngIf="document" (click)="setAnnotationTool('highlight')" [attr.aria-pressed]="annotationTool === 'highlight'">Highlight</button>
          <button *ngIf="document" (click)="setAnnotationTool('comment')" [attr.aria-pressed]="annotationTool === 'comment'">Comment</button>
          <button *ngIf="document" (click)="setAnnotationTool('draw')" [attr.aria-pressed]="annotationTool === 'draw'">Draw</button>
          <button *ngIf="annotationTool" (click)="setAnnotationTool(null)">Select</button>
          <label *ngIf="document" class="annotation-style">Color <input aria-label="Annotation color" type="color" [(ngModel)]="annotationColor" /></label>
          <label *ngIf="document" class="annotation-style">Opacity <input aria-label="Annotation opacity" type="range" min="0" max="1" step="0.05" [(ngModel)]="annotationOpacity" /></label>
          <button [disabled]="!selectedObjectId" (click)="editSelection()">Edit</button>
          <button [disabled]="!selectedObjectId" (click)="deleteSelection()">Delete</button>
          <button [disabled]="!canUndo" (click)="undoEdit()">Undo</button>
          <button [disabled]="!canRedo" (click)="redoEdit()">Redo</button>
          <button [disabled]="!selectedObjectId" (click)="cutSelection()">Cut</button>
          <button [disabled]="!selectedObjectId" (click)="copySelection()">Copy</button>
          <button [disabled]="!clipboardObject" (click)="pasteClipboard()">Paste</button>
          </fieldset>
        </div>

        <div class="toolbar-right">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            (keyup.enter)="searchInDocument()"
            placeholder="Search text"
          />
          <label><input type="checkbox" [(ngModel)]="searchCaseSensitive" /> Match case</label>
          <label><input type="checkbox" [(ngModel)]="searchRegexMode" /> Regex</label>
          <button [disabled]="!document || loading || searching" (click)="searchInDocument()">Search</button>
        </div>
      </div>

      <p *ngIf="document?.isEncrypted" role="status">
        This password-protected PDF is open in read-only mode. Editing and autosave are disabled.
      </p>

      <section *ngIf="passwordPrompt" role="dialog" aria-modal="true" aria-labelledby="pdf-password-title">
        <form (ngSubmit)="submitPasswordPrompt()">
          <h2 id="pdf-password-title">Password required</h2>
          <p>{{ passwordPromptMessage }}</p>
          <label>
            PDF password
            <input type="password" name="pdfPassword" [(ngModel)]="pdfPasswordInput" autocomplete="current-password" autofocus />
          </label>
          <button type="submit">Unlock PDF</button>
          <button type="button" (click)="cancelPasswordPrompt()">Cancel</button>
        </form>
      </section>

      <section *ngIf="metadataDialogOpen" role="dialog" aria-modal="true" aria-labelledby="pdf-metadata-title">
        <form (ngSubmit)="saveMetadata()">
          <h2 id="pdf-metadata-title">PDF metadata</h2>
          <label>Title <input name="metadataTitle" [(ngModel)]="metadata.title" /></label>
          <label>Author <input name="metadataAuthor" [(ngModel)]="metadata.author" /></label>
          <label>Subject <input name="metadataSubject" [(ngModel)]="metadata.subject" /></label>
          <label>Keywords <input name="metadataKeywords" [(ngModel)]="metadata.keywords" /></label>
          <button type="submit" [disabled]="loading">Save metadata</button>
          <button type="button" (click)="metadataDialogOpen = false">Cancel</button>
        </form>
      </section>

      <section *ngIf="protectionDialogOpen" role="dialog" aria-modal="true" aria-labelledby="pdf-protection-title">
        <form (ngSubmit)="protectCurrentPdf()">
          <h2 id="pdf-protection-title">Protect PDF</h2>
          <label>User password <input type="password" name="userPassword" [(ngModel)]="protectionUserPassword" autocomplete="new-password" /></label>
          <label>Confirm user password <input type="password" name="confirmUserPassword" [(ngModel)]="protectionUserPasswordConfirm" autocomplete="new-password" /></label>
          <label>Owner password <input type="password" name="ownerPassword" [(ngModel)]="protectionOwnerPassword" autocomplete="new-password" /></label>
          <label>Confirm owner password <input type="password" name="confirmOwnerPassword" [(ngModel)]="protectionOwnerPasswordConfirm" autocomplete="new-password" /></label>
          <label>
            Permissions
            <select name="permissionPreset" [(ngModel)]="permissionPreset">
              <option value="view">View only</option>
              <option value="print">Allow printing</option>
              <option value="forms">Allow form filling</option>
              <option value="unrestricted">Unrestricted</option>
            </select>
          </label>
          <p>Passwords must be at least 8 characters and must not match. The protected copy uses AES-256 encryption.</p>
          <button type="submit" [disabled]="loading">Create protected copy</button>
          <button type="button" (click)="closeProtectionDialog()">Cancel</button>
        </form>
      </section>

      <div class="viewer-controls" *ngIf="document">
        <button (click)="previousPage()" [disabled]="currentPage <= 1 || loading">?</button>
        <span>Page {{ currentPage }} / {{ totalPages }}</span>
        <button (click)="nextPage()" [disabled]="currentPage >= totalPages || loading">?</button>

        <button (click)="zoomOut()" [disabled]="loading">-</button>
        <span>{{ (zoom * 100).toFixed(0) }}%</span>
        <button (click)="zoomIn()" [disabled]="loading">+</button>

        <button (click)="rotateLeft()" [disabled]="loading">?</button>
        <button (click)="rotateRight()" [disabled]="loading">?</button>
      </div>

      <div class="content" #viewerHost>
        <div class="status" *ngIf="loading">Loading PDF...</div>
        <div class="status error" *ngIf="!loading && error">{{ error }}</div>
        <div class="status" *ngIf="!loading && !document && !error">Open a PDF to start.</div>

        <aside class="navigation-sidebar" *ngIf="document" aria-label="Page thumbnails and bookmarks">
          <h2>Pages</h2>
          <div class="thumbnail-viewport" (scroll)="onThumbnailScroll($event)" aria-label="Page thumbnails">
            <div class="thumbnail-spacer" [style.height.px]="totalPages * thumbnailItemHeight">
              <div class="thumbnail-item" *ngFor="let page of visibleThumbnailPages"
                [style.top.px]="(page - 1) * thumbnailItemHeight" [class.active]="page === currentPage"
                [attr.aria-label]="'Go to page ' + page" draggable="true"
                (dragstart)="startPageDrag($event, page)" (dragover)="allowPageDrop($event)" (drop)="dropPage($event, page)"
                role="group">
                <label><input type="checkbox" [checked]="selectedPages.includes(page)" (change)="togglePageSelection(page, $any($event.target).checked)" /> Select</label>
                <button type="button" class="thumbnail-navigate" (click)="goToPage(page)">
                  <img class="thumbnail-preview" [src]="thumbnailSources.get(page) || ''" [alt]="'Preview of page ' + page" />
                  <span>Page {{ page }}</span>
                  <span class="thumbnail-error" *ngIf="thumbnailRenderStates.get(page) === 'error'">Preview unavailable</span>
                </button>
              </div>
            </div>
          </div>
          <h2>Bookmarks</h2>
          <p *ngIf="thumbnailError" class="error" role="alert">{{ thumbnailError }}</p>
          <p *ngIf="bookmarksLoading">Loading bookmarks...</p>
          <p *ngIf="bookmarkError" class="error" role="alert">{{ bookmarkError }}</p>
          <p *ngIf="!bookmarksLoading && !bookmarkError && !bookmarks.length">No bookmarks</p>
          <ul class="bookmark-list">
            <li *ngFor="let bookmark of bookmarks" [style.padding-left.px]="bookmark.depth * 12">
              <button type="button" [disabled]="bookmark.page === null" (click)="navigateToBookmark(bookmark)">
                {{ bookmark.title }}{{ bookmark.page ? ' (page ' + bookmark.page + ')' : '' }}
              </button>
            </li>
          </ul>
        </aside>

        <div class="page-stage" *ngIf="document && !loading" #stageHost>
          <canvas #viewerCanvas></canvas>

          <div class="overlay-layer" #annotationLayer [class.annotation-mode]="annotationTool !== null" [class.crop-mode]="cropMode" [class.form-authoring-mode]="formAuthoringType !== null" [style.width.px]="overlayWidth" [style.height.px]="overlayHeight" (mousedown)="startAnnotation($event); startCrop($event); startFormFieldPlacement($event)" (mousemove)="moveAnnotation($event); moveCrop($event)" (mouseup)="finishAnnotation(); finishCrop()">
            <ng-container *ngFor="let annotation of pageAnnotations">
              <div *ngIf="annotation.type !== 'draw'" class="pdf-annotation" [class.pdf-highlight]="annotation.type === 'highlight'" [class.pdf-comment]="annotation.type === 'comment' || annotation.type === 'sticky-note'" [style.left.px]="annotation.rect.x" [style.top.px]="annotation.rect.y" [style.width.px]="annotation.rect.width" [style.height.px]="annotation.rect.height" [style.background-color]="annotationColorFor(annotation)" [style.opacity]="annotation.style.opacity" [title]="annotation.content || annotation.type"></div>
              <svg *ngIf="annotation.type === 'draw'" class="pdf-drawing" [style.left.px]="annotation.rect.x" [style.top.px]="annotation.rect.y" [style.width.px]="annotation.rect.width" [style.height.px]="annotation.rect.height" [attr.viewBox]="'0 0 ' + annotation.rect.width + ' ' + annotation.rect.height"><polyline [attr.points]="annotation.content" fill="none" [attr.stroke]="annotation.style.color" [attr.stroke-width]="annotation.style.strokeWidth || 2" [attr.opacity]="annotation.style.opacity" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
            </ng-container>
            <div *ngIf="annotationDraft" class="annotation-preview" [style.left.px]="annotationDraft.rect.x" [style.top.px]="annotationDraft.rect.y" [style.width.px]="annotationDraft.rect.width" [style.height.px]="annotationDraft.rect.height" [style.background-color]="annotationColor" [style.opacity]="annotationOpacity"></div>
            <div *ngIf="cropDraft || cropSelection" class="crop-preview"
              [style.left.px]="(cropDraft || cropSelection)?.x" [style.top.px]="(cropDraft || cropSelection)?.y"
              [style.width.px]="(cropDraft || cropSelection)?.width" [style.height.px]="(cropDraft || cropSelection)?.height">
              <span class="crop-handle nw" (mousedown)="startCropResize($event, 'nw')"></span>
              <span class="crop-handle ne" (mousedown)="startCropResize($event, 'ne')"></span>
              <span class="crop-handle sw" (mousedown)="startCropResize($event, 'sw')"></span>
              <span class="crop-handle se" (mousedown)="startCropResize($event, 'se')"></span>
            </div>
            <div *ngFor="let widget of formWidgets" class="pdf-form-widget"
              [style.left.px]="widget.x" [style.top.px]="widget.y"
              [style.width.px]="widget.width" [style.height.px]="widget.height"
              [class.selected-form-field]="widget.name === selectedFormFieldName"
              (mousedown)="$event.stopPropagation()" (click)="selectFormField(widget)">
              <span *ngIf="widget.required" class="required-field-marker" aria-label="Required field">*</span>
              <input *ngIf="widget.type === 'text'" [type]="widget.date ? 'date' : 'text'"
                [attr.aria-label]="widget.name" [ngModel]="widget.value" [disabled]="widget.readOnly"
                (change)="updateFormField(widget, $any($event.target).value)" />
              <input *ngIf="widget.type === 'checkbox'" type="checkbox" [attr.aria-label]="widget.name"
                [checked]="widget.value === 'true'" [disabled]="widget.readOnly"
                (change)="updateFormField(widget, $any($event.target).checked ? 'true' : 'false')" />
              <input *ngIf="widget.type === 'radio'" type="radio" [name]="widget.name"
                [attr.aria-label]="widget.name + ' ' + widget.option" [value]="widget.option"
                [checked]="widget.value === widget.option" [disabled]="widget.readOnly"
                (change)="updateFormField(widget, widget.option)" />
              <select *ngIf="widget.type === 'dropdown'" [attr.aria-label]="widget.name"
                [ngModel]="widget.value" [disabled]="widget.readOnly"
                (change)="updateFormField(widget, $any($event.target).value)">
                <option *ngFor="let option of widget.options" [value]="option">{{ option }}</option>
              </select>
            </div>
            <div
              *ngFor="let object of overlayObjects"
              class="overlay-object"
              [class.selected]="object.id === selectedObjectId"
              [style.left.px]="object.x"
              [style.top.px]="object.y"
              [style.width.px]="object.width"
              [style.height.px]="object.height"
              [class.overlay-text]="object.type === 'text'"
              [class.overlay-image]="object.type === 'image'"
              [class.overlay-link]="object.type === 'link'"
              [class.overlay-signature]="object.label === 'Signature' || object.label === 'Initials'"
              (mousedown)="startMove($event, object.id)"
            >
              <div class="overlay-label">{{ object.label }}</div>
              <div *ngIf="object.type === 'text'" class="overlay-text-content">{{ object.text }}</div>
              <img
                *ngIf="object.type === 'image' && object.imageSrc"
                class="overlay-image-content"
                [src]="object.imageSrc"
                [alt]="object.label"
                draggable="false"
              />
              <a
                *ngIf="object.type === 'link'"
                class="overlay-link-content"
                [href]="object.url || '#'"
                target="_blank"
                rel="noreferrer"
                (click)="$event.stopPropagation()"
              >
                {{ object.text || object.url }}
              </a>

              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle nw"
                type="button"
                aria-label="Resize northwest"
                (mousedown)="startResize($event, object.id, 'nw')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle ne"
                type="button"
                aria-label="Resize northeast"
                (mousedown)="startResize($event, object.id, 'ne')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle sw"
                type="button"
                aria-label="Resize southwest"
                (mousedown)="startResize($event, object.id, 'sw')"
              ></button>
              <button
                *ngIf="object.id === selectedObjectId"
                class="resize-handle se"
                type="button"
                aria-label="Resize southeast"
                (mousedown)="startResize($event, object.id, 'se')"
              ></button>
            </div>
          </div>
        </div>
      </div>

<aside class="annotation-panel" *ngIf="document" aria-label="PDF annotations">
        <h2>Annotations ({{ annotations.length }})</h2>
        <label>Filter annotations
          <select [(ngModel)]="annotationFilter" aria-label="Filter annotations">
            <option value="all">All types</option><option value="highlight">Highlights</option><option value="comment">Comments</option><option value="sticky-note">Sticky notes</option><option value="draw">Drawings</option>
          </select>
        </label>
        <input type="search" [(ngModel)]="annotationSearch" aria-label="Search annotations" placeholder="Search annotations" />
        <ul><li *ngFor="let annotation of visibleAnnotations">
          <button type="button" class="annotation-jump" (click)="jumpToAnnotation(annotation)">{{ annotation.type }} ? page {{ annotation.page }}{{ annotation.content ? ': ' + annotation.content : '' }}</button>
          <button type="button" (click)="editAnnotation(annotation)">Edit</button><button type="button" (click)="deleteAnnotation(annotation)">Delete</button>
        </li></ul>
      </aside>
      <div class="search-result" *ngIf="searchMessage">{{ searchMessage }}</div>
      <nav class="search-results" *ngIf="searchResults.length" aria-label="PDF search results">
        <button type="button" (click)="previousSearchResult()">Previous match</button>
        <span>Result {{ currentSearchResultIndex + 1 }} of {{ searchResults.length }} pages</span>
        <button type="button" (click)="nextSearchResult()">Next match</button>
        <ul>
          <li *ngFor="let result of searchResults; let i = index">
            <button type="button" [attr.aria-current]="i === currentSearchResultIndex ? 'page' : null" (click)="navigateToSearchResult(i)">
              Page {{ result.page }} ({{ result.count }} matches):
              <ng-container *ngFor="let part of searchResultParts(result.excerpt)"><mark *ngIf="part.match">{{ part.text }}</mark><ng-container *ngIf="!part.match">{{ part.text }}</ng-container></ng-container>
            </button>
          </li>
        </ul>
      </nav>
      <div class="signature-backdrop" *ngIf="signatureDialogOpen">
        <section class="signature-dialog" role="dialog" aria-modal="true" aria-labelledby="signature-dialog-title">
          <h2 id="signature-dialog-title">{{ signatureKind === 'signature' ? 'Add signature' : 'Add initials' }}</h2>
          <div class="signature-modes" role="group" aria-label="Signature input method">
            <button type="button" (click)="setSignatureMode('draw')" [attr.aria-pressed]="signatureMode === 'draw'">Draw</button>
            <button type="button" (click)="setSignatureMode('type')" [attr.aria-pressed]="signatureMode === 'type'">Type</button>
            <button type="button" (click)="setSignatureMode('upload')" [attr.aria-pressed]="signatureMode === 'upload'">Upload</button>
          </div>
          <canvas *ngIf="signatureMode === 'draw'" #signatureCanvas class="signature-pad" width="420" height="150"
            aria-label="Draw signature" (pointerdown)="startSignatureStroke($event)"
            (pointermove)="continueSignatureStroke($event)" (pointerup)="finishSignatureStroke()"
            (pointercancel)="finishSignatureStroke()"></canvas>
          <label *ngIf="signatureMode === 'type'" class="signature-type">
            Type {{ signatureKind }} <input type="text" [(ngModel)]="signatureText" maxlength="80" />
          </label>
          <label *ngIf="signatureMode === 'upload'" class="signature-upload">
            Choose PNG or JPEG <input type="file" accept="image/png,image/jpeg" (change)="loadSignatureFile($event)" />
          </label>
          <div class="signature-reusable" *ngIf="signatureAssets.length">
            <h3>Reusable locally saved items</h3>
            <button *ngFor="let asset of signatureAssets" type="button" (click)="placeSignatureAsset(asset)">
              Use {{ asset.name }} ({{ asset.kind }})
            </button>
          </div>
          <div class="signature-dialog-actions">
            <button type="button" [disabled]="!signatureReady" (click)="saveReusableSignature()">Save for reuse</button>
            <button type="button" [disabled]="!signatureReady" (click)="placeCurrentSignature()">Place on page</button>
            <button type="button" (click)="closeSignatureDialog()">Cancel</button>
          </div>
          <p *ngIf="signatureError" class="error" role="alert">{{ signatureError }}</p>
        </section>
      </div>
    </div>
  `,
  styles: [
    `
      .workspace-container {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
      }

      .toolbar-left,
      .toolbar-right {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .toolbar h1 {
        margin-right: 8px;
        font-size: 18px;
        font-weight: 600;
      }

      button {
        padding: 6px 12px;
        border: 1px solid #c9c9c9;
        border-radius: 4px;
        background: white;
        cursor: pointer;
      }

      button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }

      input {
        padding: 6px 8px;
        border: 1px solid #c9c9c9;
        border-radius: 4px;
      }

      .viewer-controls {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-bottom: 1px solid #e1e1e1;
        background: #fafafa;
      }

      .content {
        flex: 1;
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
        overflow: auto;
        background: #e0e0e0;
        padding: 16px;
      }

      .navigation-sidebar { flex: 0 0 190px; max-height: 100%; overflow: auto; margin-right: 16px; padding: 8px; background: #fff; }
      .navigation-sidebar h2 { margin: 4px 0 8px; font-size: 14px; }
      .thumbnail-viewport { height: 360px; overflow-y: auto; position: relative; border: 1px solid #ddd; }
      .thumbnail-spacer { position: relative; }
      .thumbnail-item { position: absolute; left: 0; width: 100%; height: 136px; display: flex; flex-direction: column; align-items: center; padding: 4px; }
      .thumbnail-item.active { outline: 2px solid #2059d0; outline-offset: -2px; }
      .thumbnail-navigate { display: flex; flex-direction: column; align-items: center; padding: 0; }
      .thumbnail-preview { width: 120px; height: 84px; object-fit: contain; background: #eee; }
      .thumbnail-error { color: #b00020; font-size: 11px; }
      .bookmark-list { list-style: none; padding: 0; margin: 0; }
      .bookmark-list button { width: 100%; text-align: left; }

      .page-stage {
        position: relative;
        display: inline-block;
        margin: 0 auto;
      }

      canvas {
        background: white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        display: block;
      }

      .overlay-layer {
        position: absolute;
        left: 0;
        top: 0;
        pointer-events: none;
      }

      .overlay-layer.annotation-mode { pointer-events: auto; cursor: crosshair; }
      .overlay-layer.crop-mode { pointer-events: auto; cursor: crosshair; }
      .pdf-form-widget { position: absolute; pointer-events: auto; display: flex; align-items: stretch; }
      .pdf-form-widget.selected-form-field { outline: 2px solid #2059d0; }
      .required-field-marker { position: absolute; right: 2px; top: -13px; color: #b00020; font-size: 12px; }
      .overlay-layer.form-authoring-mode { pointer-events: auto; cursor: crosshair; }
      .pdf-form-widget input:not([type='checkbox']):not([type='radio']), .pdf-form-widget select {
        width: 100%; min-width: 0; height: 100%; box-sizing: border-box; padding: 1px 3px;
        border: 1px solid rgba(32, 89, 208, .8); background: rgba(255, 255, 255, .88);
        font: inherit; font-size: 12px;
      }
      .pdf-form-widget input[type='checkbox'], .pdf-form-widget input[type='radio'] { margin: auto; }
      .overlay-signature .overlay-text-content { font-family: cursive; font-style: italic; font-size: 24px; color: #17397e; }
      .signature-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,.45); }
      .signature-dialog { width: min(520px, calc(100vw - 32px)); max-height: 90vh; overflow: auto; padding: 20px; background: #fff; border-radius: 8px; box-shadow: 0 8px 32px rgba(0,0,0,.3); }
      .signature-dialog h2 { margin-top: 0; }
      .signature-modes, .signature-dialog-actions, .signature-reusable { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; }
      .signature-pad { display: block; width: 100%; height: 150px; border: 1px solid #777; background: #fff; touch-action: none; cursor: crosshair; }
      .signature-type, .signature-upload { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; }
      .signature-type input { font-family: cursive; font-size: 24px; }
      .signature-reusable { flex-direction: column; }
      .signature-reusable h3 { margin: 4px 0; font-size: 14px; }
      .signature-dialog-actions { justify-content: flex-end; }
      .pdf-annotation, .pdf-drawing, .annotation-preview { position: absolute; pointer-events: none; box-sizing: border-box; }
      .pdf-highlight { border-radius: 2px; }
      .pdf-comment { border: 1px solid #8a6d00; border-radius: 3px; }
      .annotation-preview { border: 1px dashed #333; }
      .crop-preview { position: absolute; border: 2px solid #1b5e20; box-shadow: 0 0 0 9999px rgba(0,0,0,.25); pointer-events: none; box-sizing: border-box; }
      .crop-handle { position: absolute; width: 8px; height: 8px; background: #fff; border: 1px solid #1b5e20; pointer-events: auto; }
      .crop-handle.nw { left: -5px; top: -5px; } .crop-handle.ne { right: -5px; top: -5px; }
      .crop-handle.sw { left: -5px; bottom: -5px; } .crop-handle.se { right: -5px; bottom: -5px; }
      .annotation-panel { max-height: 180px; overflow: auto; padding: 8px 16px; border-top: 1px solid #ddd; background: #fff; }
      .annotation-panel h2 { margin: 0 0 8px; font-size: 15px; }
      .annotation-panel ul { list-style: none; margin: 8px 0 0; padding: 0; }
      .annotation-panel li { display: flex; gap: 6px; align-items: center; margin: 4px 0; }
      .annotation-panel .annotation-jump { flex: 1; text-align: left; }
      .annotation-style { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; }
      .annotation-style input[type='color'] { width: 26px; height: 24px; padding: 0; }

      .overlay-object {
        position: absolute;
        border: 2px solid #5b8def;
        background: rgba(91, 141, 239, 0.12);
        pointer-events: auto;
        user-select: none;
        box-sizing: border-box;
        overflow: hidden;
      }

      .overlay-object.selected {
        border-color: #2059d0;
        background: rgba(32, 89, 208, 0.16);
      }

      .overlay-label {
        font-size: 12px;
        color: #17397e;
        padding: 2px 4px;
      }

      .overlay-text-content {
        padding: 4px;
        font-size: 13px;
        line-height: 1.35;
      }

      .overlay-image-content {
        width: 100%;
        height: calc(100% - 20px);
        object-fit: contain;
        display: block;
        pointer-events: none;
      }

      .overlay-link-content {
        display: block;
        padding: 4px;
        color: #0f57d4;
        text-decoration: underline;
        font-size: 13px;
      }

      .resize-handle {
        position: absolute;
        width: 10px;
        height: 10px;
        border: 1px solid #0e2b66;
        background: white;
        border-radius: 50%;
        padding: 0;
      }

      .resize-handle.nw {
        left: -6px;
        top: -6px;
        cursor: nwse-resize;
      }

      .resize-handle.ne {
        right: -6px;
        top: -6px;
        cursor: nesw-resize;
      }

      .resize-handle.sw {
        left: -6px;
        bottom: -6px;
        cursor: nesw-resize;
      }

      .resize-handle.se {
        right: -6px;
        bottom: -6px;
        cursor: nwse-resize;
      }

      .status {
        padding: 12px;
        background: white;
        border-radius: 4px;
      }

      .error {
        color: #b00020;
      }

      .search-result {
        padding: 8px 16px;
        border-top: 1px solid #ddd;
        background: #f9f9f9;
      }

      .search-results {
        max-height: 180px;
        overflow: auto;
        padding: 8px 16px;
        border-top: 1px solid #ddd;
      }

      .pdf-toolbar-actions {
        display: contents;
        border: 0;
        margin: 0;
        min-width: 0;
        padding: 0;
      }
    `,
  ],
})
export class PdfWorkspaceComponent implements AfterViewChecked, OnDestroy {
  @ViewChild('viewerCanvas') viewerCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('viewerHost') viewerHost?: ElementRef<HTMLDivElement>;
  @ViewChild('stageHost') stageHost?: ElementRef<HTMLDivElement>;
  @ViewChild('annotationLayer') annotationLayer?: ElementRef<HTMLDivElement>;
  @ViewChild('signatureCanvas') signatureCanvas?: ElementRef<HTMLCanvasElement>;

  document: LoadedPdfDocument | null = null;
  loading = false;
  error: string | null = null;
  searchQuery = '';
  searchMessage = '';
  searchCaseSensitive = false;
  searchRegexMode = false;
  searching = false;
  searchResults: SearchResult[] = [];
  currentSearchResultIndex = 0;
  visibleThumbnailPages: number[] = [];
  thumbnailItemHeight = 140;
  readonly thumbnailRenderStates = new Map<number, 'loading' | 'ready' | 'error'>();
  readonly thumbnailSources = new Map<number, string>();
  thumbnailError: string | null = null;
  bookmarks: PdfBookmark[] = [];
  bookmarksLoading = false;
  bookmarkError: string | null = null;
  formWidgets: FormWidget[] = [];
  formFields: PdfFormField[] = [];
  formAuthoringType: PdfFormFieldPlacement['type'] | null = null;
  selectedFormFieldName: string | null = null;
  formVisibilityRules: FormVisibilityRule[] = [];
  signatureDialogOpen = false;
  signatureKind: SignatureAsset['kind'] = 'signature';
  signatureMode: 'draw' | 'type' | 'upload' = 'draw';
  signatureText = '';
  signatureAssets: SignatureAsset[] = [];
  signatureError: string | null = null;
  passwordPrompt = false;
  passwordPromptMessage = '';
  pdfPasswordInput = '';
  metadataDialogOpen = false;
  metadata: PdfMetadata = { title: '', author: '', subject: '', keywords: '' };
  protectionDialogOpen = false;
  protectionUserPassword = '';
  protectionUserPasswordConfirm = '';
  protectionOwnerPassword = '';
  protectionOwnerPasswordConfirm = '';
  permissionPreset: PdfPermissionPreset = 'view';
  selectedPages: number[] = [];
  cropMode = false;
  cropDraft: CropRectangle | null = null;
  cropSelection: CropRectangle | null = null;

  currentPage = 1;
  totalPages = 0;
  zoom = 1;
  rotation = 0;

  overlayObjects: EditableObject[] = [];
  selectedObjectId: string | null = null;
  clipboardObject: EditableObject | null = null;
  overlayWidth = 0;
  overlayHeight = 0;
  canUndo = false;
  canRedo = false;
  annotations: Annotation[] = [];
  annotationTool: 'highlight' | 'comment' | 'draw' | null = null;
  annotationFilter = 'all';
  annotationSearch = '';
  annotationColor = '#ffeb3b';
  annotationOpacity = 0.45;
  annotationDraft: { type: AnnotationType; rect: { x: number; y: number; width: number; height: number }; content: string; startX: number; startY: number; points: string[] } | null = null;

  private dragState:
    | {
        mode: 'move' | 'resize';
        objectId: string;
        startX: number;
        startY: number;
        original: EditableObject;
        handle?: ResizeHandle;
      }
    | null = null;
  private searchIndex: { documentId: string; pages: string[] } | null = null;
  private readonly thumbnailRenderScheduled = new Set<number>();
  private readonly pageTransformUndo: Uint8Array[] = [];
  private readonly pageTransformRedo: Uint8Array[] = [];
  private cropStartX = 0;
  private cropStartY = 0;
  private signatureDataUrl = '';
  private signatureHasMarks = false;
  private drawingSignature = false;
  private cropResizeState: { handle: 'nw' | 'ne' | 'sw' | 'se'; original: CropRectangle; startX: number; startY: number } | null = null;
  private draggedPage: number | null = null;
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;
  private savedFilePath: string | null = null;
  private passwordResolver: ((password: string | null) => void) | null = null;

  constructor(
    private store: Store,
    private runtimeService: RuntimeService,
    private pdfDocumentService: PdfDocumentService,
    private pdfRenderService: PdfRenderService,
    private historyService: HistoryService<EditableObject[]>,
    private annotationService: AnnotationService,
    private pageOperationsService: PdfPageOperationsService,
    private editSerializationService: PdfEditSerializationService,
    private pdfFormService: PdfFormService,
    private pdfSecurityService: PdfSecurityService,
    private persistenceService: PersistenceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngAfterViewChecked(): void {
    this.renderVisibleThumbnails();
  }

  ngOnDestroy(): void {
    this.cancelPasswordPrompt();
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
      void this.autosaveNow();
    }
  }

  async openFile(): Promise<void> {
    try {
      if (this.autosaveTimer) {
        clearTimeout(this.autosaveTimer);
        this.autosaveTimer = null;
        if (!(await this.autosaveNow())) return;
      }
      this.loading = true;
      this.error = null;
      this.searchMessage = '';
      this.searchIndex = null;

      const result = await this.runtimeService.openFileDialog();
      if (result.canceled || !result.file) {
        this.loading = false;
        return;
      }

      this.document = await this.pdfDocumentService.loadFromFile(
        result.file,
        reason => this.requestPdfPassword(reason)
      );
      this.formWidgets = [];
      this.formFields = [];
      this.formVisibilityRules = [];
      this.savedFilePath = this.runtimeService.isDesktop() ? result.fileName ?? null : null;
      const autosaveData = await this.persistenceService.getAutosaveData(this.document.id);
      if (autosaveData && !this.sameBytes(this.document.bytes, new Uint8Array(autosaveData))) {
        if (window.confirm(`Recover the autosaved version of ${this.document.name}?`)) {
          this.document = await this.pdfDocumentService.replaceCurrentDocumentBytes(new Uint8Array(autosaveData));
        } else {
          await this.persistenceService.clearAutosave(this.document.id);
        }
      } else if (autosaveData) {
        await this.persistenceService.clearAutosave(this.document.id);
      }
      this.totalPages = this.document.totalPages;
      this.thumbnailRenderStates.clear();
      this.thumbnailSources.clear();
      this.thumbnailRenderScheduled.clear();
      this.thumbnailError = null;
      this.visibleThumbnailPages = [];
      this.updateThumbnailWindow(0, 360);
      await this.loadBookmarks();
      this.currentPage = 1;
      this.zoom = 1;
      this.rotation = 0;
      this.overlayObjects = [];
      this.annotations = this.annotationService.list(this.document.id);
      this.annotationTool = null;
      this.annotationDraft = null;
      this.selectedObjectId = null;
      this.clipboardObject = null;
      this.historyService.clear();
      this.syncHistoryState();
      this.loading = false;
      this.cdr.detectChanges();

      await this.renderCurrentPage();
    } catch (err) {
      this.error = err instanceof PdfPasswordCancelledError
        ? null
        : err instanceof Error ? err.message : 'Failed to open PDF';
      this.loading = false;
    }
  }

  async saveFile(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    await this.saveCurrentPdf(false);
  }

  async saveFileAs(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    await this.saveCurrentPdf(true);
  }

  openMetadataDialog(): void {
    if (!this.document || this.document.isEncrypted) return;
    this.error = null;
    void this.pdfSecurityService.getMetadata(this.document.bytes).then(
      metadata => {
        this.metadata = metadata;
        this.metadataDialogOpen = true;
      },
      error => {
        this.error = `Unable to read PDF metadata: ${error instanceof Error ? error.message : String(error)}`;
      }
    );
  }

  async saveMetadata(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    this.loading = true;
    try {
      const updatedBytes = await this.pdfSecurityService.updateMetadata(this.document.bytes, this.metadata);
      this.document = await this.pdfDocumentService.replaceCurrentDocumentBytes(updatedBytes);
      this.metadataDialogOpen = false;
      await this.renderCurrentPage();
      this.scheduleAutosave();
      this.error = null;
    } catch (error) {
      this.error = `Unable to update PDF metadata: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.loading = false;
    }
  }

  openProtectionDialog(): void {
    if (!this.document || this.document.isEncrypted) return;
    this.protectionUserPassword = '';
    this.protectionUserPasswordConfirm = '';
    this.protectionOwnerPassword = '';
    this.protectionOwnerPasswordConfirm = '';
    this.permissionPreset = 'view';
    this.error = null;
    this.protectionDialogOpen = true;
  }

  closeProtectionDialog(): void {
    this.protectionDialogOpen = false;
    this.protectionUserPassword = '';
    this.protectionUserPasswordConfirm = '';
    this.protectionOwnerPassword = '';
    this.protectionOwnerPasswordConfirm = '';
  }

  async protectCurrentPdf(): Promise<void> {
    if (!this.document || this.document.isEncrypted) return;
    if (this.protectionUserPassword !== this.protectionUserPasswordConfirm ||
      this.protectionOwnerPassword !== this.protectionOwnerPasswordConfirm) {
      this.error = 'Password confirmation does not match';
      return;
    }

    this.loading = true;
    try {
      const bytes = await this.serializeCurrentDocument();
      const protectedBytes = await this.pdfSecurityService.protect(bytes, {
        userPassword: this.protectionUserPassword,
        ownerPassword: this.protectionOwnerPassword,
        permissionPreset: this.permissionPreset,
      });
      const name = `${this.document.name.replace(/\.pdf$/i, '')}-protected.pdf`;
      const result = await this.runtimeService.saveFileDialog(name, this.toArrayBuffer(protectedBytes));
      if (!result.canceled) {
        this.protectionDialogOpen = false;
        this.error = null;
      }
    } catch (error) {
      this.error = `Unable to protect PDF: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.loading = false;
      this.protectionUserPassword = '';
      this.protectionUserPasswordConfirm = '';
      this.protectionOwnerPassword = '';
      this.protectionOwnerPasswordConfirm = '';
    }
  }

  private requestPdfPassword(reason: number): Promise<string | null> {
    if (this.passwordResolver) this.passwordResolver(null);
    this.passwordPromptMessage = reason === PasswordResponses.INCORRECT_PASSWORD
      ? 'The password was incorrect. Try again.'
      : 'Enter the password to open this protected PDF.';
    this.pdfPasswordInput = '';
    this.passwordPrompt = true;
    this.cdr.detectChanges();
    return new Promise(resolve => {
      this.passwordResolver = resolve;
    });
  }

  submitPasswordPrompt(): void {
    const resolver = this.passwordResolver;
    if (!resolver) return;
    const password = this.pdfPasswordInput;
    this.passwordResolver = null;
    this.passwordPrompt = false;
    this.pdfPasswordInput = '';
    resolver(password);
  }

  cancelPasswordPrompt(): void {
    const resolver = this.passwordResolver;
    this.passwordResolver = null;
    this.passwordPrompt = false;
    this.pdfPasswordInput = '';
    resolver?.(null);
  }

  async autosaveNow(): Promise<boolean> {
    if (!this.document || this.document.isEncrypted) return true;
    try {
      const bytes = await this.serializeCurrentDocument();
      const data = this.toArrayBuffer(bytes);
      await this.persistenceService.saveAutosave(this.document.id, data);
      return true;
    } catch (error) {
      this.error = `Autosave failed: ${error instanceof Error ? error.message : String(error)}`;
      return false;
    }
  }

  private async saveCurrentPdf(saveAs: boolean): Promise<void> {
    if (!this.document) return;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
    const documentId = this.document.id;
    let saved = false;
    try {
      const bytes = await this.serializeCurrentDocument();
      const data = this.toArrayBuffer(bytes);
      if (!saveAs && this.savedFilePath && this.runtimeService.isDesktop()) {
        await this.runtimeService.writeFile(this.savedFilePath, data);
      } else {
        const result = await this.runtimeService.saveFileDialog(this.document.name, data);
        if (result.canceled) return;
        this.savedFilePath = this.runtimeService.isDesktop() ? result.filePath ?? null : null;
      }
      saved = true;
    } catch (error) {
      this.error = `Save failed: ${error instanceof Error ? error.message : String(error)}`;
      return;
    }
    if (saved) {
      try {
        await this.persistenceService.clearAutosave(documentId);
        this.error = null;
      } catch (error) {
        this.error = `PDF saved, but its recovery snapshot could not be cleared: ${error instanceof Error ? error.message : String(error)}`;
      }
    }
  }

  private async serializeCurrentDocument(): Promise<Uint8Array> {
    if (!this.document) throw new Error('No document loaded');
    if (this.document.isEncrypted) throw new Error('Password-protected PDFs are read-only in this workspace');
    return this.editSerializationService.flattenEdits(
      this.document.bytes,
      this.currentPage,
      this.overlayWidth,
      this.overlayHeight,
      this.overlayObjects,
      this.annotations
    );
  }

  private toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const data = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(data).set(bytes);
    return data;
  }

  private sameBytes(left: Uint8Array, right: Uint8Array): boolean {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  private scheduleAutosave(): void {
    if (!this.document || this.document.isEncrypted) return;
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      this.autosaveTimer = null;
      void this.autosaveNow();
    }, 800);
  }

  async previousPage(): Promise<void> {
    if (this.currentPage <= 1 || this.loading) {
      return;
    }

    this.currentPage -= 1;
    await this.renderCurrentPage();
  }

  async nextPage(): Promise<void> {
    if (this.currentPage >= this.totalPages || this.loading) {
      return;
    }

    this.currentPage += 1;
    await this.renderCurrentPage();
  }

  onThumbnailScroll(event: Event): void {
    const viewport = event.currentTarget as HTMLElement;
    this.updateThumbnailWindow(viewport.scrollTop, viewport.clientHeight);
  }

  async goToPage(page: number): Promise<void> {
    if (!this.document || !Number.isInteger(page) || page < 1 || page > this.document.totalPages) return;
    this.currentPage = page;
    await this.renderCurrentPage();
  }

  async loadBookmarks(): Promise<void> {
    if (!this.document) return;
    this.bookmarks = [];
    this.bookmarkError = null;
    const document = this.document;
    if (typeof document.proxy?.getOutline !== 'function') return;

    this.bookmarksLoading = true;
    try {
      const outline = await document.proxy.getOutline();
      const flatten = async (items: any[], depth: number): Promise<void> => {
        for (const item of items) {
          let page: number | null = null;
          const destination = typeof item.dest === 'string'
            ? await document.proxy.getDestination(item.dest)
            : item.dest;
          if (Array.isArray(destination) && destination[0] && typeof document.proxy.getPageIndex === 'function') {
            const pageIndex = await document.proxy.getPageIndex(destination[0]);
            if (Number.isInteger(pageIndex) && pageIndex >= 0 && pageIndex < document.totalPages) page = pageIndex + 1;
          }
          this.bookmarks.push({ title: String(item.title ?? 'Untitled bookmark'), page, depth });
          if (Array.isArray(item.items) && item.items.length) await flatten(item.items, depth + 1);
        }
      };
      if (Array.isArray(outline)) await flatten(outline, 0);
    } catch (error) {
      this.bookmarks = [];
      this.bookmarkError = `Unable to load PDF bookmarks: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.bookmarksLoading = false;
    }
  }

  async navigateToBookmark(bookmark: PdfBookmark): Promise<void> {
    if (bookmark.page !== null) await this.goToPage(bookmark.page);
  }

  async deleteCurrentPage(): Promise<void> {
    if (!this.document || this.totalPages <= 1) return;
    if (!window.confirm(`Delete page ${this.currentPage}?`)) return;
    try {
      const bytes = await this.pageOperationsService.deletePage(this.document.bytes, this.currentPage);
      await this.refreshDocumentAfterPageOperation(bytes, Math.min(this.currentPage, this.totalPages - 1));
    } catch (error) {
      this.error = `Unable to delete page: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async insertPagesFromFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!this.document || !file) return;
    try {
      const sourceBytes = new Uint8Array(await file.arrayBuffer());
      const bytes = await this.pageOperationsService.insertPages(
        this.document.bytes,
        sourceBytes,
        this.currentPage
      );
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage + 1);
    } catch (error) {
      this.error = `Unable to insert PDF pages: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      input.value = '';
    }
  }

  async extractSelectedPages(): Promise<void> {
    if (!this.document) return;
    const selection = window.prompt('Page range to extract (for example, 1-3,5):');
    if (selection === null) return;
    try {
      const bytes = await this.pageOperationsService.extractPages(this.document.bytes, selection);
      await this.savePdfBytes(`${this.document.name.replace(/\.pdf$/i, '')}-extracted.pdf`, bytes);
      this.error = null;
    } catch (error) {
      this.error = `Unable to extract pages: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async mergePdfsFromFiles(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (!this.document || !files.length) return;
    try {
      const sources = await Promise.all(files.map(async file => new Uint8Array(await file.arrayBuffer())));
      const bytes = await this.pageOperationsService.mergePdfs([this.document.bytes, ...sources]);
      await this.savePdfBytes(`${this.document.name.replace(/\.pdf$/i, '')}-merged.pdf`, bytes);
      this.error = null;
    } catch (error) {
      this.error = `Unable to merge PDFs: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      input.value = '';
    }
  }

  async splitSelectedPages(): Promise<void> {
    if (!this.document) return;
    const selection = window.prompt('Page ranges for separate PDFs (for example, 1-3,4-6):');
    if (selection === null) return;
    try {
      const parts = await this.pageOperationsService.splitByPageRanges(this.document.bytes, selection);
      const baseName = this.document.name.replace(/\.pdf$/i, '') || 'document';
      for (let index = 0; index < parts.length; index++) {
        await this.savePdfBytes(`${baseName}-part-${index + 1}.pdf`, parts[index]);
      }
      this.error = null;
    } catch (error) {
      this.error = `Unable to split PDF: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async savePdfBytes(name: string, bytes: Uint8Array): Promise<void> {
    const data = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(data).set(bytes);
    await this.runtimeService.saveFileDialog(name, data);
  }

  startPageDrag(event: DragEvent, page: number): void {
    this.draggedPage = page;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(page));
    }
  }

  allowPageDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
  }

  async dropPage(event: DragEvent, targetPage: number): Promise<void> {
    event.preventDefault();
    const sourcePage = this.draggedPage;
    this.draggedPage = null;
    if (!this.document || sourcePage === null || sourcePage === targetPage) return;
    try {
      const bytes = await this.pageOperationsService.reorderPage(this.document.bytes, sourcePage, targetPage);
      await this.refreshDocumentAfterPageOperation(bytes, targetPage);
    } catch (error) {
      this.error = `Unable to reorder pages: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  togglePageSelection(page: number, selected: boolean): void {
    this.selectedPages = selected
      ? [...new Set([...this.selectedPages, page])]
      : this.selectedPages.filter(item => item !== page);
  }

  async rotateSelectedPages(rotation: 90 | 180 | 270): Promise<void> {
    if (!this.document) return;
    const pageNumbers = this.selectedPages.length ? this.selectedPages : [this.currentPage];
    try {
      const bytes = await this.pageOperationsService.rotatePages(this.document.bytes, pageNumbers, rotation);
      await this.recordPageTransformation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to rotate pages: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  setCropMode(enabled: boolean): void {
    this.cropMode = enabled;
    this.cropDraft = null;
    this.cropSelection = null;
    if (enabled) this.setAnnotationTool(null);
  }

  startCrop(event: MouseEvent): void {
    if (!this.cropMode || this.cropSelection || !this.document || event.button !== 0) return;
    event.preventDefault();
    const point = this.annotationPoint(event);
    this.cropStartX = point.x;
    this.cropStartY = point.y;
    this.cropDraft = { x: point.x, y: point.y, width: 1, height: 1 };
  }

  moveCrop(event: MouseEvent): void {
    if (!this.cropMode) return;
    if (this.cropResizeState && this.cropSelection) {
      const point = this.annotationPoint(event);
      const { handle, original, startX, startY } = this.cropResizeState;
      const dx = point.x - startX;
      const dy = point.y - startY;
      const left = handle.includes('w') ? Math.min(original.x + original.width - 1, Math.max(0, original.x + dx)) : original.x;
      const top = handle.includes('n') ? Math.min(original.y + original.height - 1, Math.max(0, original.y + dy)) : original.y;
      const right = handle.includes('e') ? Math.max(original.x + 1, Math.min(this.overlayWidth, original.x + original.width + dx)) : original.x + original.width;
      const bottom = handle.includes('s') ? Math.max(original.y + 1, Math.min(this.overlayHeight, original.y + original.height + dy)) : original.y + original.height;
      this.cropSelection = { x: left, y: top, width: right - left, height: bottom - top };
      return;
    }
    if (!this.cropDraft) return;
    const point = this.annotationPoint(event);
    this.cropDraft = {
      x: Math.min(this.cropStartX, point.x),
      y: Math.min(this.cropStartY, point.y),
      width: Math.max(1, Math.abs(point.x - this.cropStartX)),
      height: Math.max(1, Math.abs(point.y - this.cropStartY)),
    };
  }

  finishCrop(): void {
    this.cropResizeState = null;
    if (!this.cropDraft) return;
    if (this.cropDraft.width >= 3 && this.cropDraft.height >= 3) this.cropSelection = { ...this.cropDraft };
    this.cropDraft = null;
  }

  startCropResize(event: MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se'): void {
    if (!this.cropMode || !this.cropSelection || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const point = this.annotationPoint(event);
    this.cropResizeState = { handle, original: { ...this.cropSelection }, startX: point.x, startY: point.y };
  }

  async applyCropSelection(): Promise<void> {
    if (!this.document || !this.cropSelection) return;
    try {
      const bytes = await this.pageOperationsService.cropPage(
        this.document.bytes,
        this.currentPage,
        this.overlayWidth,
        this.overlayHeight,
        this.cropSelection
      );
      await this.recordPageTransformation(bytes, this.currentPage);
      this.cropSelection = null;
      this.cropMode = false;
    } catch (error) {
      this.error = `Unable to crop page: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async recordPageTransformation(bytes: Uint8Array, selectedPage: number): Promise<void> {
    if (!this.document) return;
    this.pageTransformUndo.push(this.document.bytes.slice());
    this.pageTransformRedo.length = 0;
    await this.refreshDocumentAfterPageOperation(bytes, selectedPage);
    this.syncHistoryState();
  }

  private async refreshDocumentAfterPageOperation(bytes: Uint8Array, selectedPage: number): Promise<void> {
    const updated = await this.pdfDocumentService.replaceCurrentDocumentBytes(bytes);
    this.document = updated;
    this.totalPages = updated.totalPages;
    this.currentPage = Math.max(1, Math.min(selectedPage, updated.totalPages));
    this.selectedPages = [];
    const page = typeof updated.proxy?.getPage === 'function'
      ? await updated.proxy.getPage(this.currentPage)
      : null;
    if (Number.isFinite(page?.rotate)) this.rotation = page.rotate;
    this.error = null;
    this.thumbnailRenderStates.clear();
    this.thumbnailSources.clear();
    this.thumbnailRenderScheduled.clear();
    this.thumbnailError = null;
    this.searchIndex = null;
    this.searchResults = [];
    this.searchMessage = '';
    this.updateThumbnailWindow(0, 360);
    await this.loadBookmarks();
    this.cdr.detectChanges();
    await this.renderCurrentPage();
    this.scheduleAutosave();
  }

  updateThumbnailWindow(scrollTop: number, viewportHeight: number): void {
    if (!this.totalPages) {
      this.visibleThumbnailPages = [];
      return;
    }
    const first = Math.max(0, Math.floor(scrollTop / this.thumbnailItemHeight) - 2);
    const last = Math.min(
      this.totalPages,
      Math.ceil((scrollTop + Math.max(viewportHeight, this.thumbnailItemHeight)) / this.thumbnailItemHeight) + 2
    );
    this.visibleThumbnailPages = Array.from({ length: last - first }, (_, index) => first + index + 1);
  }

  private renderVisibleThumbnails(): void {
    if (!this.document) return;
    const document = this.document;
    for (const page of this.visibleThumbnailPages) {
      if (this.thumbnailRenderStates.has(page) || this.thumbnailRenderScheduled.has(page)) continue;
      this.thumbnailRenderScheduled.add(page);
      queueMicrotask(() => {
        this.thumbnailRenderScheduled.delete(page);
        if (this.document?.id !== document.id || this.thumbnailRenderStates.has(page)) return;
        this.thumbnailRenderStates.set(page, 'loading');
        void this.renderThumbnail(document, page);
      });
    }
  }

  private async renderThumbnail(document: LoadedPdfDocument, page: number): Promise<void> {
    try {
      const canvas = globalThis.document.createElement('canvas');
      await this.pdfRenderService.renderPageToCanvas(document.bytes, page, canvas, { fitWidth: 120, fitHeight: 104 });
      if (this.document?.id !== document.id) return;
      this.thumbnailSources.set(page, canvas.toDataURL());
      this.thumbnailRenderStates.set(page, 'ready');
    } catch (error) {
      if (this.document?.id !== document.id) return;
      this.thumbnailRenderStates.set(page, 'error');
      this.thumbnailError = `Unable to render thumbnail for page ${page}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async zoomIn(): Promise<void> {
    this.zoom = Math.min(3, this.zoom + 0.1);
    await this.renderCurrentPage();
  }

  async zoomOut(): Promise<void> {
    this.zoom = Math.max(0.5, this.zoom - 0.1);
    await this.renderCurrentPage();
  }

  async rotateLeft(): Promise<void> {
    this.rotation = (this.rotation - 90 + 360) % 360;
    await this.renderCurrentPage();
  }

  async rotateRight(): Promise<void> {
    this.rotation = (this.rotation + 90) % 360;
    await this.renderCurrentPage();
  }

  async searchInDocument(): Promise<void> {
    if (!this.document || !this.searchQuery.trim()) {
      this.searchResults = [];
      this.currentSearchResultIndex = 0;
      this.searchMessage = '';
      return;
    }

    const query = this.searchQuery.trim();
    const pattern = this.searchRegexMode ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let matcher: RegExp;
    try {
      matcher = new RegExp(pattern, this.searchCaseSensitive ? 'g' : 'gi');
    } catch (error) {
      this.searchResults = [];
      this.searchMessage = `Invalid regular expression: ${error instanceof Error ? error.message : String(error)}`;
      return;
    }

    this.searching = true;
    this.searchMessage = 'Indexing document text...';
    try {
      const document = this.document;
      if (this.searchIndex?.documentId !== document.id) {
        const pages: string[] = [];
        for (let page = 1; page <= document.totalPages; page++) {
          pages.push(await this.pdfDocumentService.extractText(page));
        }
        this.searchIndex = { documentId: document.id, pages };
      }

      const results: SearchResult[] = [];
      this.searchIndex.pages.forEach((text, index) => {
        matcher.lastIndex = 0;
        const firstMatch = matcher.exec(text);
        if (!firstMatch) return;

        let count = 0;
        const countMatcher = new RegExp(pattern, this.searchCaseSensitive ? 'g' : 'gi');
        let match: RegExpExecArray | null;
        while ((match = countMatcher.exec(text))) {
          count++;
          if (!match[0].length) countMatcher.lastIndex++;
        }
        const start = Math.max(0, firstMatch.index - 60);
        const end = Math.min(text.length, Math.max(start + 180, firstMatch.index + firstMatch[0].length + 60));
        results.push({
          page: index + 1,
          count,
          excerpt: `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`,
        });
      });

      this.searchResults = results;
      this.currentSearchResultIndex = 0;
      if (results.length) {
        const totalMatches = results.reduce((total, result) => total + result.count, 0);
        await this.navigateToSearchResult(0);
        this.searchMessage = `Found ${totalMatches} match${totalMatches === 1 ? '' : 'es'} on ${results.length} page${results.length === 1 ? '' : 's'}`;
      } else {
        this.searchMessage = 'No match found';
      }
    } catch (error) {
      this.searchResults = [];
      this.searchMessage = `Search failed: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      this.searching = false;
    }
  }

  async navigateToSearchResult(index: number): Promise<void> {
    if (index < 0 || index >= this.searchResults.length) return;
    this.currentSearchResultIndex = index;
    this.currentPage = this.searchResults[index].page;
    await this.renderCurrentPage();
  }

  async previousSearchResult(): Promise<void> {
    if (!this.searchResults.length) return;
    const index = (this.currentSearchResultIndex - 1 + this.searchResults.length) % this.searchResults.length;
    await this.navigateToSearchResult(index);
  }

  async nextSearchResult(): Promise<void> {
    if (!this.searchResults.length) return;
    const index = (this.currentSearchResultIndex + 1) % this.searchResults.length;
    await this.navigateToSearchResult(index);
  }

  searchResultParts(text: string): { text: string; match: boolean }[] {
    const flags = this.searchCaseSensitive ? 'g' : 'gi';
    try {
      const query = this.searchQuery.trim();
      const pattern = this.searchRegexMode ? query : query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const matcher = new RegExp(pattern, flags);
      const parts: { text: string; match: boolean }[] = [];
      let previousIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = matcher.exec(text))) {
        if (match.index > previousIndex) parts.push({ text: text.slice(previousIndex, match.index), match: false });
        parts.push({ text: match[0], match: true });
        previousIndex = matcher.lastIndex;
        if (!match[0].length) matcher.lastIndex++;
      }
      if (previousIndex < text.length) parts.push({ text: text.slice(previousIndex), match: false });
      return parts.length ? parts : [{ text, match: false }];
    } catch {
      return [{ text, match: false }];
    }
  }

  @HostListener('window:resize')
  async onResize(): Promise<void> {
    if (this.document && !this.loading) {
      await this.renderCurrentPage();
    }
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (!this.dragState) {
      return;
    }

    const dx = event.clientX - this.dragState.startX;
    const dy = event.clientY - this.dragState.startY;

    const updated =
      this.dragState.mode === 'move'
        ? this.computeMovedObject(this.dragState.original, dx, dy)
        : this.computeResizedObject(this.dragState.original, dx, dy, this.dragState.handle as ResizeHandle);

    this.overlayObjects = this.overlayObjects.map((object) =>
      object.id === this.dragState?.objectId ? updated : object
    );
  }

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (this.dragState) this.scheduleAutosave();
    this.dragState = null;
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (key === 'backspace' || key === 'delete') {
      this.deleteSelection();
      event.preventDefault();
      return;
    }

    if (!event.ctrlKey && !event.metaKey) {
      return;
    }

    if (key === 'c') {
      this.copySelection();
      event.preventDefault();
      return;
    }

    if (key === 'x') {
      this.cutSelection();
      event.preventDefault();
      return;
    }

    if (key === 'v') {
      this.pasteClipboard();
      event.preventDefault();
      return;
    }

    if (key === 'z' && !event.shiftKey) {
      this.undoEdit();
      event.preventDefault();
      return;
    }

    if (key === 'y' || (key === 'z' && event.shiftKey)) {
      this.redoEdit();
      event.preventDefault();
      return;
    }
  }

  get pageAnnotations(): Annotation[] {
    return this.document ? this.annotations.filter(annotation => annotation.page === this.currentPage) : [];
  }

  get visibleAnnotations(): Annotation[] {
    const query = this.annotationSearch.trim().toLocaleLowerCase();
    return this.annotations.filter(annotation =>
      (this.annotationFilter === 'all' || annotation.type === this.annotationFilter) &&
      (!query || (annotation.content ?? '').toLocaleLowerCase().includes(query) || annotation.type.includes(query))
    );
  }

  get selectedFormFieldRequired(): boolean {
    return this.formWidgets.find(widget => widget.name === this.selectedFormFieldName)?.required ?? false;
  }

  get hasSelectedFieldCondition(): boolean {
    return this.formVisibilityRules.some(rule => rule.targetFieldName === this.selectedFormFieldName);
  }

  get signatureReady(): boolean {
    if (this.signatureMode === 'type') return Boolean(this.signatureText.trim());
    if (this.signatureMode === 'upload') return Boolean(this.signatureDataUrl);
    return this.signatureHasMarks;
  }

  annotationColorFor(annotation: Annotation): string {
    return annotation.style.color;
  }

  setAnnotationTool(tool: 'highlight' | 'comment' | 'draw' | null): void {
    this.annotationTool = tool;
    this.annotationDraft = null;
  }

  startAnnotation(event: MouseEvent): void {
    if (!this.document || !this.annotationTool || event.button !== 0) return;
    event.preventDefault();
    const point = this.annotationPoint(event);
    const type: AnnotationType = this.annotationTool === 'comment' ? 'comment' : this.annotationTool;
    this.annotationDraft = {
      type,
      rect: { x: point.x, y: point.y, width: 1, height: 1 },
      content: '',
      startX: point.x,
      startY: point.y,
      points: [point.x + ',' + point.y],
    };
  }

  moveAnnotation(event: MouseEvent): void {
    if (!this.annotationDraft) return;
    const point = this.annotationPoint(event);
    const left = Math.min(this.annotationDraft.startX, point.x);
    const top = Math.min(this.annotationDraft.startY, point.y);
    this.annotationDraft.rect = {
      x: left,
      y: top,
      width: Math.max(1, Math.abs(point.x - this.annotationDraft.startX)),
      height: Math.max(1, Math.abs(point.y - this.annotationDraft.startY)),
    };
    if (this.annotationDraft.type === 'draw') {
      this.annotationDraft.points.push(point.x + ',' + point.y);
      this.annotationDraft.content = this.annotationDraft.points.join(' ');
    }
  }

  finishAnnotation(): void {
    const draft = this.annotationDraft;
    if (!draft || !this.document) return;
    this.annotationDraft = null;
    if (draft.type === 'draw' ? draft.points.length < 2 : draft.rect.width < 3 || draft.rect.height < 3) return;
    let content = draft.content;
    if (draft.type === 'comment') {
      const entered = window.prompt('Enter a comment for this page region:');
      if (entered === null || !entered.trim()) return;
      content = entered.trim();
    }
    if (draft.type === 'draw') {
      content = draft.points.map(point => {
        const [x, y] = point.split(',').map(Number);
        return (x - draft.rect.x) + ',' + (y - draft.rect.y);
      }).join(' ');
    }
    this.annotationService.create({
      documentId: this.document.id,
      page: this.currentPage,
      type: draft.type,
      rect: draft.rect,
      viewport: { width: this.overlayWidth, height: this.overlayHeight },
      style: { color: this.annotationColor, opacity: Number(this.annotationOpacity), ...(draft.type === 'draw' ? { strokeWidth: 2 } : {}) },
      content,
    });
    this.refreshAnnotations();
  }

  editAnnotation(annotation: Annotation): void {
    const content = window.prompt('Edit annotation text:', annotation.content ?? '');
    if (content === null) return;
    this.annotationService.update(annotation.id, { content, style: { color: this.annotationColor, opacity: Number(this.annotationOpacity) } });
    this.refreshAnnotations();
  }

  deleteAnnotation(annotation: Annotation): void {
    this.annotationService.delete(annotation.id);
    this.refreshAnnotations();
  }

  async jumpToAnnotation(annotation: Annotation): Promise<void> {
    this.currentPage = annotation.page;
    await this.renderCurrentPage();
  }

  private annotationPoint(event: MouseEvent): { x: number; y: number } {
    const bounds = this.annotationLayer?.nativeElement.getBoundingClientRect();
    const x = event.clientX - (bounds?.left ?? 0);
    const y = event.clientY - (bounds?.top ?? 0);
    return {
      x: Math.max(0, Math.min(this.overlayWidth, x)),
      y: Math.max(0, Math.min(this.overlayHeight, y)),
    };
  }

  private refreshAnnotations(): void {
    if (this.document) {
      this.annotations = this.annotationService.list(this.document.id);
      this.scheduleAutosave();
    }
  }

  addOverlayObject(): void {
    this.addTextObject();
  }

  addTextObject(): void {
    const text = window.prompt('Enter text for the new text box:', 'Sample text') ?? 'Sample text';
    const object = this.createBaseObject({
      type: 'text',
      label: 'Text Box',
      width: 220,
      height: 90,
      text,
    });

    this.captureHistory('add-text-box');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  addImageObject(): void {
    const imageSrc =
      window.prompt(
        'Enter image URL or data URL:',
        'https://dummyimage.com/240x120/ced8ef/17397e.png&text=Image'
      ) ?? '';
    if (!imageSrc.trim()) {
      return;
    }

    const object = this.createBaseObject({
      type: 'image',
      label: 'Image',
      width: 240,
      height: 140,
      imageSrc: imageSrc.trim(),
    });

    this.captureHistory('insert-image');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  addLinkObject(): void {
    const url = window.prompt('Enter link URL:', 'https://example.com') ?? '';
    if (!url.trim()) {
      return;
    }

    const text = window.prompt('Enter link label:', 'Open link') ?? 'Open link';
    const object = this.createBaseObject({
      type: 'link',
      label: 'Link',
      width: 220,
      height: 70,
      text,
      url: url.trim(),
    });

    this.captureHistory('insert-link');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
  }

  async openSignatureDialog(kind: SignatureAsset['kind']): Promise<void> {
    this.signatureKind = kind;
    this.signatureMode = 'draw';
    this.signatureText = '';
    this.signatureDataUrl = '';
    this.signatureHasMarks = false;
    this.signatureError = null;
    this.signatureDialogOpen = true;
    try {
      const stored = await this.persistenceService.getSetting<SignatureAsset[]>('pdf-signature-assets');
      this.signatureAssets = Array.isArray(stored) ? stored.filter(asset =>
        typeof asset?.id === 'string' &&
        typeof asset?.name === 'string' &&
        (asset?.kind === 'signature' || asset?.kind === 'initials') &&
        typeof asset?.data === 'string' &&
        /^data:image\/(png|jpeg);base64,/i.test(asset.data)
      ) : [];
    } catch (error) {
      this.signatureError = `Unable to load saved signatures: ${error instanceof Error ? error.message : String(error)}`;
    }
    this.cdr.detectChanges();
    this.clearSignatureCanvas();
  }

  setSignatureMode(mode: 'draw' | 'type' | 'upload'): void {
    this.signatureMode = mode;
    this.signatureDataUrl = '';
    this.signatureHasMarks = false;
    this.signatureError = null;
    this.cdr.detectChanges();
    if (mode === 'draw') this.clearSignatureCanvas();
  }

  startSignatureStroke(event: PointerEvent): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      this.signatureError = 'Signature drawing is unavailable because the canvas could not be initialized.';
      return;
    }
    event.preventDefault();
    const point = this.signatureCanvasPoint(event, canvas);
    context.beginPath();
    context.moveTo(point.x, point.y);
    context.strokeStyle = '#14264b';
    context.lineWidth = 2.5;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    this.drawingSignature = true;
  }

  continueSignatureStroke(event: PointerEvent): void {
    if (!this.drawingSignature) return;
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const point = this.signatureCanvasPoint(event, canvas);
    context.lineTo(point.x, point.y);
    context.stroke();
    this.signatureHasMarks = true;
  }

  finishSignatureStroke(): void {
    this.drawingSignature = false;
  }

  async loadSignatureFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.signatureError = 'Choose a PNG or JPEG image for the signature.';
      input.value = '';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.signatureError = 'Signature images must be 10 MB or smaller.';
      input.value = '';
      return;
    }
    try {
      this.signatureDataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === 'string'
          ? resolve(reader.result)
          : reject(new Error('The selected image could not be read.'));
        reader.onerror = () => reject(reader.error ?? new Error('The selected image could not be read.'));
        reader.readAsDataURL(file);
      });
      this.signatureError = null;
    } catch (error) {
      this.signatureError = `Unable to read signature image: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async saveReusableSignature(): Promise<void> {
    try {
      const draft = this.currentSignatureAsset();
      if (!draft) {
        this.signatureError = 'Draw, type, or upload a signature before saving it for reuse.';
        return;
      }
      const name = window.prompt('Name this reusable item:', draft.kind === 'signature' ? 'My signature' : 'My initials');
      if (name === null || !name.trim()) return;
      const existing = this.signatureAssets.find(asset => asset.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase());
      const asset = { ...draft, id: existing?.id ?? `signature-${Date.now()}-${Math.round(Math.random() * 1e6)}`, name: name.trim() };
      const assets = [...this.signatureAssets.filter(item => item.id !== asset.id), asset];
      await this.persistenceService.setSetting('pdf-signature-assets', assets);
      this.signatureAssets = assets;
      this.signatureError = null;
    } catch (error) {
      this.signatureError = `Unable to save reusable signature: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  placeCurrentSignature(): void {
    try {
      const asset = this.currentSignatureAsset();
      if (!asset) {
        this.signatureError = 'Draw, type, or upload a signature before placing it.';
        return;
      }
      this.placeSignatureAsset(asset);
    } catch (error) {
      this.signatureError = `Unable to prepare signature: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  placeSignatureAsset(asset: SignatureAsset): void {
    const initials = asset.kind === 'initials';
    const object = this.createBaseObject({
      type: 'image',
      label: initials ? 'Initials' : 'Signature',
      width: initials ? 96 : 200,
      height: initials ? 56 : 72,
      imageSrc: asset.data,
    });
    this.captureHistory('place-signature');
    this.overlayObjects = [...this.overlayObjects, object];
    this.selectedObjectId = object.id;
    this.closeSignatureDialog();
  }

  closeSignatureDialog(): void {
    this.signatureDialogOpen = false;
    this.drawingSignature = false;
  }

  private currentSignatureAsset(): SignatureAsset | null {
    let data: string;
    if (this.signatureMode === 'type') {
      const text = this.signatureText.trim();
      if (!text) return null;
      data = this.renderTypedSignature(text);
    } else if (this.signatureMode === 'upload') {
      data = this.signatureDataUrl;
    } else {
      const canvas = this.signatureCanvas?.nativeElement;
      if (!this.signatureHasMarks || !canvas) return null;
      data = canvas.toDataURL('image/png');
    }
    return data ? { id: 'draft', name: this.signatureKind, kind: this.signatureKind, data } : null;
  }

  private renderTypedSignature(text: string): string {
    const canvas = globalThis.document.createElement('canvas');
    canvas.width = Math.min(1200, Math.max(240, text.length * 44 + 32));
    canvas.height = 120;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Signature rendering is unavailable because the canvas could not be initialized.');
    context.fillStyle = '#14264b';
    context.font = 'italic 48px cursive';
    context.textBaseline = 'middle';
    context.fillText(text, 16, 60, canvas.width - 32);
    return canvas.toDataURL('image/png');
  }

  private signatureCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): { x: number; y: number } {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - bounds.left) * canvas.width / Math.max(bounds.width, 1),
      y: (event.clientY - bounds.top) * canvas.height / Math.max(bounds.height, 1),
    };
  }

  private clearSignatureCanvas(): void {
    const canvas = this.signatureCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  }

  editSelection(): void {
    const selected = this.getSelectedObject();
    if (!selected) {
      return;
    }

    if (selected.type === 'text') {
      const text = window.prompt('Edit text content:', selected.text ?? selected.label);
      if (text === null) {
        return;
      }
      this.captureHistory('edit-text-box');
      this.updateObject(selected.id, {
        text,
        label: 'Text Box',
      });
      return;
    }

    if (selected.type === 'image') {
      const imageSrc = window.prompt('Edit image URL/data URL:', selected.imageSrc ?? '');
      if (imageSrc === null || !imageSrc.trim()) {
        return;
      }
      this.captureHistory('edit-image');
      this.updateObject(selected.id, {
        imageSrc: imageSrc.trim(),
        label: 'Image',
      });
      return;
    }

    const nextUrl = window.prompt('Edit link URL:', selected.url ?? '');
    if (nextUrl === null || !nextUrl.trim()) {
      return;
    }
    const nextText = window.prompt('Edit link label:', selected.text ?? selected.label);
    if (nextText === null) {
      return;
    }

    this.captureHistory('edit-link');
    this.updateObject(selected.id, {
      url: nextUrl.trim(),
      text: nextText,
      label: 'Link',
    });
  }

  deleteSelection(): void {
    if (!this.selectedObjectId) {
      return;
    }

    this.captureHistory('delete-object');
    this.overlayObjects = this.overlayObjects.filter((item) => item.id !== this.selectedObjectId);
    this.selectedObjectId = null;
  }

  private createBaseObject(initial: {
    type: EditableObjectType;
    label: string;
    width: number;
    height: number;
    text?: string;
    imageSrc?: string;
    url?: string;
  }): EditableObject {
    const nextId = `obj-${Date.now()}-${this.overlayObjects.length}`;
    const base = this.clampObject({
      id: nextId,
      type: initial.type,
      x: Math.min(48 + this.overlayObjects.length * 12, Math.max(0, this.overlayWidth - 180)),
      y: Math.min(48 + this.overlayObjects.length * 12, Math.max(0, this.overlayHeight - 90)),
      width: initial.width,
      height: initial.height,
      label: initial.label,
      text: initial.text,
      imageSrc: initial.imageSrc,
      url: initial.url,
    });

    return base;
  }

  startMove(event: MouseEvent, objectId: string): void {
    event.preventDefault();
    event.stopPropagation();

    const object = this.overlayObjects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }

    this.selectedObjectId = objectId;
    this.captureHistory('move-object');
    this.dragState = {
      mode: 'move',
      objectId,
      startX: event.clientX,
      startY: event.clientY,
      original: { ...object },
    };
  }

  startResize(event: MouseEvent, objectId: string, handle: ResizeHandle): void {
    event.preventDefault();
    event.stopPropagation();

    const object = this.overlayObjects.find((item) => item.id === objectId);
    if (!object) {
      return;
    }

    this.selectedObjectId = objectId;
    this.captureHistory('resize-object');
    this.dragState = {
      mode: 'resize',
      objectId,
      startX: event.clientX,
      startY: event.clientY,
      original: { ...object },
      handle,
    };
  }

  copySelection(): void {
    if (!this.selectedObjectId) {
      return;
    }

    const selected = this.overlayObjects.find((item) => item.id === this.selectedObjectId);
    if (!selected) {
      return;
    }

    this.clipboardObject = { ...selected };
  }

  cutSelection(): void {
    if (!this.selectedObjectId) {
      return;
    }

    const selected = this.overlayObjects.find((item) => item.id === this.selectedObjectId);
    if (!selected) {
      return;
    }

    this.clipboardObject = { ...selected };
    this.captureHistory('cut-object');
    this.overlayObjects = this.overlayObjects.filter((item) => item.id !== this.selectedObjectId);
    this.selectedObjectId = null;
  }

  pasteClipboard(): void {
    if (!this.clipboardObject) {
      return;
    }

    const nextId = `obj-${Date.now()}-${this.overlayObjects.length}`;
    const pasted = this.clampObject({
      ...this.clipboardObject,
      id: nextId,
      x: this.clipboardObject.x + 20,
      y: this.clipboardObject.y + 20,
      label: `${this.clipboardObject.label} copy`,
    });

    this.captureHistory('paste-object');
    this.overlayObjects = [...this.overlayObjects, pasted];
    this.selectedObjectId = nextId;
  }

  async undoEdit(): Promise<void> {
    if (this.document && this.pageTransformUndo.length) {
      const previousBytes = this.pageTransformUndo.pop()!;
      this.pageTransformRedo.push(this.document.bytes.slice());
      await this.refreshDocumentAfterPageOperation(previousBytes, this.currentPage);
      this.syncHistoryState();
      return;
    }
    const previous = this.historyService.undo(this.cloneOverlayObjects(this.overlayObjects));
    if (!previous) {
      this.syncHistoryState();
      return;
    }

    this.overlayObjects = previous;
    this.selectedObjectId = null;
    this.store.dispatch(undoEditCommand());
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  async redoEdit(): Promise<void> {
    if (this.document && this.pageTransformRedo.length) {
      const nextBytes = this.pageTransformRedo.pop()!;
      this.pageTransformUndo.push(this.document.bytes.slice());
      await this.refreshDocumentAfterPageOperation(nextBytes, this.currentPage);
      this.syncHistoryState();
      return;
    }
    const next = this.historyService.redo(this.cloneOverlayObjects(this.overlayObjects));
    if (!next) {
      this.syncHistoryState();
      return;
    }

    this.overlayObjects = next;
    this.selectedObjectId = null;
    this.store.dispatch(redoEditCommand());
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  async updateFormField(widget: FormWidget, value: string): Promise<void> {
    if (!this.document || widget.readOnly) return;
    try {
      const bytes = await this.pdfFormService.updateField(this.document.bytes, widget.name, value);
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to update form field "${widget.name}": ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async exportFormData(): Promise<void> {
    if (!this.document) return;
    try {
      const serialized = await this.pdfFormService.exportFormData(this.document.bytes);
      const data = await new Blob([serialized], { type: 'application/json' }).arrayBuffer();
      const name = `${this.document.name.replace(/\.pdf$/i, '')}-form-data.json`;
      await this.runtimeService.saveFileDialog(name, data, 'application/json');
    } catch (error) {
      this.error = `Unable to export form data: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async importFormDataFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.document) return;
    input.value = '';
    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Form data files must be 5 MB or smaller.';
      return;
    }
    try {
      const serialized = await file.text();
      const bytes = await this.pdfFormService.importFormData(this.document.bytes, serialized);
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to import form data: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  beginFormFieldAuthoring(type: PdfFormFieldPlacement['type']): void {
    this.formAuthoringType = type;
    this.cropMode = false;
    this.cropSelection = null;
    this.cropDraft = null;
    this.setAnnotationTool(null);
  }

  selectFormField(widget: FormWidget): void {
    this.selectedFormFieldName = widget.name;
  }

  async startFormFieldPlacement(event: MouseEvent): Promise<void> {
    if (!this.document || !this.formAuthoringType || event.target !== this.annotationLayer?.nativeElement) return;
    event.preventDefault();
    const name = window.prompt('Enter a name for the form field');
    if (name === null || !name.trim()) return;
    let options: string[] | undefined;
    if (this.formAuthoringType === 'dropdown') {
      const enteredOptions = window.prompt('Enter dropdown options separated by commas', 'Option 1, Option 2');
      if (enteredOptions === null) return;
      options = enteredOptions.split(',').map(option => option.trim()).filter(Boolean);
    }
    const point = this.annotationPoint(event);
    const [width, height] = this.formAuthoringType === 'checkbox' ? [20, 20] : [140, 24];
    const rect = {
      x: Math.min(point.x, Math.max(0, this.overlayWidth - width)),
      y: Math.min(point.y, Math.max(0, this.overlayHeight - height)),
      width: Math.min(width, this.overlayWidth),
      height: Math.min(height, this.overlayHeight),
    };
    try {
      const bytes = await this.pdfFormService.createField(this.document.bytes, {
        name,
        type: this.formAuthoringType,
        pageNumber: this.currentPage,
        viewportWidth: this.overlayWidth,
        viewportHeight: this.overlayHeight,
        rect,
        options,
      });
      this.formAuthoringType = null;
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
      this.selectedFormFieldName = name.trim();
    } catch (error) {
      this.error = `Unable to create form field: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async toggleSelectedFieldRequired(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    try {
      const bytes = await this.pdfFormService.updateFieldDefinition(this.document.bytes, this.selectedFormFieldName, {
        required: !this.selectedFormFieldRequired,
      });
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to update required field setting: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async editSelectedFormField(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const widget = this.formWidgets.find(item => item.name === this.selectedFormFieldName);
    if (!widget) return;
    if (widget.type === 'dropdown') {
      const enteredOptions = window.prompt('Edit dropdown options separated by commas', widget.options.join(', '));
      if (enteredOptions === null) return;
      const options = enteredOptions.split(',').map(option => option.trim()).filter(Boolean);
      try {
        const bytes = await this.pdfFormService.updateFieldDefinition(this.document.bytes, widget.name, { options });
        await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
      } catch (error) {
        this.error = `Unable to edit form field: ${error instanceof Error ? error.message : String(error)}`;
      }
      return;
    }
    if (widget.type === 'text') {
      const value = window.prompt('Edit field value', widget.value);
      if (value !== null) await this.updateFormField(widget, value);
    }
  }

  async deleteSelectedFormField(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const name = this.selectedFormFieldName;
    if (!window.confirm(`Delete form field "${name}"?`)) return;
    try {
      const bytes = await this.pdfFormService.deleteField(this.document.bytes, name);
      this.formVisibilityRules = this.formVisibilityRules.filter(
        rule => rule.targetFieldName !== name && rule.sourceFieldName !== name
      );
      await this.persistFormVisibilityRules();
      this.selectedFormFieldName = null;
      await this.refreshDocumentAfterPageOperation(bytes, this.currentPage);
    } catch (error) {
      this.error = `Unable to delete form field: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async setSelectedFieldCondition(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    const sourceFieldName = window.prompt('Show this field when which field has a value?');
    if (sourceFieldName === null) return;
    const source = this.formFields.find(field => field.name === sourceFieldName.trim());
    if (!source || source.name === this.selectedFormFieldName) {
      this.error = 'Choose a different existing form field as the visibility condition source.';
      return;
    }
    const equalsValue = window.prompt(`Show "${this.selectedFormFieldName}" when "${source.name}" equals:`);
    if (equalsValue === null) return;
    this.formVisibilityRules = [
      ...this.formVisibilityRules.filter(rule => rule.targetFieldName !== this.selectedFormFieldName),
      { targetFieldName: this.selectedFormFieldName, sourceFieldName: source.name, equalsValue },
    ];
    try {
      await this.persistFormVisibilityRules();
      await this.loadFormWidgets();
    } catch (error) {
      this.error = `Unable to save field visibility rule: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  async clearSelectedFieldCondition(): Promise<void> {
    if (!this.document || !this.selectedFormFieldName) return;
    this.formVisibilityRules = this.formVisibilityRules.filter(rule => rule.targetFieldName !== this.selectedFormFieldName);
    try {
      await this.persistFormVisibilityRules();
      await this.loadFormWidgets();
    } catch (error) {
      this.error = `Unable to clear field visibility rule: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async loadFormWidgets(): Promise<void> {
    if (!this.document || typeof this.document.proxy?.getPage !== 'function') {
      this.formWidgets = [];
      this.formFields = [];
      return;
    }
    try {
      const fields = await this.pdfFormService.getFields(this.document.bytes);
      this.formFields = fields;
      const fieldsByName = new Map<string, PdfFormField>(fields.map(field => [field.name, field]));
      const storedRules = await this.persistenceService.getSetting<FormVisibilityRule[]>(this.formVisibilitySettingKey(this.document.id));
      this.formVisibilityRules = Array.isArray(storedRules) ? storedRules.filter(rule =>
        typeof rule?.targetFieldName === 'string' &&
        typeof rule?.sourceFieldName === 'string' &&
        typeof rule?.equalsValue === 'string' &&
        rule.targetFieldName !== rule.sourceFieldName &&
        fieldsByName.has(rule.targetFieldName) &&
        fieldsByName.has(rule.sourceFieldName)
      ) : [];
      const hiddenFields = new Set(this.formVisibilityRules
        .filter(rule => fieldsByName.get(rule.sourceFieldName)?.value !== rule.equalsValue)
        .map(rule => rule.targetFieldName));
      const page = await this.document.proxy.getPage(this.currentPage);
      if (typeof page.getAnnotations !== 'function' || typeof page.getViewport !== 'function') {
        this.formWidgets = [];
        return;
      }
      const viewport = page.getViewport({ scale: 1, rotation: this.rotation });
      const annotations = await page.getAnnotations({ intent: 'display' });
      const widgets: FormWidget[] = [];
      annotations.forEach((annotation: any, index: number) => {
        if (annotation.subtype !== 'Widget' || !Array.isArray(annotation.rect) || annotation.rect.length !== 4) return;
        const field = fieldsByName.get(annotation.fieldName);
        if (!field || field.type === 'unsupported' || hiddenFields.has(annotation.fieldName)) return;
        const fieldFlags = Number(annotation.fieldFlags) || 0;
        let type: FormWidget['type'];
        if (annotation.fieldType === 'Tx' && field.type === 'text') type = 'text';
        else if (annotation.fieldType === 'Ch' && field.type === 'dropdown') type = 'dropdown';
        else if (annotation.fieldType === 'Btn' && (fieldFlags & (1 << 15)) !== 0 && field.type === 'radio') type = 'radio';
        else if (annotation.fieldType === 'Btn' && field.type === 'checkbox') type = 'checkbox';
        else return;

        const rect = viewport.convertToViewportRectangle(annotation.rect) as number[];
        const x1 = Math.min(rect[0], rect[2]);
        const y1 = Math.min(rect[1], rect[3]);
        const scaleX = this.overlayWidth / viewport.width;
        const scaleY = this.overlayHeight / viewport.height;
        const option = String(annotation.buttonValue ?? annotation.exportValue ?? '');
        widgets.push({
          id: String(annotation.id ?? `${annotation.fieldName}-${index}`),
          name: annotation.fieldName,
          type,
          x: x1 * scaleX,
          y: y1 * scaleY,
          width: Math.abs(rect[2] - rect[0]) * scaleX,
          height: Math.abs(rect[3] - rect[1]) * scaleY,
          value: field.value,
          options: field.options,
          option: option || field.options[0] || '',
          date: type === 'text' && /date|dob|birth/i.test(annotation.fieldName),
          readOnly: annotation.isReadonly === true,
          required: field.required,
        });
      });
      this.formWidgets = widgets;
    } catch (error) {
      this.formWidgets = [];
      this.formFields = [];
      this.error = `Unable to load PDF form fields: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  private async persistFormVisibilityRules(): Promise<void> {
    if (!this.document) return;
    await this.persistenceService.setSetting(this.formVisibilitySettingKey(this.document.id), this.formVisibilityRules);
  }

  private formVisibilitySettingKey(documentId: string): string {
    return `pdf-form-visibility:${documentId}`;
  }

  private async renderCurrentPage(): Promise<void> {
    if (!this.document) {
      return;
    }

    const canvas = this.viewerCanvas?.nativeElement;
    const host = this.viewerHost?.nativeElement;

    if (!canvas || !host) {
      return;
    }

    await this.pdfRenderService.renderPageToCanvas(this.document.bytes, this.currentPage, canvas, {
      fitWidth: Math.max(100, host.clientWidth - 32),
      fitHeight: Math.max(100, host.clientHeight - 32),
      zoom: this.zoom,
      rotation: this.rotation,
    });

    this.syncOverlayBounds(canvas);
    await this.loadFormWidgets();
  }

  private syncOverlayBounds(canvas: HTMLCanvasElement): void {
    this.overlayWidth = canvas.clientWidth || canvas.width || 0;
    this.overlayHeight = canvas.clientHeight || canvas.height || 0;
    this.overlayObjects = this.overlayObjects.map((object) => this.clampObject(object));
  }

  private computeMovedObject(object: EditableObject, dx: number, dy: number): EditableObject {
    return this.clampObject({
      ...object,
      x: object.x + dx,
      y: object.y + dy,
    });
  }

  private computeResizedObject(object: EditableObject, dx: number, dy: number, handle: ResizeHandle): EditableObject {
    const minSize = 24;
    let { x, y, width, height } = object;

    if (handle.includes('e')) {
      width = Math.max(minSize, object.width + dx);
    }
    if (handle.includes('s')) {
      height = Math.max(minSize, object.height + dy);
    }
    if (handle.includes('w')) {
      const nextWidth = Math.max(minSize, object.width - dx);
      const diff = nextWidth - object.width;
      width = nextWidth;
      x = object.x - diff;
    }
    if (handle.includes('n')) {
      const nextHeight = Math.max(minSize, object.height - dy);
      const diff = nextHeight - object.height;
      height = nextHeight;
      y = object.y - diff;
    }

    return this.clampObject({ ...object, x, y, width, height });
  }

  private getSelectedObject(): EditableObject | null {
    if (!this.selectedObjectId) {
      return null;
    }

    return this.overlayObjects.find((item) => item.id === this.selectedObjectId) ?? null;
  }

  private updateObject(objectId: string, changes: Partial<EditableObject>): void {
    this.overlayObjects = this.overlayObjects.map((item) =>
      item.id === objectId ? this.clampObject({ ...item, ...changes }) : item
    );
  }

  private captureHistory(command: string): void {
    this.historyService.capture(this.cloneOverlayObjects(this.overlayObjects));
    this.store.dispatch(recordEditCommand({ command }));
    this.syncHistoryState();
    this.scheduleAutosave();
  }

  private cloneOverlayObjects(objects: EditableObject[]): EditableObject[] {
    return objects.map((item) => ({ ...item }));
  }

  private syncHistoryState(): void {
    this.canUndo = this.historyService.canUndo() || this.pageTransformUndo.length > 0;
    this.canRedo = this.historyService.canRedo() || this.pageTransformRedo.length > 0;
  }

  private clampObject(object: EditableObject): EditableObject {
    const minSize = 24;
    const widthLimit = this.overlayWidth > 0 ? this.overlayWidth : Number.MAX_SAFE_INTEGER;
    const heightLimit = this.overlayHeight > 0 ? this.overlayHeight : Number.MAX_SAFE_INTEGER;

    const width = Math.max(minSize, Math.min(object.width, widthLimit));
    const height = Math.max(minSize, Math.min(object.height, heightLimit));
    const x = Math.min(Math.max(0, object.x), Math.max(0, widthLimit - width));
    const y = Math.min(Math.max(0, object.y), Math.max(0, heightLimit - height));

    return {
      ...object,
      x,
      y,
      width,
      height,
    };
  }
}
