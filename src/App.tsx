import { createBrowserRouter, RouterProvider, Outlet, redirect } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import EmptyLayout from './layouts/EmptyLayout';
import Welcome from './routes/Welcome';
import About from './routes/About';
import { clientLoader as welcomeLoader } from './routes/Welcome.loader';
import { clientAction as welcomeAction } from './routes/Welcome.action';
import { clientLoader as mainLayoutLoader } from './layouts/MainLayout.loader';
import { clientLoader as emptyLayoutLoader } from './layouts/EmptyLayout.loader';
import Story from './routes/Story';
import { clientLoader as storyLoader } from './routes/Story.loader';
import { clientAction as storyAction } from './routes/Story.action';

import Style from './routes/Style';
import { clientLoader as styleLoader } from './routes/Style.loader';
import { clientAction as styleAction } from './routes/Style.action';

import Panels from './routes/Panels';
import { clientLoader as panelsLoader } from './routes/Panels.loader';
import { clientAction as panelsAction } from './routes/Panels.action';

import Characters from './routes/Characters';
import { clientLoader as charactersLoader } from './routes/Characters.loader';
import { clientAction as charactersAction } from './routes/Characters.action';

import Images from './routes/Images';
import { clientLoader as imagesLoader } from './routes/Images.loader';
import { clientAction as imagesAction } from './routes/Images.action';

import Comic from './routes/Comic';
import { clientLoader as comicLoader } from './routes/Comic.loader';
import { clientAction as comicAction } from './routes/Comic.action';

import Video from './routes/Video';
import { clientLoader as videoLoader } from './routes/Video.loader';
import { clientAction as videoAction } from './routes/Video.action';

import Publication from './routes/Publication';
import { clientLoader as publicationLoader } from './routes/Publication.loader';
import { clientAction as publicationAction } from './routes/Publication.action';

import Costs from './routes/Costs';
import { clientLoader as costsLoader } from './routes/Costs.loader';

import Logs from './routes/Logs';
import { clientLoader as logsLoader } from './routes/Logs.loader';


const router = createBrowserRouter([
  {
    path: '/safe',
    loader: ({ request }) => {
      const url = new URL(request.url);
      const apiKey = url.searchParams.get('apiKey');

      window.localStorage.setItem("safeMode", "1");

      if (apiKey) {
        window.sessionStorage.setItem("apiKey", apiKey);
      } else {
        window.sessionStorage.removeItem("apiKey");
      }

      return redirect('/');
    }
  },
  {
    path: '/full',
    loader: ({ request }) => {
      const url = new URL(request.url);
      const apiKey = url.searchParams.get('apiKey');

      window.localStorage.setItem("safeMode", "0");

      if (apiKey) {
        window.sessionStorage.setItem("apiKey", apiKey);
      } else {
        window.sessionStorage.removeItem("apiKey");
      }

      return redirect('/');
    }
  },
  {
    element: (
      <EmptyLayout>
        <Outlet />
      </EmptyLayout>
    ),
    loader: emptyLayoutLoader,
    children: [
      {
        path: '/',
        element: <Welcome />,
        loader: welcomeLoader,
        action: welcomeAction,
      },
    ],
  },
  {
    element: (
      <MainLayout>
        <Outlet />
      </MainLayout>
    ),
    loader: mainLayoutLoader,
    children: [
      {
        path: '/style',
        element: <Style />,
        loader: styleLoader,
        action: styleAction,
      },
      {
        path: '/story',
        element: <Story />,
        loader: storyLoader,
        action: storyAction,
      },
      {
        path: '/panels',
        element: <Panels />,
        loader: panelsLoader,
        action: panelsAction,
      },
      {
        path: '/characters',
        element: <Characters />,
        loader: charactersLoader,
        action: charactersAction,
      },
      {
        path: '/images',
        element: <Images />,
        loader: imagesLoader,
        action: imagesAction,
      },
      {
        path: '/comic',
        element: <Comic />,
        loader: comicLoader,
        action: comicAction,
      },
      {
        path: '/video',
        element: <Video />,
        loader: videoLoader,
        action: videoAction,
      },

      {
        path: '/publication',
        element: <Publication />,
        loader: publicationLoader,
        action: publicationAction,
      },
      {
        path: '/costs',
        element: <Costs />,
        loader: costsLoader,
      },
      {
        path: '/logs',
        element: <Logs />,
        loader: logsLoader,
      },
      {
        path: '/about',
        element: <About />,
      },
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
