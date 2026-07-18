import { Outlet } from "react-router-dom";
import Header from "../component/Header"

function FrontendLayout() {
    return (
        <>
            <Header />
            <main>
                <Outlet />
            </main>
        </>
    )
}

export default FrontendLayout;
