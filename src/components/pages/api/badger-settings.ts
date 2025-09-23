// Lightweight fallback types for Next.js API types to avoid requiring the 'next' package during compilation
type NextApiRequest = {
  body?: any;
  headers: { [key: string]: string | string[] | undefined };
  method?: string | undefined;
};

type NextApiResponse = {
  status: (code: number) => NextApiResponse;
  json: (body: any) => void;
  setHeader?: (name: string, value: string) => void;
  end?: (message?: string) => void;
};

import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "badger-settings.json");

const DEFAULTS = { offsetY: 0, lightYaw: 0, lightHeight: 120, lightDist: 200 };

async function readSettings() {
  try {
    const txt = await fs.readFile(FILE, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(txt) };
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(DEFAULTS, null, 2));
    return DEFAULTS;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const settings = await readSettings();
    res.status(200).json(settings);
    return;
  }

  if (req.method === "POST") {
    const key = req.headers["x-admin-key"];
    const expected = process.env.BADGER_ADMIN_KEY; // set this in your env/hosting
    if (!expected || key !== expected) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const next = { ...DEFAULTS, ...body };
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(next, null, 2));
    res.status(200).json({ ok: true, settings: next });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).end("Method Not Allowed");
}
