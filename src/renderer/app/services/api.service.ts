// tslint:disable-next-line:no-var-requires
const Store = require("electron-store");

export class ApiService {
    private baseURL: string;
    private store: any;
    private reportsUrl: any;

    constructor() {
        this.store = new Store();
        this.baseURL = process.env.apiUrl ? process.env.apiUrl + "/api" : "https://trackly.com/api";
        this.reportsUrl = process.env.reportsUrl ? process.env.reportsUrl : "https://trackly.com/api/logs";
    }

    // TODO: Move to decorator
    private getToken() {
        return '?access_token=' + this.store.get('token');
    }

    getBaseUrl() {
        return this.baseURL;
    }

    uploadScreenshotsURL() {
        return this.baseURL + '/images/upload' + this.getToken();
    }

    uploadActivitiesURL() {
        return this.baseURL + '/eventFiles/upload' + this.getToken();
    }

    uploadErrorReportsURL() {
        return this.reportsUrl;
    }
}
