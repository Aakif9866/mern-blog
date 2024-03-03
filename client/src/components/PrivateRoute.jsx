import { useSelector } from "react-redux";
import { Outlet, Navigate } from "react-router-dom";
// only for signed in users

// outlet is used to reach the children inside the element -> similar to a gateway

export default function PrivateRoute() {
  const { currentUser } = useSelector((state) => state.user);
  return currentUser ? <Outlet /> : <Navigate to="/sign-in" />;
}
