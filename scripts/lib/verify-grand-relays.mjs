import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import M from "matter-js";
import { relayCourse } from "../../one-part-missing/relay-course.js";
import { certify } from "../../one-part-missing/certify.js";
import { fittings } from "../../one-part-missing/machines.js";
import { fitCode } from "../../one-part-missing/work-orders.js";
export async function verifyGrandRelays(home, { url, record, shot, outDir }) {
  await home.goto(url);
  const pop = new Promise((r) => home.once("popup", r));
  await home.click("#puzzle-launcher");
  const p = await pop,
    errors = [],
    records = [];
  const watch = (q) => q.on("pageerror", (e) => errors.push(e.message));
  watch(p);
  await p.bringToFront();
  const text = (q, id) => q.$eval("#" + id, (e) => e.textContent);
  const head = (q, m) =>
    q.waitForFunction(
      (t) => document.querySelector("#machine-title")?.textContent === t,
      {},
      m.title,
    );
  const run = async (q, state) => {
    await q.select("#playback-rate", "4");
    await q.click("#run");
    await q.waitForFunction(
      (s) => document.querySelector("#pilot").dataset.state === s,
      {},
      state,
    );
  };
  const place = async (q, f) => {
    await q.click('[data-part="' + f.part + '"]');
    await q.click('[data-socket="' + f.socket + '"]');
  };
  const lines = (q) =>
    q.$$eval("#dispatch-events li", (es) => es.map((e) => e.textContent));
  const stored = (q, m) =>
    q.evaluate(
      (k) =>
        JSON.parse(localStorage.getItem("chaos.one-part-missing.repair." + k)),
      m.id,
    );
  await p.setViewport({
    width: 390,
    height: 664,
    isMobile: true,
    hasTouch: true,
  });
  await p.tap("#map-link");
  await p.tap("#course-index summary");
  await p.tap("#grand-entry");
  const first = relayCourse[0],
    opening = certify(M, first)[0];
  await head(p, first);
  await run(p, "miss");
  await p.tap("#dispatch-log summary");
  record(
    "unrepaired-door-stayed-closed",
    (await text(p, "dispatch-interval")).includes("stayed closed"),
  );
  await p.select("#dispatch-lane", "blue");
  record(
    "no-invented-blue-delivery",
    (await lines(p)).every((s) => !s.includes("Parcel received")),
  );
  const fits = fittings(first, opening);
  await place(
    p,
    fits.find((f) => f.part === "swirl"),
  );
  await run(p, "miss");
  await p.tap("#dispatch-log summary");
  await p.select("#dispatch-lane", "machine");
  record(
    "upstream-fix-reaches-real-hatch",
    (await lines(p)).some((s) => s.includes("Hatch opened")) &&
      !(await stored(p, first)),
  );
  await p.tap("#dispatch-events button");
  const eventTime = await p.$eval(
    "#dispatch-events button time",
    (e) => e.textContent,
  );
  record(
    "inspect-handoff-time",
    (await text(p, "counter")) === eventTime,
    eventTime,
  );
  await place(
    p,
    fits.find((f) => f.part !== "swirl"),
  );
  for (const [i, m] of relayCourse.entries()) {
    if (i === 10) await p.setViewport({ width: 1280, height: 800, isMobile: false, hasTouch: false });
    if (i) {
      await p.click("#next");
      await head(p, m);
      for (const f of fittings(m, certify(M, m)[0])) await place(p, f);
    }
    await run(p, "won");
    await p.click("#dispatch-log summary");
    const rows = await lines(p),
      stamp = await stored(p, m);
    record(
      "dispatch-" + m.id,
      rows.some((s) => s.includes("Trip switch tripped")) &&
        rows.some((s) => s.includes("Hatch opened")) &&
        rows.some((s) => s.includes("Parcel received")) &&
        (await text(p, "dispatch-interval")).includes("Hatch to receiver") &&
        !!stamp,
      rows,
    );
    records.push({ id: m.id, stamp, rows });
    if (i === 0 || i === 19) {
      await p.select("#dispatch-lane", "blue");
      await p.click("#dispatch-paths");
      record(
        "blue-only-" + i,
        (await lines(p)).every((s) => s.startsWith("Blue")) &&
          (await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          )),
      );
      await p.click("#dispatch-events li:last-child button");
      await shot(
        p,
        "blue-delivery-" + (i === 0 ? "phone" : "desktop") + ".png",
      );
    }
  }
  const last = relayCourse.at(-1),
    finalFit = certify(M, last)[0];
  const ctx = await p.browser().createBrowserContext(),
    fresh = await ctx.newPage();
  watch(fresh);
  const protocol = await p.createCDPSession();
  await protocol.send("Browser.grantPermissions", {
    origin: new URL(url).origin,
    permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"],
  });
  await p.click("#share-assembly");
  await p.waitForFunction(
    () =>
      !document.querySelector("#copy-fallback").hidden ||
      document.querySelector("#status").textContent.includes("copied"),
  );
  const href = await p.evaluate(async () =>
    document.querySelector("#copy-fallback").hidden
      ? await navigator.clipboard.readText()
      : document.querySelector("#share-url").value,
  );
  record(
    "canonical-dispatch-link",
    href.endsWith("/build/" + fitCode(last, finalFit)),
    href,
  );
  await fresh.goto(href);
  await head(fresh, last);
  record("shared-setup-starts-unearned", !(await stored(fresh, last)));
  await run(fresh, "won");
  record("shared-route-earned", !!(await stored(fresh, last))?.third);
  await protocol.send("Browser.setDownloadBehavior", {
    behavior: "allow",
    downloadPath: outDir,
  });
  await p.click("#save-replay");
  await p.waitForFunction(() =>
    document.querySelector("#status").textContent.includes("Replay file ready"),
  );
  const file = path.join(
    outDir,
    "one-part-missing-" + last.id + "-replay.html",
  );
  for (let i = 0; i < 60 && !fs.existsSync(file); i++) await delay(100);
  const f = await ctx.newPage(),
    external = [];
  watch(f);
  f.on("request", (r) => {
    if (/^https?:/.test(r.url())) external.push(r.url());
  });
  await f.setOfflineMode(true);
  await f.goto(pathToFileURL(file).href);
  await head(f, last);
  await f.select("#playback-rate", "4");
  await f.click("#replay");
  await f.waitForFunction(
    () => document.querySelector("#pilot").dataset.state === "won",
  );
  await f.click("#dispatch-log summary");
  const offline = await lines(f);
  record(
    "standalone-same-physical-events",
    JSON.stringify(offline) === JSON.stringify(records.at(-1).rows) &&
      !external.length,
    { offline, external },
  );
  await p.bringToFront();
  const openingSandbox=new Promise(resolve=>p.once('popup',resolve));
  await p.click('#open-sandbox');
  const sandbox=await openingSandbox;watch(sandbox);await sandbox.bringToFront();
  await sandbox.waitForFunction(()=>document.querySelector('#btn-pause')?.textContent.includes('PLAY'));
  await sandbox.click('#btn-save');
  if(await sandbox.$eval('#save-confirm',e=>e.open))await sandbox.click('#save-accept');
  await sandbox.waitForFunction(()=>document.querySelector('#save-feedback').textContent.includes('SAVED TO SLOT'));
  await sandbox.reload();await sandbox.click('#btn-load');await sandbox.click('#save-accept');
  await sandbox.waitForFunction(()=>document.querySelector('#save-feedback').textContent.includes('LOADED SLOT'));
  if((await read(sandbox,'btn-pause')).includes('PLAY'))await sandbox.click('#btn-pause');
  await sandbox.waitForFunction(()=>Composite.allBodies(world).some(b=>b.render.machineShape?.window&&b.render.struckAt>0),{timeout:18000});
  await sandbox.click('#btn-pause');
  const transfer=await sandbox.evaluate(()=>{
    const bodies=Composite.allBodies(world);
    return {tools:bodies.filter(b=>b.render.poweredAt>0).map(b=>b.label),
      times:bodies.filter(b=>b.render.machineShape?.sensor).map(b=>b.render.struckAt),
      fitted:bodies.filter(b=>b.render.machineShape?.fitted).map(b=>b.label)};
  });
  record('restored-twelve-tool-sandbox-delivery',new Set(transfer.tools).size===12&&transfer.fitted.length===3&&transfer.times.length===3&&transfer.times.every((t,i,ts)=>t>0&&(!i||t>ts[i-1])),transfer);
  await shot(sandbox,'restored-relay-sandbox.png');
  await sandbox.click('[data-tool="block"]');
  const stage=await sandbox.$('#game'),box=await stage.boundingBox();
  await sandbox.mouse.click(box.x+0.95*box.width,box.y+.35*box.height);
  await sandbox.waitForFunction(()=>Composite.allBodies(world).some(b=>b.render.type==='block'));
  const wallHit=sandbox.evaluate(()=>new Promise(resolve=>{
    const off=()=>Matter.Events.off(engine,'collisionStart',listener);
    const listener=({pairs})=>{
      if(pairs.some(({bodyA:a,bodyB:b})=>(a.render.type==='block'&&b.label==='wall')||(b.render.type==='block'&&a.label==='wall'))){off();clearTimeout(timer);resolve(true);}
    };
    const timer=setTimeout(()=>{off();resolve(false);},9000);
    Matter.Events.on(engine,'collisionStart',listener);
  }));
  await sandbox.click('#btn-pause');record('native-block-hits-sandbox-wall',await wallHit);
  await sandbox.close();
  fs.writeFileSync(
    path.join(outDir, "dispatch-records.json"),
    JSON.stringify({ records, href, offline, transfer }, null, 2),
  );
  await protocol.detach();
  await ctx.close();
  await p.close();
  record("runtime-errors", !errors.length, errors);
}
