import { User, UserJson } from '../_models/User-model';
import { UserItem } from '../_models/Item-model';
import { ActivatedRoute } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { ItemService } from '../item-list/item.service';
import { AuthenticationService } from '../_services/authentication.service';
import { ItemTransactionService } from '../_services/item-transaction.service';
import { ItemTransactionJson } from '../_models/Item-transaction-model-json';
import { PAYMENT_METHOD_PAYPAL, TRANSACT_STATUS_AFTER_TRANSACTION_APPROVED, TRANSACT_STATUS_AFTER_TRANSACTION_APPROVED_AND_AUTHORIZED, TRANSACT_STATUS_AFTER_TRANSACTION_FAILED, TRANSACT_STATUS_BEFORE_TRANSACTION, TRANSACT_STATUS_CANCEL_TRANSACTION, TRANSACT_STATUS_CLIENT_AUTHORIZATION, WEB_SITE_PAYPAL_PERCENTAJE, WEB_SITE_TAX } from '../_helpers/constants';
import { UserAddressJson } from '../_models/User-address-json-model';
import { ItemTransactionHistoryJson } from '../_models/item-transaction-history-model-json';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';
import { UserAddress } from '../_models/User-address-model';
import { IPayPalConfig, ICreateOrderRequest } from 'ngx-paypal';
import { PaypalServiceService } from '../_services/paypal-service.service';
import { UserService } from '../_services/user.service';
import { UserAddressService } from '../_services/user-address.service';
import { MatDialog } from '@angular/material';
import { TransactionDialogComponent } from './transaction-dialog/transaction-dialog.component';
import { ItemFloatingCharRel } from '../_models/item-floating-char-rel';
import { ItemFloatingChars } from '../_models/item-floating-char';
import { ItemFloatingCharsCat } from '../_models/item-floating-char-cat';
import { FloatingCharsService } from '../floating-chars/floating-chars.service';
import { ItemCategoryModel } from '../_models/main-categories-model';
import { CategoryService } from '../category-tree/category.service';
import { UtilsService } from '../_services/utils.service';

@Component({
  selector: 'payment-confirmation',
  templateUrl: './payment-confirmation.component.html',
  styleUrls: ['./payment-confirmation.component.css']
})
export class PaymentConfirmationComponent implements OnInit {

  private validSession: boolean = false;
  private dialog: MatDialog;
  public payPalConfig?: IPayPalConfig;
  public itemFloatingChars: ItemFloatingChars[];
  public itemType: ItemCategoryModel[];
  itemTransaction: ItemTransactionJson = new ItemTransactionJson();
  addressFormGroup: FormGroup;
  discountFormGroup: FormGroup;
  appServer: string = environment.server;
  

  constructor(
    private route: ActivatedRoute,
    private itemService: ItemService,
    private userAddressService: UserAddressService,
    private authService: AuthenticationService,
    private itemTransactService: ItemTransactionService,
    private _formBuilder: FormBuilder,
    private paypalService: PaypalServiceService,
    private floatingCharsService: FloatingCharsService,
    private categoryService: CategoryService,
    private utilsService: UtilsService
  ) {}

