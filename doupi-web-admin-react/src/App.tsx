import { BrowserRouter } from 'react-router-dom';
import RouterGuard from './router/guard';

function App() {
  return (
    <BrowserRouter
      basename={import.meta.env.BASE_URL}
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <RouterGuard />
    </BrowserRouter>
  );
}

export default App;
