import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sidebar } from "flowbite-react";
import {
  HiUser,
  HiArrowSmRight,
  HiDocumentText,
  HiOutlineUserGroup,
  HiAnnotation,
  HiChartPie,
} from "react-icons/hi";
import { useDispatch, useSelector } from "react-redux";

import { signoutSuccess } from "../redux/user/userSlice";

export default function DashSidebar() {
  const location = useLocation();
  const dispatch = useDispatch();

  const handleSignout = async () => {
    try {
      const res = await fetch("/api/user/signout", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        console.log(data.message);
      } else {
        dispatch(signoutSuccess());
      }
    } catch (error) {
      console.log(error.message);
    }
  };
  const [Tab, setTab] = useState(""); // to get tab location

  useEffect(() => {
    const urlparams = new URLSearchParams(location.search); // put the url here
    const tabfromUrl = urlparams.get("tab"); // tell the exact value of tab ==> to goto that page
    if (tabfromUrl) {
      setTab(tabfromUrl);
    }
  }, [location.search]); // whenever this changes useEffect start the work
  return (
    <Sidebar className="w-full">
      <Sidebar.Items>
        <Sidebar.ItemGroup>
          <Link to="/dashboard?tab=profile">
            <Sidebar.Item
              active={Tab === "profile"}
              icon={HiUser}
              label={"User"}
              labelcolor="dark"
              as="div"
            >
              Profile
            </Sidebar.Item>
          </Link>
          <Sidebar.Item
            classname="cursor-pointer"
            icon={HiArrowSmRight}
            onClick={handleSignout}
          >
            Sign Out{" "}
          </Sidebar.Item>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
