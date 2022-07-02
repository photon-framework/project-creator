import { Page, page } from "photon-re";
import { downloadRepo } from "./GitHub";
import * as zip from "@zip.js/zip.js";
import download from "downloadjs";

@page
export class Home implements Page {
  route = "/home";

  onRouted(): void {
    const forms = document.getElementsByTagName("form");
    if (forms.length > 0) {
      const formEl = forms[0]!;

      formEl.addEventListener(
        "submit",
        (ev) => {
          console.debug(ev);
          ev.preventDefault();
          ev.stopPropagation();
          this.onSubmit(new FormData(formEl));
        },
        {
          passive: false,
          capture: true,
        }
      );
    }
  }

  private onSubmit(formData: FormData) {
    const projectName = formData.get("project_name") as string;
    const domain = formData.get("domain") as string;
    console.debug(projectName, domain);
    downloadRepo("photon-framework", "template")
      .then((x) => {
        x.close()
          .then((b) => {
            download(b, `${projectName}.zip`, "application/zip");
          })
          .catch(console.error);
      })
      /*.then((blob) => {
        console.debug(blob);
        console.debug(blob.size + " bytes");
        const reader = new zip.ZipReader(new zip.BlobReader(blob));
        reader
          .getEntries()
          .then((entries) => {
            console.debug(entries);
          })
          .catch(console.error);
      })*/
      .catch(console.error);
  }
}
