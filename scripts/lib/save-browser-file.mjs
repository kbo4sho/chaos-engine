import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';

export async function saveBrowserFile(page, selector, directory, expectedName) {
  const name = expectedName || (await page.$eval(selector, (a) => a.download));
  if (!name || name !== path.basename(name)) throw Error('Invalid download filename');
  const target = path.join(directory, name),
    cdp = await page.createCDPSession(),
    id = page.browserContext().id,
    incoming = fs.mkdtempSync(path.join(directory, '.download-')),
    file = path.join(incoming, name);
  try {
    await cdp.send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: incoming,
      ...(id ? { browserContextId: id } : {}),
    });
    await page.click(selector);
    let previous = 0;
    for (let attempt = 0; attempt < 200; attempt++) {
      const size = fs.statSync(file, { throwIfNoEntry: false })?.size || 0;
      if (
        size > 0 &&
        size === previous &&
        !fs.readdirSync(incoming).some((n) => n.endsWith('.crdownload'))
      ) {
        fs.renameSync(file, target);
        return { name, bytes: size, url: pathToFileURL(target).href };
      }
      previous = size;
      await delay(75);
    }
    throw Error('Browser did not finish downloading ' + name);
  } finally {
    try {
      await cdp.send('Browser.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: directory,
        ...(id ? { browserContextId: id } : {}),
      });
    } finally {
      fs.rmSync(incoming, { recursive: true, force: true });
      await cdp.detach();
    }
  }
}
