import { downloadZip } from "client-zip";
import type {
  InputWithMeta,
  InputWithSizeMeta,
  InputWithoutMeta,
} from "client-zip";
import { basename, dirname, extname, join } from "@frank-mayer/magic/Path";

class FileCollector<
  T extends InputWithMeta | InputWithSizeMeta | InputWithoutMeta =
    | InputWithMeta
    | InputWithSizeMeta
    | InputWithoutMeta
> implements AsyncIterable<T>, Iterable<T>
{
  private readonly bucket = new Array<T>();

  public add(file: T): void {
    this.bucket.push(file);
  }

  public async *[Symbol.asyncIterator](): AsyncIterator<T, any, undefined> {
    for await (const el of this.bucket) {
      yield el;
    }
  }

  public [Symbol.iterator](): Iterator<T> {
    return this.bucket[Symbol.iterator]();
  }

  public archive() {
    return downloadZip(this);
  }
}

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
  zipWriter: FileCollector,
  name: string,
  content: string | Blob
) => {
  if (typeof content === "string") {
    zipWriter.add(
      new File([content], name, {
        type: "text/plain",
      })
    );
  } else {
    zipWriter.add(
      new File([content], name, {
        type: content.type,
      })
    );
  }
};

const processFolder = async (
  zipWriter: FileCollector,
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

  const fileCollector = new FileCollector();

  const res = await fetch(baseUrl);
  const data = (await res.json()) as tree;

  await processFolder(fileCollector, baseUrl, data, fileProcessor);
  return fileCollector;
};
