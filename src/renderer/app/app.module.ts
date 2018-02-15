import {NgModule} from "@angular/core";
import {BrowserModule} from "@angular/platform-browser";
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {HttpModule} from "@angular/http";
import {AppComponent} from "./app.component";
import {LoginComponent} from "./login/login.component";
import {RouterModule} from "@angular/router";
import {UserService} from "./services/user.service";
import {HttpClientModule} from "@angular/common/http";
import {DashboardComponent} from "./dashboard/dashboard.component";
import {NgbModule} from "@ng-bootstrap/ng-bootstrap";
import { ProjectsComponent } from "./components/projects/projects.component";

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
                path: "",
                component: DashboardComponent
            }
        ])
    ],
    declarations: [
        AppComponent, 
        LoginComponent, 
        ProjectsComponent,
        DashboardComponent],
    providers: [UserService],
    bootstrap: [AppComponent]
})

export class AppModule {
}
