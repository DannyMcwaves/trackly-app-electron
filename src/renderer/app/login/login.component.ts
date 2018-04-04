// tslint:disable-next-line:no-var-requires
const Store = require("electron-store");
const app = require('electron').remote.app;

import { Component, ViewEncapsulation, OnInit } from "@angular/core";
import "./login.component.scss";
import { FormGroup, FormControl } from "@angular/forms";
import { UserService } from "../services/user.service";
import { Router } from "@angular/router";
import { ipcRenderer } from "electron";

@Component({
  selector: "#app",
  templateUrl: "/login.component.html",
  encapsulation: ViewEncapsulation.None
})
export class LoginComponent implements OnInit {

  private store: any;
  public appVersion = app.getVersion();

  ngOnInit(): void {
    let element = document.getElementsByTagName("html")[0];
    let positionInfo = element.getBoundingClientRect();
    ipcRenderer.send("win:height", positionInfo.height);
  }

  constructor(private userService: UserService, private router: Router) {
    this.store = new Store();
  }

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
    ipcRenderer.send("open:link", "https://trackly.com/app");
  }

  /**
   * Login user into the application.
   */
  onSubmit() {
    let data = {
      email: this.email.value,
      password: this.password.value
    };

    this.userService.login(data).subscribe(res => {
      this.store.set('token', res['id']);
      this.store.set('userId', res['userId']);
      this.router.navigate([""]);
    }, err => {
      alert("Login failed");
    });

  }
}
