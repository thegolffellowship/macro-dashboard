import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { TGFData, TGFEvent, Golfer } from "@/lib/types";

const DATA_PATH = path.join(process.cwd(), "data", "tgf.json");

function readData(): TGFData {
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

function writeData(data: TGFData) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

export async function GET() {
  const data = readData();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const body = await req.json();
  const data = readData();

  if (body.action === "add_event") {
    const event: TGFEvent = body.event;
    event.id = event.id || `evt_${Date.now()}`;
    data.events.push(event);
    writeData(data);
    return NextResponse.json({ ok: true, event });
  }

  if (body.action === "add_golfer") {
    const golfer: Golfer = body.golfer;
    golfer.id = golfer.id || `g_${Date.now()}`;
    data.golfers.push(golfer);
    writeData(data);
    return NextResponse.json({ ok: true, golfer });
  }

  if (body.action === "import_golfers") {
    const golfers: Golfer[] = body.golfers;
    for (const g of golfers) {
      g.id = g.id || `g_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const existing = data.golfers.findIndex(
        (eg) => eg.name.toLowerCase() === g.name.toLowerCase()
      );
      if (existing >= 0) {
        data.golfers[existing] = { ...data.golfers[existing], ...g };
      } else {
        data.golfers.push(g);
      }
    }
    writeData(data);
    return NextResponse.json({ ok: true, count: golfers.length });
  }

  if (body.action === "update_event") {
    const idx = data.events.findIndex((e) => e.id === body.event.id);
    if (idx >= 0) {
      data.events[idx] = body.event;
      writeData(data);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  if (body.action === "delete_event") {
    data.events = data.events.filter((e) => e.id !== body.eventId);
    writeData(data);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
