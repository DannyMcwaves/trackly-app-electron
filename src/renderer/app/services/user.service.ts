import { Injectable } from "@angular/core";
import { HttpClient, HttpResponse } from "@angular/common/http";
import { Router } from "@angular/router";
import 'rxjs/add/operator/map';


@Injectable()
export class UserService {
  private apiURL = "https://trackly.com/api/users";
  private user: Object|null;

  constructor(private http: HttpClient, private router: Router) {}

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
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    this.router.navigate(['']);
  }
}
