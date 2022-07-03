import * as zip from "@zip.js/zip.js";
import { basename, dirname, extname, join } from "@frank-mayer/magic/Path";

type fileProcessor = <T extends string | Blob>(
  name: string,
  content: T
) => { name: string; content: T };

type tree = Array<{
  path: string;
  sha: string;
  type: "dir" | "file";
  download_url?: string;
  url: string;
}>;

const processFile = (
  zipWriter: zip.ZipWriter<Blob>,
  name: string,
  content: string | Blob
) =>
  zipWriter.add(
    name,
    new zip.BlobReader(
      typeof content === "string"
        ? new Blob([content], { type: "text/plain" })
        : content
    )
  );

const processFolder = async (
  zipWriter: zip.ZipWriter<Blob>,
  baseUrl: string,
  data: tree | { tree: tree },
  fileProcessor: fileProcessor
) => {
  const tree = Array.isArray(data) ? data : data.tree;

  for (const entry of tree) {
    switch (entry.type) {
      case "file": {
        const res = await fetch(entry.download_url ?? entry.url);
        const bname = basename(entry.path);
        const bpath = dirname(entry.path);
        switch (extname(entry.path).toLowerCase()) {
          case ".png":
          case ".jpg":
          case ".jpeg":
          case ".gif":
          case ".webp": {
            const x = fileProcessor(bname, await res.blob());
            await processFile(zipWriter, join(bpath, x.name), x.content);
            break;
          }
          default:
            const x = fileProcessor(bname, await res.text());
            await processFile(zipWriter, join(bpath, x.name), x.content);
        }
        break;
      }

      case "dir": {
        const res = await fetch(baseUrl + entry.path);
        const data = (await res.json()) as tree;
        await processFolder(zipWriter, baseUrl, data, fileProcessor);
        break;
      }
    }
  }
};

export const downloadRepo = async (
  user: string,
  repository: string,
  fileProcessor: fileProcessor
) => {
  const baseUrl = `https://api.github.com/repos/${user}/${repository}/contents/`;

  const zipWriter = new zip.ZipWriter(new zip.BlobWriter());

  const res = await fetch(baseUrl);
  const data = (await res.json()) as tree;

  await processFolder(zipWriter, baseUrl, data, fileProcessor);
  return zipWriter;
};