  ngOnInit() {

    // setup Form
    this.addressFormGroup = this._formBuilder.group({
      //paypalUser: new FormControl('', Validators.required),
      defaultUserAddress: new FormControl('', Validators.required),
      name: new FormControl('', Validators.required),
      lastname: new FormControl('', Validators.required),
      street: new FormControl('', Validators.required),
      extNumber: new FormControl('', Validators.required),
      intNumber: new FormControl('', Validators.required),
      state: new FormControl('', Validators.required),
      city: new FormControl('', Validators.required),
      zipCode: new FormControl('', Validators.required),
      suburb: new FormControl('', Validators.required),
      streetRef: new FormControl('', Validators.required),
      reference: new FormControl('', Validators.required),
      phoneNumber: new FormControl('', Validators.required)
    });

    //Inititalize Address option
    this.addressFormGroup.controls['defaultUserAddress'].setValue('true');

    this.discountFormGroup = this._formBuilder.group({
      discountCode: new FormControl('')
    });

    // 1. Get Current Filters
    this.route.params.subscribe(params => {

      let user: User = this.authService.getSessionUser();
      console.log("user ", user);

      if (user) {
        if (params.itemId) {

          this.getCategoryTypes();
          //floating chars
          this.floatingCharsService.getAll().subscribe( (itemFloatingChars: ItemFloatingChars[]) => {
          this.itemFloatingChars = itemFloatingChars;

              //Get Item
              this.itemService.getById(params.itemId)
                .subscribe( (userItemResp: UserItem) => {

                  this.assignFloatingChars(userItemResp, itemFloatingChars);

                  //Get User Buyer Address
                  this.userAddressService.getByUserName(userItemResp.user.userName)
                    .subscribe( (vendorAddress: UserAddressJson) => {

                  this.userAddressService.getByUserName(user.userName)
                    .subscribe( (buyerAddress: UserAddressJson) => {

                      // Init Transaction
                      this.initTransaction(userItemResp, buyerAddress, vendorAddress);

                      //Paypal Instance
                      this.payPalConfig = this.initPaypalInstance(
                        this.itemTransaction,
                        this.addressFormGroup.value.paypalUser,
                        this.itemTransactionTotal() + ''
                      );
                    });
                  });
                  
            });
          });
        }
      }
      
    });
  }

  sendMail() {
    this.utilsService.mail();
  }
  
  getCategoryTypes(): void {
    this.categoryService.getCategoryTypes().subscribe((itemType: ItemCategoryModel[]) => {
      this.itemType = itemType.filter(cat => cat.subCategoryName == "Bicicletas")[0].subCategories;
      
    });
  }

  initTransaction(userItemResp: UserItem, buyerAddress: UserAddressJson, vendorAddress: UserAddressJson) {

    
    this.itemTransaction.$item = userItemResp;
    this.validSession = true;
    
    this.itemTransaction.$item = userItemResp;
    //Users
    this.itemTransaction.$userVendor = new UserJson(null);
    this.itemTransaction.$userVendor.$id = userItemResp.user.id;
    this.itemTransaction.$userBuyer = new UserJson(this.authService.getSessionUser());
    //Addresses are declare as an empty object
    this.itemTransaction.$buyerAddress = buyerAddress;
    this.itemTransaction.$vendorAddress = vendorAddress;
    //Status
    this.itemTransaction.$transactionStatus = TRANSACT_STATUS_BEFORE_TRANSACTION;
    //Payment Type
    this.itemTransaction.$paymentMethod = PAYMENT_METHOD_PAYPAL;
    //Transaction history
    this.itemTransaction.$itemTransactionHistory = [];
  }

  webSiteComission() {
    if( this.itemTransaction.$item.price < 20000) {
      return .15 * this.itemTransaction.$item.price;
    } else if (this.itemTransaction.$item.price >= 20000 && this.itemTransaction.$item.price < 50000) {
      return .12 * this.itemTransaction.$item.price;
    } else if (this.itemTransaction.$item.price >= 50000 && this.itemTransaction.$item.price < 100000) {
      return .10 * this.itemTransaction.$item.price;
    } else { // >= 100, 000
      return .08;
    }
  }

  webSiteTax() : number {
    return this.itemTransaction.$item.price * WEB_SITE_TAX;
  }

  paypalComission() : number{
    return this.itemTransaction.$item.price * WEB_SITE_PAYPAL_PERCENTAJE;
  }

  itemTransactionTotal() : number {
    let total =
      this.webSiteComission() +
      this.paypalComission() +
      this.webSiteTax() +
      this.itemTransaction.$item.price;

    return total;
  }

