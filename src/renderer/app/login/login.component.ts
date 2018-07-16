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
  public hidden: boolean = true;
  public hideReset: boolean = true;
  public positionInfo: number = 0;
  public formHeight: number = 0;
  public resetHeight: number = 0;
  private regex: any = /^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  private message: string = "Already have password?";
  private messageClass: string = "";

  ngOnInit(): void {
    let element = document.getElementsByTagName("html")[0];
    this.formHeight = document.getElementById("form").offsetHeight;
    this.resetHeight = document.getElementById("resetForm").offsetHeight;
    this.positionInfo = element.getBoundingClientRect().height;
    ipcRenderer.send("win:height", this.positionInfo - this.resetHeight);
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

  /*
  * Handler for resetting password.
  * **/
  resetClick(data:string) {
    let payload = {
      email: data
    };
    this.userService.reset(payload).subscribe(next => {
      this.message = 'PASSWORD RESET LINK SENT.';
      this.messageClass = 'text-success';
    }, err => {
      this.message = 'EMAIL NOT FOUND.';
      this.messageClass = 'text-danger';
    });
    return false;
  }

  /*
  * Handler for resetting password.
  * **/
  emailInput(data:string) {
    this.hideReset = !this.regex.test(data);
  }

  /*
  * Handler for resetting password.
  * **/
  forgotClick() {
    if (this.hidden) {
      ipcRenderer.send("win:height", this.positionInfo - this.formHeight);
    } else {
      ipcRenderer.send("win:height", this.positionInfo - this.resetHeight);
    }
    this.hidden = !this.hidden;
    this.message = "Already have password?";
    this.messageClass = "";
    return false;
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
      this.showAlert("warning", "Sign-in failed");
    });

  }

  showAlert(id: string, text: string){
    document.getElementById(id).getElementsByTagName("strong")[0].innerHTML = text;
    document.getElementById(id).style.display = "block";
  }

  closeAlert(id: string) {
    document.getElementById(id).style.display = "none";
  }
}
