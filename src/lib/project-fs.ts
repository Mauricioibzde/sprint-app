import { parseProject, slugifyName, toListItem, type ProjectListItem, type SpriteProject } from "@/lib/project";

const DB_NAME = "spritecut-library";
const STORE = "kv";
const HANDLE_KEY = "directoryHandle";

export function canUseFolderPicker() {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown) {
  const db = await openDb();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function rememberLibraryHandle(handle: FileSystemDirectoryHandle) {
  await idbSet(HANDLE_KEY, handle);
}

export async function loadRememberedHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = await idbGet<FileSystemDirectoryHandle>(HANDLE_KEY);
    return handle || null;
  } catch {
    return null;
  }
}

export async function queryFolderPermission(handle: FileSystemDirectoryHandle, write = true) {
  const opts = { mode: write ? "readwrite" : "read" } as const;
  try {
    if (typeof handle.queryPermission !== "function") return "prompt" as const;
    const current = await handle.queryPermission(opts);
    if (current === "granted") return "granted" as const;
    if (current === "denied") return "denied" as const;
    return "prompt" as const;
  } catch {
    return "prompt" as const;
  }
}

export async function requestFolderPermission(handle: FileSystemDirectoryHandle, write = true) {
  const opts = { mode: write ? "readwrite" : "read" } as const;
  try {
    if (typeof handle.requestPermission !== "function") return false;
    const result = await handle.requestPermission(opts);
    return result === "granted";
  } catch {
    return false;
  }
}

export async function pickLibraryFolder() {
  if (!window.showDirectoryPicker) throw new Error("Pasta local não suportada neste browser.");
  const handle = await window.showDirectoryPicker({
    id: "spritecut-projects",
    mode: "readwrite",
    startIn: "documents"
  });
  await rememberLibraryHandle(handle);
  return handle;
}

async function writeFile(dir: FileSystemDirectoryHandle, name: string, data: Blob | string) {
  const file = await dir.getFileHandle(name, { create: true });
  const writable = await file.createWritable();
  await writable.write(data);
  await writable.close();
}

async function readJson(dir: FileSystemDirectoryHandle): Promise<SpriteProject | null> {
  try {
    const file = await dir.getFileHandle("project.json");
    const text = await (await file.getFile()).text();
    return parseProject(JSON.parse(text));
  } catch {
    return null;
  }
}

export async function saveProjectToFolder(
  root: FileSystemDirectoryHandle,
  project: SpriteProject,
  sheet: Blob | null,
  thumb: Blob | null
) {
  const dir = await root.getDirectoryHandle(project.slug, { create: true });
  await writeFile(dir, "project.json", JSON.stringify(project, null, 2));
  if (sheet) await writeFile(dir, "sheet.png", sheet);
  if (thumb) await writeFile(dir, "thumb.jpg", thumb);
}

export async function listProjectsInFolder(root: FileSystemDirectoryHandle): Promise<ProjectListItem[]> {
  const items: ProjectListItem[] = [];
  for await (const [name, handle] of root.entries()) {
    if (handle.kind !== "directory") continue;
    const dir = handle as FileSystemDirectoryHandle;
    const project = await readJson(dir);
    if (!project) continue;
    let thumbUrl: string | null = null;
    try {
      const thumb = await dir.getFileHandle("thumb.jpg");
      thumbUrl = URL.createObjectURL(await thumb.getFile());
    } catch {
      thumbUrl = null;
    }
    items.push(toListItem({ ...project, slug: project.slug || name }, thumbUrl));
  }
  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return items;
}

export async function peekProject(root: FileSystemDirectoryHandle, slug: string): Promise<SpriteProject | null> {
  try {
    const dir = await root.getDirectoryHandle(slug);
    return await readJson(dir);
  } catch {
    return null;
  }
}

export async function loadProjectFromFolder(root: FileSystemDirectoryHandle, slug: string) {
  const dir = await root.getDirectoryHandle(slug);
  const project = await readJson(dir);
  if (!project) throw new Error("project.json em falta em " + slug);
  let sheet: File | null = null;
  try {
    sheet = await (await dir.getFileHandle("sheet.png")).getFile();
  } catch {
    sheet = null;
  }
  return { project, sheet };
}

export async function deleteProjectFolder(root: FileSystemDirectoryHandle, slug: string) {
  await root.removeEntry(slug, { recursive: true });
}

export async function renameProjectInFolder(
  root: FileSystemDirectoryHandle,
  oldSlug: string,
  newName: string
): Promise<SpriteProject> {
  const name = newName.trim();
  if (!name) throw new Error("O nome não pode ficar vazio.");
  const oldDir = await root.getDirectoryHandle(oldSlug);
  const project = await readJson(oldDir);
  if (!project) throw new Error("project.json em falta em " + oldSlug);
  const wanted = slugifyName(name);
  let slug = wanted;
  let n = 2;
  while (true) {
    const existing = await peekProject(root, slug);
    if (!existing || existing.id === project.id) break;
    slug = wanted + "-" + n;
    n += 1;
  }
  const next: SpriteProject = {
    ...project,
    name,
    slug,
    updatedAt: new Date().toISOString()
  };
  if (slug === oldSlug) {
    await writeFile(oldDir, "project.json", JSON.stringify(next, null, 2));
    return next;
  }
  const newDir = await root.getDirectoryHandle(slug, { create: true });
  await writeFile(newDir, "project.json", JSON.stringify(next, null, 2));
  for (const fileName of ["sheet.png", "thumb.jpg"]) {
    try {
      const file = await (await oldDir.getFileHandle(fileName)).getFile();
      await writeFile(newDir, fileName, file);
    } catch {
      /* optional */
    }
  }
  await root.removeEntry(oldSlug, { recursive: true });
  return next;
}

export function revokeThumbUrls(items: ProjectListItem[]) {
  items.forEach((item) => {
    if (item.thumbUrl) URL.revokeObjectURL(item.thumbUrl);
  });
}

export async function makeSheetThumb(img: HTMLImageElement, maxW = 320): Promise<Blob | null> {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return null;
  const scale = Math.min(1, maxW / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
  });
}
