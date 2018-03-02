// tslint:disable-next-line:no-var-requires
const Store = require("electron-store");

export class ApiService {
    private baseURL: string;
    private store: any;

    constructor() {
    this.store = new Store();
    this.baseURL =
        process.env.ELECTRON_WEBPACK_APP_API_URL || "https://trackly.com/api";
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
}
