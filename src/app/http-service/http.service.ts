import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../_models/User-model';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  constructor(private http: HttpClient) { }

  get(url: string): Observable<any> {
    return this.http.get(url);
  }

  getWithHeaders(url: string, headers: any): Observable<any> {
    return this.http.get(url, headers);
  }

  getBodyRequest(url: string, body: any): Observable<any> {
    return this.http.get(url, body);
  }

  post(url: string, requestBody: any): Observable<any> {
    return this.http.post(url, requestBody);
  }

  postAuth(url: string, requestBody: any, user: User): Observable<any> {

    console.log(url);
    let headers = new HttpHeaders().set('Authorization', "Bearer " + user.token);
    
    return this.http.post(url, requestBody, {headers} );
  }

  putAuth(url: string, requestBody: any, user: User): Observable<any> {

    let headers = new HttpHeaders().set('Authorization', "Bearer " + user.token);
    
    return this.http.put<User>(url, requestBody, {headers} );
  }

  put(url: string, requestBody: any): Observable<any> {
    return this.http.put(url, requestBody);
  }

  delete(url: string, options: any): Observable<any> {
    return this.http.delete(url, options);
  }

}
