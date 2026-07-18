import { createHashRouter } from "react-router-dom";
import Home from "../views/frontend/Home";
import ResortDetail from "../views/frontend/ResortDetail";
import FrontendLayout from "../layout/FrontendLayout";
import Planner from "../views/frontend/Planner";

export const router = createHashRouter([
    {
        path: '/',
        element: <FrontendLayout />,
        children: [
            {
                index: true,
                element: <Home />,
            },
            {
                path: 'resorts/:townId/:resortIndex',
                element: <ResortDetail />,
            },
            {
                path: 'planner',
                element: <Planner />,
            },

        ]
    }
])
