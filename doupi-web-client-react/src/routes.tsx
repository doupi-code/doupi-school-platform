import { createBrowserRouter } from "react-router-dom";
import { SiteLayout } from "./site";
import { Home, SectionPage, DetailPage, ThirdLevel, NotFound } from "./pages";
import { RouteErrorBoundary } from "@/components/common/ErrorBoundary";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: SiteLayout,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      { index: true, Component: Home },
      { path: ":section", Component: SectionPage },
      { path: ":section/:page/:id", Component: ThirdLevel },
      { path: ":section/:page", Component: DetailPage },
      { path: "*", Component: NotFound },
    ],
  },
]);
