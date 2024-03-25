import ollama from "ollama";
import { $ } from "bun";
import EventEmitter from "events";
import { compareV } from "./utils";
import e from "./errors";

// @ts-expect-error no check
import goodbye from "graceful-goodbye";

export default class Mistral extends EventEmitter {
  public chat: (typeof ollama.chat) = ollama.chat;
  constructor() {
    super();
    this.initialize();
  }
  private async initialize() {
    const version = (await $`ollama -v`).stdout
      .toString("utf-8")
      .match(/(\d+\.\d+\.\d+)/)?.[0];
    if (!version) {
      console.log("couldn't find ollama, installing...");
      await $`curl -fsSL https://ollama.com/install.sh | sh`;
      console.log("installed ollama");
      const installedVersion = (await $`ollama -v`).stdout
        .toString("utf-8")
        .match(/(\d+\.\d+\.\d+)/)?.[0];
      if (installedVersion) {
        console.log(`installed version: ${installedVersion}`);
        this.resumeStartup(installedVersion);
      } else {
        throw new Error(
          "Could not install ollama, please download it manually from the official website."
        );
      }
    } else {
      console.log(`found ollama in path, version: ${version}`);
      this.resumeStartup(version);
    } 
  }

  private async resumeStartup(version: string) {
    console.log("called");
    if (!compareV(version, "0.1.29")) console.error(e.e1);
    const worker = new Worker(new URL("serve.ts", import.meta.url).href, {
      smol: true,
    });
    worker.onmessage = async (e) => {
      if (e.data !== "open") return;
      console.info("ollama serving..");
      setTimeout(async () => {
        await $`ollama run mistral | echo /bye`;
        console.info("pulled ollama weights.");
        this.emit("ready");
      }, 5000); // I'm sorry if it doesn't start up :(
      goodbye(() => {
        console.info("\nterminating worker..");
        worker.terminate();
        console.log("terminated");
      });
    };
  }
}

const mistral = new Mistral();

mistral.on("ready", async () => {
  const message = { role: 'user', content: 'Why is the sky blue?' };
  const response = await mistral.chat({ model: 'mistral', messages: [message], stream: true });
});