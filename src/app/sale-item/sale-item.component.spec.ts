import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SaleItemComponent } from './sale-item.component';

describe('SaleItemComponent', () => {
  let component: SaleItemComponent;
  let fixture: ComponentFixture<SaleItemComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ SaleItemComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SaleItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
