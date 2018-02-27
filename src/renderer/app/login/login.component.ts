import { Component, ViewEncapsulation, OnInit } from "@angular/core";

import "./login.component.scss";
import { FormGroup, FormControl } from "@angular/forms";
import { UserService } from "../services/user.service";
import { Router } from "@angular/router";
import { ipcRenderer } from "electron";
import { NgbTooltip } from "@ng-bootstrap/ng-bootstrap";

NgbTooltip.prototype.ngOnDestroy = function () {
  this.close();
  //this._unregisterListenersFn();
  this._zoneSubscription.unsubscribe();
};

@Component({
  selector: "#app",
  templateUrl: "/login.component.html",
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements OnInit{
  ngOnInit(): void {
    let element = document.getElementsByTagName("html")[0]
    let positionInfo = element.getBoundingClientRect();
    console.log(positionInfo.height);
    ipcRenderer.send('win:height', positionInfo.height);
  }
  loginTriedAndFailed = false;

  constructor (private userService: UserService, private router: Router){}

  form = new FormGroup({
    email: new FormControl(),
    password: new FormControl()
  });

  get email() {
    return this.form.get("email");
  }

  get password() {
    return this.form.get("password");
  }

  /**
   * Open signup link in an external window.
   */
  openSignup() {
    ipcRenderer.send('open:link', 'https://trackly.com/app');
  }

  /**
   * Login user into the application.
   */
  onSubmit() {
    let data = {
        'email':this.email.value,
        'password': this.password.value
      };

      let v = this.userService.login(data);
      this.router.navigate(['dash']);
  }
}
