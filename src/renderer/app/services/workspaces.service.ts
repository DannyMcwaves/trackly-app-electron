import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";

@Injectable()
export class WorkspacesService {
    private services: any[];

    constructor(private http: HttpClient) {
        // Get workspaces from the server
    }
}
