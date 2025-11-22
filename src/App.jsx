import React from "react";
import "./styles/App.scss";

import { useLocation, useRoutes } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import Home from "./pages/Home";

function App() {
	const location = useLocation();
	const routes = [{ path: "*", element: <Home /> }];
	return (
		<>
			<AnimatePresence mode='wait'>
				<React.Fragment key={location.pathname}>{useRoutes(routes)}</React.Fragment>
			</AnimatePresence>
		</>
	);
}

export default App;
