import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'PDF Viewer & Editor'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.title).toEqual('PDF Viewer & Editor');
  });

  it('shows the company branding at the top without inventing a company logo', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const header: HTMLElement = fixture.nativeElement.querySelector('.app-header');
    expect(header.querySelector('h1')?.textContent).toBe('PDF');
    expect(header.textContent).toContain('from Anirdeshya Innovation Private Limited');
    expect(header.querySelector('img')).toBeNull();
    expect(header.querySelector('nav')?.getAttribute('aria-label')).toBe('Application navigation');
  });
});