  getUserDefaulAddress() {

    console.log(this.itemTransaction.$buyerAddress);
    this.addressFormGroup.controls['name']        .setValue("oijoi");

    if( this.addressFormGroup.value.defaultUserAddress == "false" ) {

      this.userAddressService.getByUserName(this.itemTransaction.$userBuyer.$userName)
      .subscribe( (buyerAddress: UserAddressJson) => {
        console.log(this.itemTransaction.$buyerAddress);
        this.itemTransaction.$buyerAddress.savedInProfile = true;
        this.addressFormGroup.controls['name']        .setValue(buyerAddress.name);
        this.addressFormGroup.controls['lastname']    .setValue(buyerAddress.lastnames);
        this.addressFormGroup.controls['street']      .setValue(buyerAddress.street);
        this.addressFormGroup.controls['intNumber']   .setValue(buyerAddress.intNumber);
        this.addressFormGroup.controls['extNumber']   .setValue(buyerAddress.extNumber);
        this.addressFormGroup.controls['zipCode']     .setValue(buyerAddress.zipCode);
        this.addressFormGroup.controls['state']       .setValue(buyerAddress.state);
        this.addressFormGroup.controls['city']        .setValue(buyerAddress.city);
        this.addressFormGroup.controls['suburb']      .setValue(buyerAddress.suburb);
        this.addressFormGroup.controls['reference']   .setValue(buyerAddress.reference);
        this.addressFormGroup.controls['streetRef']   .setValue(buyerAddress.streetRef);
        this.addressFormGroup.controls['phoneNumber'] .setValue(buyerAddress.phoneNumber);
      });

    } else {
      this.itemTransaction.$buyerAddress.savedInProfile = false;
        this.addressFormGroup.controls['name']        .setValue("");
        this.addressFormGroup.controls['lastname']    .setValue("");
        this.addressFormGroup.controls['street']      .setValue("");
        this.addressFormGroup.controls['intNumber']   .setValue("");
        this.addressFormGroup.controls['extNumber']   .setValue("");
        this.addressFormGroup.controls['zipCode']     .setValue("");
        this.addressFormGroup.controls['state']       .setValue("");
        this.addressFormGroup.controls['city']        .setValue("");
        this.addressFormGroup.controls['suburb']      .setValue("");
        this.addressFormGroup.controls['reference']   .setValue("");
        this.addressFormGroup.controls['streetRef']   .setValue("");
        this.addressFormGroup.controls['phoneNumber'] .setValue("");
    }

  }

  saveUserAddress() {

    if(this.addressFormGroup.valid) {
      this.addressFormToDto(true);

      console.log(this.itemTransaction.$buyerAddress);
      this.userAddressService.save(this.itemTransaction.$buyerAddress)
        .subscribe( (userAddress: UserAddressJson) => {
          
        });
    }
  }

  getTransaction() {

    this.addressFormToDto(true);
    this.itemTransactService.get(this.itemTransaction.$id, false)
      .subscribe( (resp: ItemTransactionJson) => {
        this.itemTransaction = resp;
        console.log(resp);
    });
  }

  addressFormToDto(savedInProfile: boolean) {

    this.itemTransaction.$buyerAddress.userId         = this.itemTransaction.$userBuyer.$id;
    this.itemTransaction.$buyerAddress.name           = this.addressFormGroup.value.name;
    this.itemTransaction.$buyerAddress.lastnames      = this.addressFormGroup.value.lastname;
    this.itemTransaction.$buyerAddress.street         = this.addressFormGroup.value.street;
    this.itemTransaction.$buyerAddress.intNumber      = this.addressFormGroup.value.intNumber;
    this.itemTransaction.$buyerAddress.extNumber      = this.addressFormGroup.value.extNumber;
    this.itemTransaction.$buyerAddress.zipCode        = this.addressFormGroup.value.zipCode;
    this.itemTransaction.$buyerAddress.state          = this.addressFormGroup.value.state;
    this.itemTransaction.$buyerAddress.city           = this.addressFormGroup.value.city;
    this.itemTransaction.$buyerAddress.suburb         = this.addressFormGroup.value.suburb;
    this.itemTransaction.$buyerAddress.reference      = this.addressFormGroup.value.reference;
    this.itemTransaction.$buyerAddress.streetRef      = this.addressFormGroup.value.streetRef;
    this.itemTransaction.$buyerAddress.phoneNumber    = this.addressFormGroup.value.phoneNumber;
    this.itemTransaction.$buyerAddress.savedInProfile = savedInProfile;
  }

