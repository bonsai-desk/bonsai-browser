/* eslint no-console: off */
import { Database } from '@nozbe/watermelondb';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';
import { ipcRenderer } from 'electron';
import schema from './schema';
import migrations from './migrations';
import PageModel from './PageModel';
import TagModel from './TagModel';
import PageTag from './PageTag';
// import Post from './watermelon/Post' // ⬅️ You'll import your Models here

function loadOrCreateWatermelonDB(dbName: string) {
  const adapter = new LokiJSAdapter({
    schema,
    // (You might want to comment out migrations for development purposes -- see Migrations documentation)
    migrations,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
    dbName,

    // --- Optional, but recommended event handlers:
    onQuotaExceededError: (error) => {
      // Browser ran out of disk space -- offer the user to reload the app or log out
      throw error;
    },
    onSetUpError: (error) => {
      // Database failed to load -- offer the user to reload the app or log out
      throw error;
    },
    extraIncrementalIDBOptions: {
      onDidOverwrite: () => {
        // Called when this adapter is forced to overwrite contents of IndexedDB.
        // This happens if there's another open tab of the same app that's making changes.
        // Try to synchronize the app now, and if user is offline, alert them that if they close this
        // tab, some data may be lost
      },
      onversionchange: () => {
        // database was deleted in another browser tab (user logged out), so we must make sure we delete
        // it in this tab as well - usually best to just refresh the page
        // if (checkIfUserIsLoggedIn()) {
        //   window.location.reload();
        // }
      },
    },
  });

  // Then, make a Watermelon database from it!
  return new Database({
    adapter,
    modelClasses: [PageModel, TagModel, PageTag],
  });
}

export default loadOrCreateWatermelonDB;

export async function executeWatermelon(
  func: () => Promise<void>,
  printSuccess = false
) {
  await func()
    .then(
      () => {
        if (printSuccess) {
          console.log('success');
        }
        return null;
      },
      (e) => {
        console.log('executeWatermelon reject');
        console.log(e);
        ipcRenderer.send('log-data', 'executeWatermelon reject');
        ipcRenderer.send('log-data', e);
      }
    )
    .catch((e) => {
      console.log('executeWatermelon error');
      console.log(e);
      ipcRenderer.send('log-data', 'executeWatermelon error');
      ipcRenderer.send('log-data', e);
    });
}

// await database.unsafeResetDatabase();
// const newPage = await database
//   .get<Page>(TableName.PAGES)
//   .create((page) => {
//     page.url = 'https://google2.com';
//   });
//
// const newTag = await database.get<Tag>(TableName.TAGS).create((tag) => {
//   tag.title = 'google2';
// });
//
// await database.get<PageTag>(TableName.PAGETAGS).create((pageTag) => {
//   pageTag.page.set(newPage);
//   pageTag.tag.set(newTag);
// });
