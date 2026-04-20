import net from "node:net";

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function isPortOpen(port: number, host = "127.0.0.1") {
  return new Promise<boolean>((resolve) => {
    const socket = new net.Socket();
    const done = (value: boolean) => {
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(700);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
    socket.connect(port, host);
  });
}

export function sanitizeName(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function expandHome(input: string) {
  if (input.startsWith("~/")) {
    return input.replace("~", process.env.HOME ?? "");
  }

  return input;
}

