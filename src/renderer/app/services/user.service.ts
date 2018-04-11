const Store = require("electron-store");

import { Injectable } from "@angular/core";
import { HttpClient, HttpResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import 'rxjs/add/operator/map';


@Injectable()
export class UserService {
  private apiURL = 'https://trackly.com/api';
  private user: Object|null;
  private store: any;

  constructor(private http: HttpClient, private router: Router) {
    this.store = new Store();
  }

  /**
   * Login user to the application.
   */
  login(credentials: any) {
    return this.http.post(this.apiURL + "/login", credentials);
  }

  /**
   * Logout user from the application and remove the token.
   */
  logout() {
    this.store.delete("token");
    this.store.delete("userId");
    this.router.navigate(['login']);
  }
}
