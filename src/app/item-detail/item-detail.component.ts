import { Component, Input, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { CategoryService } from '../category-tree/category.service';
import { FloatingCharsService } from '../floating-chars/floating-chars.service';
import { GenericDialogComponent } from '../generic-dialog/generic-dialog.component';
import { ItemService } from '../_services/item.service';
import { ItemFloatingChars } from '../_models/item-floating-char';
import { ItemFloatingCharsCat } from '../_models/item-floating-char-cat';
import { ItemFloatingCharRel } from '../_models/item-floating-char-rel';
import { ItemImgUrls } from '../_models/Item-img-urls-model';
import { UserItem } from '../_models/Item-model';
import { ItemCategoryModel } from '../_models/main-categories-model';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'item-detail',
  templateUrl: './item-detail.component.html',
  styleUrls: ['./item-detail.component.css']
})
export class ItemDetailComponent implements OnInit {

  @Input()
  private itemInput: UserItem;

  @Input()
  private increment: number;

  public uploadedImgDir: string = environment.uploadedImgDir;
  public server: string = environment.server;
  
  public url: SafeResourceUrl;

  public item: UserItem;
  public itemFloatingChars: ItemFloatingChars[];
  public itemType: ItemCategoryModel[];
  public images: any[] = [];
  public blobImgs: any[] = [];
  public imageRows: number[] = [];
  public principleImg: string = "";

  constructor(private itemService: ItemService, private route: ActivatedRoute,
    private floatingCharsService: FloatingCharsService,
    private categoryService: CategoryService,
    private sanitizer: DomSanitizer,
    private dialog: MatDialog) {
    
  }

  ngOnInit() {
   //categories 
    this.getCategoryTypes();
    
    //floating chars
    this.floatingCharsService.getAll().subscribe( (itemFloatingChars: ItemFloatingChars[]) => {
      this.itemFloatingChars = itemFloatingChars;

      //uri params
      this.route.params.subscribe(params => {
        if(params.itemId) {
          
          this.itemService.getById(params.itemId).subscribe( (itemResponse: UserItem) => {

            this.orderImages(itemResponse);
            console.log(itemResponse.itemImgUrls[0]);

            this.principleImg = itemResponse.itemImgUrls[0].imgUrl;

            this.assignFloatingChars(itemResponse, itemFloatingChars);
            
          });
        } else {
          this.itemService.getById( parseInt(this.itemInput.id) ).subscribe( (itemResponse: UserItem) => {
            
            console.log(itemResponse.itemImgUrls[0]);
            this.principleImg = itemResponse.itemImgUrls[0].imgUrl;

            this.assignFloatingChars(itemResponse, itemFloatingChars);
            this.orderImages(itemResponse);
          });
        }

      });
    });
  }

  orderImages(itemResponse: UserItem) {
    
    // Sort image array
    itemResponse.itemImgUrls.sort(function(a: ItemImgUrls, b: ItemImgUrls) {
      return a.imgUrl.localeCompare(b.imgUrl);
    });
    
    // setup image array
    let imgRowIndx = 0;
    itemResponse.itemImgUrls.forEach( (img: any) => {

      this.images = this.images.concat( img.imgUrl );
      this.blobImgs = this.blobImgs.concat(null);
      if(img.id % 2) {
        this.imageRows = this.imageRows.concat(imgRowIndx);
        imgRowIndx = imgRowIndx + 2;
      }
    });
    this.imageRows = this.imageRows.concat(imgRowIndx);
    
    let i = 0;
    this.images.forEach(image => {
      
      this.getImageFromService(image, i);
      i++;
    });
  }

  setPrincipalImage(imageIndex) {
    this.principleImg = imageIndex;
  }
  /**
   * 
   * @param itemResponse 
   * @param itemFloatingChars 
   */
  assignFloatingChars(itemResponse: UserItem, itemFloatingChars: ItemFloatingChars[]) {
    this.item = itemResponse;
    if(this.item.itemFloatingChars) {
      for (let j = 0; j < this.item.itemFloatingChars.length; j++) {
        

        // a) find "Float Char"
        let floatChar: ItemFloatingChars[] = itemFloatingChars.filter(floatChar => floatChar.floatingCharId == this.item.itemFloatingChars[j].floatingCharId );
        // b) find "Float Char Value"
        let floatCharCat: ItemFloatingCharsCat[] = [];

        // c) verify if Char was found
        if(floatChar.length > 0 && this.item.itemFloatingChars[j].floatingCharCatId) {
          floatCharCat = floatChar[0].catalogList.filter(floatCatChar => floatCatChar.charId == this.item.itemFloatingChars[j].floatingCharCatId );
        }
        
        // d) assign using validations
        this.item.itemFloatingChars[j].floatingCharName = (floatChar.length > 0) ? floatChar[0].floatingCharName : "N/A";
        this.item.itemFloatingChars[j].floatingCharCatName = (floatCharCat.length > 0) ? floatCharCat[0].charName : "N/A";
      }
    }
  }

  filterCatalog(floatingCharName: string, itemFloatingChars: ItemFloatingCharRel[]): string {

    if(!itemFloatingChars) {
      return "NA";
    }
    let charFiltered: ItemFloatingCharRel[]  =
    itemFloatingChars.filter( floatChar => floatChar.floatingCharName == floatingCharName);

    if(charFiltered.length > 0) {
      return charFiltered[0].floatingCharCatName;
    } else {
      return "NA";
    }
  }

  getCategoryTypes(): void {
    this.categoryService.getCategoryTypes().subscribe((itemType: ItemCategoryModel[]) => {
      this.itemType = itemType.filter(cat => cat.subCategoryName == "Bicicletas")[0].subCategories;
      
    });
  }

  filterItemType(type: number) : string {
    if(!type) {
      return "";
    }
    
    const filterType = this.itemType.filter( typeCat => typeCat.id == type);

    if(filterType.length > 0) {
      return filterType[0].subCategoryName;
    } else {
      return "NA";
    }
  }

  imageToShow: any;
  isImageLoading: boolean;

  getImageFromService(imageName: string, imgIndex: number) {
    this.isImageLoading = true;
    this.blobImgs[imgIndex] = imageName;
  }

  getImgBaseUrl() {
    return this.server + this.uploadedImgDir;
  }

  openPopUp() {
    const dialogRef = this.dialog.open(GenericDialogComponent, {
      width: '280px',
      height: '137px',
      data: {
        image: "assets/images/item-detail/popup_compra.svg"
      }
    })
    
    dialogRef.afterClosed().subscribe(result => {
      console.log('The dialog was closed');
    });
    
  }

}