  saveTransaction() {

    
    this.itemTransactService.save(this.itemTransaction)
    .subscribe( (transactResp: ItemTransactionJson) => {
      console.log("Response", transactResp);

    });

  }

  formToItemTransaction() {

    if( !this.addressFormGroup.value.defaultUserAddress ) {
      let tempAddres: UserAddressJson = new UserAddressJson();
      
      tempAddres.userId         = this.itemTransaction.$userBuyer.$id;
      tempAddres.name           = this.addressFormGroup.value.name;
      tempAddres.lastnames      = this.addressFormGroup.value.lastname;
      tempAddres.street         = this.addressFormGroup.value.street;
      tempAddres.intNumber      = this.addressFormGroup.value.intNumber;
      tempAddres.extNumber      = this.addressFormGroup.value.extNumber;
      tempAddres.zipCode        = this.addressFormGroup.value.zipCode;
      tempAddres.state          = this.addressFormGroup.value.state;
      tempAddres.city           = this.addressFormGroup.value.city;
      tempAddres.suburb         = this.addressFormGroup.value.suburb;
      tempAddres.reference      = this.addressFormGroup.value.reference;
      tempAddres.streetRef      = this.addressFormGroup.value.streetRef;
      tempAddres.phoneNumber    = this.addressFormGroup.value.phoneNumber;
      tempAddres.savedInProfile = false;

      this.itemTransaction.$buyerAddress = tempAddres;
    }
  }



