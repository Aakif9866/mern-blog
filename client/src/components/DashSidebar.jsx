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
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";

export default function DashSidebar() {
  const location = useLocation();

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
          <Sidebar.Item classname="cursor-pointer" icon={HiArrowSmRight}>
            Sign Out{" "}
          </Sidebar.Item>
        </Sidebar.ItemGroup>
      </Sidebar.Items>
    </Sidebar>
  );
}
