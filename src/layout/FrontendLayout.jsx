import { Outlet } from "react-router-dom";
import Header from "../component/Header"
import BackToTop from "../component/BackToTop"

function FrontendLayout() {
    return (
        <>
            <Header />
            <main>
                <Outlet />
            </main>
            <BackToTop />
        </>
    )
}

export default FrontendLayout;
