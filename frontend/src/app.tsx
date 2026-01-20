import { Route, Routes } from 'react-router-dom';
import MainPage from './pages/main-page/main-page';
import { AppRoute } from './const';


function App(): JSX.Element {
  return (
    <Routes>
      <Route path={AppRoute.Main} element={<MainPage />} />
    </Routes>
  );
}

export default App;
