import { Database } from '@nozbe/watermelondb';
import { ipcRenderer } from 'electron';
import { addTagStrings, getTagOrCreate } from '../watermelon/databaseUtils';

export default async function addOnboardingData(database: Database) {
  await addTagStrings(database, 'https://bonsaibrowser.com/', 'bonsai', {
    title: 'Bonsai | Web Browser for Research',
    favicon: 'https://bonsaibrowser.com/favicon.png',
  });

  await addTagStrings(database, 'https://bonsaibrowser.com/', 'tech', {
    title: 'Bonsai | Web Browser for Research',
    favicon: 'https://bonsaibrowser.com/favicon.png',
  });

  await addTagStrings(
    database,
    'https://en.wikipedia.org/wiki/Bonsai',
    'bonsai',
    {
      title: 'Bonsai - Wikipedia',
      favicon: 'https://en.wikipedia.org/favicon.ico',
    }
  );

  await addTagStrings(
    database,
    'https://en.wikipedia.org/wiki/Bonsai',
    'tree',
    {
      title: 'Bonsai - Wikipedia',
      favicon: 'https://en.wikipedia.org/favicon.ico',
    }
  );

  await addTagStrings(database, 'https://news.ycombinator.com/', 'source', {
    title: 'Hacker News',
    favicon: 'https://news.ycombinator.com/favicon.ico',
  });

  await addTagStrings(database, 'https://news.ycombinator.com/', 'tech', {
    title: 'Hacker News',
    favicon: 'https://news.ycombinator.com/favicon.ico',
  });

  await addTagStrings(database, 'https://twitter.com/bonsaibrowser', 'bonsai', {
    title: 'bonsasibrowser (@bonsaibrowser)',
    favicon: 'https://twitter.com/favicon.ico',
  });

  await addTagStrings(
    database,
    'https://github.com/hyferg/bonsai-browser-public',
    'bonsai',
    {
      title: 'hyferg/bonsai-browser-public',
      favicon: 'https://github.com/favicon.ico',
    }
  );

  await getTagOrCreate(database, 'todo');
  await getTagOrCreate(database, 'read later');

  ipcRenderer.send('create-tab-without-set', 'https://bonsaibrowser.com/');
  ipcRenderer.send(
    'create-tab-without-set',
    'https://en.wikipedia.org/wiki/Bonsai'
  );
  ipcRenderer.send('create-tab-without-set', 'https://news.ycombinator.com/');
  ipcRenderer.send(
    'create-tab-without-set',
    'https://twitter.com/bonsaibrowser'
  );
  ipcRenderer.send(
    'create-tab-without-set',
    'https://github.com/hyferg/bonsai-browser-public'
  );
}
