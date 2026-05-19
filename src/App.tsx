import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Welcome from './routes/Welcome';
import About from './routes/About';
import { clientLoader as welcomeLoader } from './routes/Welcome.loader';
import { clientAction as welcomeAction } from './routes/Welcome.action';

const router = createBrowserRouter([
  {
    element: (
      <MainLayout>
        <Outlet />
      </MainLayout>
    ),
    children: [
      {
        path: '/',
        element: <Welcome />,
        loader: welcomeLoader,
        action: welcomeAction,
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

