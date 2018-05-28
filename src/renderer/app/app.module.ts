import {NgModule} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {HttpModule} from "@angular/http";
import {AppComponent} from "./app.component";
import {LoginComponent} from "./login/login.component";
import {DialogComponent} from "./dialog/dialog.component";
import {RouterModule} from "@angular/router";
import {UserService} from "./services/user.service";
import {HttpClientModule} from "@angular/common/http";
import {DashboardComponent} from "./dashboard/dashboard.component";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import { TimeDurationPipe } from "./pipes/duration.pipe";
import { sincePipeline } from "./pipes/since.pipe";

@NgModule({
    imports: [
        BrowserModule,
        ReactiveFormsModule,
        FormsModule,
        HttpModule,
        HttpClientModule,
        NgbModule.forRoot(),
        RouterModule.forRoot([
            {
                path: "login",
                component: LoginComponent
            },
            {
                path: "dialog",
                component: DialogComponent
            },
            {
                path: "",
                component: DashboardComponent
            },

        ], { useHash: true })
    ],
    declarations: [
        AppComponent,
        LoginComponent,
        DialogComponent,
        TimeDurationPipe,
        sincePipeline,
        DashboardComponent],
    providers: [UserService],
    bootstrap: [AppComponent]
})

export class AppModule {}
