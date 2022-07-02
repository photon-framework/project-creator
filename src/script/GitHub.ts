import * as zip from "@zip.js/zip.js";
import { join } from "@frank-mayer/magic/Path";

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
  path: string,
  content: string
) =>
  zipWriter.add(
    path ? join(path, name) : name,
    new zip.BlobReader(new Blob([content], { type: "text/plain" }))
  );

const processFolder = async (
  zipWriter: zip.ZipWriter<Blob>,
  baseUrl: string,
  path: string,
  data: tree | { tree: tree }
) => {
  const tree = Array.isArray(data) ? data : data.tree;

  for (const entry of tree) {
    switch (entry.type) {
      case "file":
        {
          const res = await fetch(entry.download_url ?? entry.url);
          const content = await res.text();
          await processFile(zipWriter, entry.path, path, content);
        }
        break;

      case "dir":
        {
          const res = await fetch(baseUrl + entry.path);
          const data = (await res.json()) as tree;
          await processFolder(zipWriter, baseUrl, entry.path, data);
        }
        break;
    }
  }
};

export const downloadRepo = async (user: string, repository: string) => {
  const url = `https://api.github.com/repos/${user}/${repository}/contents/`;

  const zipWriter = new zip.ZipWriter(new zip.BlobWriter());

  const res = await fetch(url);
  const data = (await res.json()) as tree;

  await processFolder(zipWriter, url, "", data);
  return zipWriter;
};
