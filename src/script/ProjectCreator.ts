import { Page, page } from "photon-re";
import { downloadRepo } from "./GitHub";
import download from "downloadjs";
import "@frank-mayer/magic";
import { extname } from "@frank-mayer/magic";

@page
export class ProjectCreator implements Page {
  route = "/project_creator";

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
    const projectDisplay = projectName.replace(/[_\-.]+/g, " ").capitalize();

    let domain = formData.get("domain") as string;
    while (domain.endsWith("/")) {
      domain = domain.substring(0, domain.length - 1);
    }

    const favicon = formData.get("favicon") as File;

    console.debug("favicon", `<${typeof favicon}>`, favicon);

    console.debug(projectName, domain);
    downloadRepo(
      "photon-framework",
      "template",
      <T extends string | Blob>(
        name: string,
        content: T
      ): { name: string; content: T } => {
        if (typeof content === "string") {
          switch (name) {
            case "index.html": {
              if (favicon.name && favicon.size) {
                const ext = extname(favicon.name);
                const faviconName = "favicon" + ext;
                let mime =
                  ext === ".svg"
                    ? "image/svg+xml"
                    : `image/${ext.substring(1)}`;

                content = content.replace(
                  /<link\s+rel="shortcut icon"\s+href=".\/img\/[^"]+"\s+(type="image\/[^"]+")?\s*\/>/gi,
                  `<link rel="icon" href="./img/${faviconName}" type="${mime}" \/>`
                ) as T;
              }

              content = (content as string)
                .replace(
                  /<title>[^<>]+<\/title>/gi,
                  `<title>${projectDisplay}</title>`
                )
                .replace(
                  /<meta\s+name="title"\s+content="([^<>/]+)"\s*\/>/gi,
                  `<meta name="title" content="${projectDisplay}" />`
                )
                .replace(
                  /<link\s+rel="canonical"\s+href="[^"]+"\s*\/>/gi,
                  `<link rel="canonical" href="${domain}" />`
                ) as T;
              return { name: name, content: content };
            }

            case "package.json": {
              const packageJson = JSON.parse(content);
              packageJson.name = projectName;
              content = JSON.stringify(packageJson, null, 2).replace(
                /--public-url \\"[^"]+\\"/gi,
                `--public-url \\"${domain}/\\"`
              ) as T;
              return { name: name, content: content };
            }

            case "README.md": {
              return {
                content: `# ${projectDisplay}

<a href="https://github.com/photon-framework" title="build with photon">Build with <img style="height:1em" src="https://badgen.net/badge/%CE%B3/photon/purple" alt="photon" /></a>
` as T,
                name,
              };
            }

            default:
              return { name, content };
          }
        } else {
          if (name === "favicon.webp" && favicon.name && favicon.size) {
            const fileName = "favicon" + extname(favicon.name);
            return {
              name: fileName,
              content: favicon as Blob as T,
            };
          } else {
            return { name, content };
          }
        }
      }
    )
      .then((x) => {
        x.close()
          .then((b) => {
            download(b, `${projectName}.zip`, "application/zip");
          })
          .catch(console.error);
      })
      .catch(console.error);
  }
}