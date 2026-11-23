import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export async function saveBrowserFile(page, selector, directory, expectedName) {
  const name = expectedName || await page.$eval(selector, (a) => a.download);
  if (!name || name !== path.basename(name)) throw Error('Invalid download filename');
  const target = path.join(directory, name),
    cdp = await page.createCDPSession(),
    id = page.browserContext().id;
  try {
    await cdp.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: directory,
      ...(id ? { browserContextId: id } : {}),
    });
    await page.click(selector);
    for (let retry = 0; retry < 100 && !fs.existsSync(target); retry++) await delay(75);
    if (!fs.existsSync(target)) throw Error('Browser did not finish downloading ' + name);
    return { name, bytes: fs.statSync(target).size, url: pathToFileURL(target).href };
  } finally {
    await cdp.detach();
  }
}