  initPaypalInstance(itemTransact: ItemTransactionJson, clientId: string, totalBalance: string) : IPayPalConfig {

    let payPalConfig: IPayPalConfig;
    payPalConfig = {
      currency: 'MXN',

      clientId: 'AXDrazmijozxI9vYtlU8JbNIZORPtmfYmCYV6-M1lfKXnHuyfHhd7n8qq-hK2nRKvC7U8bJFfKuAladM',
      //clientId: 'sb-k85nq4604497_api1.business.example.com',
      createOrderOnClient: (data) => <ICreateOrderRequest> {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'MXN',
              value: totalBalance,
              breakdown: {
                item_total: {
                  currency_code: 'MXN',
                  value: totalBalance
                }
              }
            },
            items: [
              {
                name: itemTransact.$item.model,
                quantity: '1',
                category: 'PHYSICAL_GOODS',
                unit_amount: {
                  currency_code: 'MXN',
                  value: totalBalance,
                },
              }
            ]
          }
        ]
      },
      advanced: {
        commit: 'true'
      },
      style: {
        label: 'paypal',
        layout: 'vertical'
      },
      onApprove: (data, actions) => {
        //console.log('onApprove - transaction was approved, but not authorized', data, actions);

        //Save Transaction
        this.transactionStep(TRANSACT_STATUS_AFTER_TRANSACTION_APPROVED, "onApprove" + data );
        this.itemTransactService.save(this.itemTransaction)
            .subscribe( (itemTransactResp: any) => {
              this.itemTransaction.$itemTransactionHistory = itemTransactResp.itemTransactionHistory;
        });
        
        actions.order.get().then(details => {
          //console.log('onApprove - you can get full order details inside onApprove: ', details);

          //Save Transaction
          this.transactionStep(TRANSACT_STATUS_AFTER_TRANSACTION_APPROVED_AND_AUTHORIZED, "onApprove" + data );
          this.itemTransactService.save(this.itemTransaction)
              .subscribe( (itemTransactResp: any) => {
                this.itemTransaction.$itemTransactionHistory = itemTransactResp.itemTransactionHistory;
          });

        });
      },
      onClientAuthorization: (data) => {
        //console.log('onClientAuthorization - you should probably inform your server about completed transaction at this point', data);

        //Save Transaction
        this.transactionStep(TRANSACT_STATUS_CLIENT_AUTHORIZATION, "OnClientAuthorization" + data );
        this.itemTransactService.save(this.itemTransaction)
          .subscribe( (itemTransactResp: any) => {
              this.itemTransaction.$itemTransactionHistory = itemTransactResp.itemTransactionHistory;
              this.itemTransaction.$item.paymentConfirmed = true;
        });
      },
      onCancel: (data, actions) => {
        console.log('OnCancel', data, actions);

        //Save Transaction
        this.transactionStep(TRANSACT_STATUS_CANCEL_TRANSACTION, "OnCancel" + data + actions );
        this.itemTransactService.save(this.itemTransaction)
          .subscribe( (itemTransactResp: any) => {
              this.itemTransaction.$itemTransactionHistory = itemTransactResp.itemTransactionHistory;
        });
      },
      onError: err => {
        //console.log('OnError', err);

        //Save Transaction
        this.transactionStep(TRANSACT_STATUS_AFTER_TRANSACTION_FAILED, "onError" + err );
        this.itemTransactService.save(this.itemTransaction)
          .subscribe( (itemTransactResp: any) => {
              this.itemTransaction.$itemTransactionHistory = itemTransactResp.itemTransactionHistory;
        });

      },
      onClick: (data, actions) => {
        //console.log('onClick', data, actions);

        //Save Transaction
        this.transactionStep(TRANSACT_STATUS_BEFORE_TRANSACTION, "onClick" + data + actions);
        this.itemTransactService.save(this.itemTransaction)
            .subscribe( (itemTransactResp: any) => {
              this.itemTransaction.$id = itemTransactResp.id;
              this.itemTransaction.$itemTransactionHistory = itemTransactResp.itemTransactionHistory;
        });

      },
    };

    return payPalConfig;
  }

  transactionStep(status: string, description: string) {
    
    let transactionId: number = -1;
    if(this.itemTransaction.$id) {
      transactionId = this.itemTransaction.$id;
    }

    // set history
    this.itemTransaction.$itemTransactionHistory =
    this.itemTransaction.$itemTransactionHistory.concat(
      this.itemTransactService.itemTransactionStepToInsert(transactionId, status, description)
    );
    // set Status
    this.itemTransaction.$transactionStatus = status;
  }

  finalStep() {
   //openDialog
   const dialogRef = this.dialog.open(TransactionDialogComponent, {
      width: '250px',
      height: '200px',
      data: {
        image: "/assets/images/publish/cargada-error-11.svg"
      }
    })
    
    dialogRef.afterClosed().subscribe(result => {
    });
  }

  filterCatalog(floatingCharName: string): string {

    if(!this.itemTransaction.$item.itemFloatingChars) {
      return "NA!";
    }
    let charFiltered: ItemFloatingCharRel[]  =
    this.itemTransaction.$item.itemFloatingChars
      .filter( floatChar => {
        if(floatChar.floatingCharName == floatingCharName)
          return floatChar;
      });

    if(charFiltered.length > 0) {
      return charFiltered[0].floatingCharCatName;
    } else {
      return "NA";
    }
  }

    /**
   * 
   * @param itemResponse 
   * @param itemFloatingChars 
   */
  assignFloatingChars(itemResponse: UserItem, itemFloatingChars: ItemFloatingChars[]) {
    this.itemTransaction.$item = itemResponse;
    if(this.itemTransaction.$item.itemFloatingChars) {
      for (let j = 0; j < this.itemTransaction.$item.itemFloatingChars.length; j++) {
        

        // a) find "Float Char"
        let floatChar: ItemFloatingChars[] = itemFloatingChars.filter(floatChar => floatChar.floatingCharId == this.itemTransaction.$item.itemFloatingChars[j].floatingCharId );
        // b) find "Float Char Value"
        let floatCharCat: ItemFloatingCharsCat[] = [];

        // c) verify if Char was found
        if(floatChar.length > 0 && this.itemTransaction.$item.itemFloatingChars[j].floatingCharCatId) {
          floatCharCat = floatChar[0].catalogList.filter(floatCatChar => floatCatChar.charId == this.itemTransaction.$item.itemFloatingChars[j].floatingCharCatId );
        }
        
        // d) assign using validations
        this.itemTransaction.$item.itemFloatingChars[j].floatingCharName = (floatChar.length > 0) ? floatChar[0].floatingCharName : "N/A";
        this.itemTransaction.$item.itemFloatingChars[j].floatingCharCatName = (floatCharCat.length > 0) ? floatCharCat[0].charName : "N/A";
      }
    }
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

}
