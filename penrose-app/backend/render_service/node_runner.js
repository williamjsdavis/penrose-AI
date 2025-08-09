// node_runner.js
// Usage: node node_runner.js <tempdir>
// Expects: tempdir contains trio files: domain.dsl, substance.dsl, style.dsl

import fs from "fs";
import path from "path";
import { JSDOM } from "jsdom";

async function main() {
  // Create a minimal DOM environment for @penrose/core
  const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.SVGElement = dom.window.SVGElement;
  global.Node = dom.window.Node;

  const { compile, optimize, toSVG, showError } = await import("@penrose/core");

  const tmp = process.argv[2];
  if (!tmp) {
    console.error("Usage: node node_runner.js <tmpdir>");
    process.exit(2);
  }
  const domain = fs.readFileSync(path.join(tmp, "domain.dsl"), "utf8");
  const substance = fs.readFileSync(path.join(tmp, "substance.dsl"), "utf8");
  const style = fs.readFileSync(path.join(tmp, "style.dsl"), "utf8");
  const variation = process.env.PENROSE_VARIATION || "test";

  try {
    const compiled = await compile({ domain, substance, style, variation });
    if (compiled.isErr && compiled.isErr()) {
      console.error(JSON.stringify({ error: showError(compiled.error) }));
      process.exit(3);
    }

    const converged = optimize(compiled.value ?? compiled.state ?? compiled);
    if (converged.isErr && converged.isErr()) {
      console.error(JSON.stringify({ error: showError(converged.error) }));
      process.exit(4);
    }

    const rendered = await toSVG((converged.value ?? converged), async () => undefined);

    let svgText = "";
    if (rendered && typeof rendered === "string") {
      svgText = rendered;
    } else if (rendered && typeof rendered.outerHTML === "string") {
      svgText = rendered.outerHTML;
    } else if (rendered && typeof rendered.toString === "function") {
      svgText = rendered.toString();
    } else {
      svgText = String(rendered);
    }

    process.stdout.write(svgText);
  } catch (err) {
    console.error(JSON.stringify({ error: String(err) }));
    process.exit(5);
  }
}

main(); 