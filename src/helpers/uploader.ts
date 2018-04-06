import * as logger from "electron-log";
import * as req from "request";
import * as fse from "fs-extra";
import { ReadStream } from "fs-extra";

class Uploader {
  /**
   * Generate ReadStream object from the path
   * @param path
   */
  getFile(path: string) {
    return fse.createReadStream(path);
  }

  /**
   * Upload single file to server
   * @param path
   * @param url
   * @param cleanup
   */
  upload(path: string, url: string, cleanup: boolean) {
    // Get queued file
    const data = { res: this.getFile(path) };

    req.post(url, { formData: data }, (err, res, data) => {
      if (!err && res.statusCode == 200) {
        // Upload successful
        logger.info(`Uploaded: ${path}`);
        if (cleanup) {
          fse.unlink("path", () => {});
          logger.info(`Deleted: ${path}`);
          // Upload failed
        } else {
          logger.error("File upload failed");
        }
      }
    });
  }

  /**
   * Upload all files inside a directory to a server
   * @param dir 
   * @param url 
   */
  uploadDir(dir: string, url: string, ) {
    fse.readdir(dir, (err, files) => {
        files.forEach(file => {
            
        });
    });
  }
}
