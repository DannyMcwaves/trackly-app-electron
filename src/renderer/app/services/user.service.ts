import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Router } from "@angular/router";

@Injectable()
export class UserService {
  private apiURL = "https://trackly.com/api/users/";
  private user: Object|null;

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Login user to the application.
   */
  login(credentials: any) {
    return this.http.post(this.apiURL + "login", credentials).subscribe(response => {
      localStorage.setItem('token', response['id']);
      // Get user
      this.http.get(this.apiURL + response['userId'] + '/?access_token' + response['id']).subscribe(response => {
        this.user = {
          'email': response['email'],
          'user': response['name'],
          'id': response['id']
        }

        console.log(this.user);
      });
    }, error => {
      return false;
    });
  }

  /**
   * Logout user from the application and remove the token.
   */
  logout() {
    localStorage.removeItem("token");
    this.router.navigate(['login']);
  }
}
